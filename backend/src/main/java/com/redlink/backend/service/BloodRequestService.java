package com.redlink.backend.service;

import com.redlink.backend.config.MatchingProperties;
import com.redlink.backend.dto.request.BloodRequestDetail;
import com.redlink.backend.dto.request.CreateBloodRequestRequest;
import com.redlink.backend.dto.request.HospitalRequestList;
import com.redlink.backend.dto.request.MatchedDonor;
import com.redlink.backend.dto.request.PostedRequestResponse;
import com.redlink.backend.dto.request.RequestListItem;
import com.redlink.backend.dto.request.RequestOverview;
import com.redlink.backend.dto.request.RequestResponse;
import com.redlink.backend.dto.request.UpdateRequestStatusRequest;
import com.redlink.backend.exception.BadRequestException;
import com.redlink.backend.exception.ConflictException;
import com.redlink.backend.exception.ForbiddenException;
import com.redlink.backend.exception.NotFoundException;
import com.redlink.backend.model.BloodRequest;
import com.redlink.backend.model.Donation;
import com.redlink.backend.model.Donor;
import com.redlink.backend.model.DonorResponse;
import com.redlink.backend.model.Hospital;
import com.redlink.backend.model.User;
import com.redlink.backend.model.enums.BloodGroup;
import com.redlink.backend.model.enums.HospitalStatus;
import com.redlink.backend.model.enums.RequestStatus;
import com.redlink.backend.model.enums.ResponseStatus;
import com.redlink.backend.model.enums.Role;
import com.redlink.backend.model.enums.Urgency;
import com.redlink.backend.repository.BloodRequestRepository;
import com.redlink.backend.repository.DonationRepository;
import com.redlink.backend.repository.DonorResponseRepository;
import com.redlink.backend.repository.NotificationRepository;
import com.redlink.backend.security.CurrentUser;
import com.redlink.backend.util.Cities;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Hospital staff's blood requests. Posting (H3, H4, H6) is one transaction:
 *
 *   hospital APPROVED? ── no ──► 403
 *        │ yes
 *        ▼
 *   save request (OPEN) → rank matches → notify the top N → 201 with counts
 *
 * Staff also see their request's ranked matches (H5, H12) and donors' replies (H7).
 * Notifications (posted, closed) are written by NotificationService in the same transaction.
 */
@Service
@Transactional(readOnly = true)
public class BloodRequestService {

    private final BloodRequestRepository bloodRequestRepository;
    private final NotificationRepository notificationRepository;
    private final DonorResponseRepository donorResponseRepository;
    private final DonationRepository donationRepository;
    private final MatchingService matchingService;
    private final NotificationService notificationService;
    private final MatchingProperties matchingProperties;
    private final CurrentUser currentUser;
    private final Clock clock;

    public BloodRequestService(BloodRequestRepository bloodRequestRepository,
                               NotificationRepository notificationRepository, DonorResponseRepository donorResponseRepository,
                               DonationRepository donationRepository, MatchingService matchingService,
                               NotificationService notificationService,
                               MatchingProperties matchingProperties, CurrentUser currentUser, Clock clock) {
        this.bloodRequestRepository = bloodRequestRepository;
        this.notificationRepository = notificationRepository;
        this.donorResponseRepository = donorResponseRepository;
        this.donationRepository = donationRepository;
        this.matchingService = matchingService;
        this.notificationService = notificationService;
        this.matchingProperties = matchingProperties;
        this.currentUser = currentUser;
        this.clock = clock;
    }

    @Transactional
    public PostedRequestResponse create(CreateBloodRequestRequest body) {
        User staff = currentUser.require();
        Hospital hospital = approvedHospitalOf(staff);

        if (!body.neededBy().isAfter(Instant.now(clock))) {
            throw new BadRequestException("The needed-by time must be in the future.", "neededBy", "must be in the future");
        }

        BloodRequest request = new BloodRequest();
        request.setHospital(hospital);
        request.setCreatedBy(staff);
        request.setBloodGroup(body.bloodGroup());
        request.setUnitsNeeded(body.unitsNeeded());
        request.setUrgency(body.urgency());
        request.setCity(body.city());
        request.setStatus(RequestStatus.OPEN);
        request.setNeededBy(body.neededBy());
        bloodRequestRepository.saveAndFlush(request); // id and createdAt are needed below

        List<Donor> matches = matchingService.findMatchingDonors(request);
        int notifiedCount = matchingProperties.notifiedCount(request.getUnitsNeeded(), request.getUrgency(), matches.size());
        notificationService.requestPosted(request, matches.subList(0, notifiedCount).stream().map(Donor::getUser).toList());

        return new PostedRequestResponse(BloodRequestDetail.from(request), matches.size(), notifiedCount);
    }

    /**
     * H11: every request the staff member's hospital has posted, newest first, each with its reply and donation
     * counts, plus the dashboard numbers. Three queries in all, however many requests there are.
     */
    public HospitalRequestList list() {
        Hospital hospital = currentUser.require().getHospital();
        if (hospital == null) {
            throw new ForbiddenException("Only hospital staff have requests.");
        }
        List<RequestListItem> items = RequestLists.build(
                bloodRequestRepository.findByHospitalNewestFirst(hospital.getId()),
                donorResponseRepository.countByStatusForHospital(hospital.getId()),
                donationRepository.countByRequestForHospital(hospital.getId()));

        Instant monthAgo = Instant.now(clock).minus(Duration.ofDays(30));
        List<RequestListItem> open = items.stream().filter(item -> item.status() == RequestStatus.OPEN).toList();
        return new HospitalRequestList(
                open.size(),
                open.stream().filter(item -> item.urgency() == Urgency.CRITICAL).count(),
                items.stream()
                        .filter(item -> item.status() == RequestStatus.FULFILLED && item.closedAt().isAfter(monthAgo))
                        .count(),
                open.stream().mapToLong(RequestListItem::coming).sum(),
                items);
    }

    public RequestOverview findById(Long id) {
        BloodRequest request = ownRequest(id);
        return overview(request);
    }

    /**
     * The ranked match list (H5), optionally narrowed (H12). Filters don't change the order.
     *   bloodGroup: only donors of that group (a group that can't give to the request matches nobody)
     *   city: only donors in that city, compared ignoring case and spaces
     * A closed request has no matches: nobody should be contacted for it any more.
     */
    public List<MatchedDonor> findMatches(Long id, BloodGroup bloodGroup, String city) {
        BloodRequest request = ownRequest(id);
        if (request.getStatus() != RequestStatus.OPEN) {
            return List.of();
        }
        boolean filterCity = city != null && !city.isBlank();
        return matchingService.findMatches(request).stream()
                .filter(match -> bloodGroup == null || match.bloodGroup() == bloodGroup)
                .filter(match -> !filterCity || Cities.same(match.city(), city))
                .toList();
    }

    /**
     * H8, H9: close an OPEN request. Final either way (README "Request lifecycle").
     *   FULFILLED: one donation (1 unit, today) per donor who gave blood, and their last_donation_date
     *              becomes today, which restarts their 90-day clock. Only donors who ACCEPTED can be picked.
     *   CANCELLED: no donations.
     * The request row is locked first, so a donor's reply can't land in the middle of closing it.
     */
    @Transactional
    public RequestOverview close(Long id, UpdateRequestStatusRequest body) {
        User staff = currentUser.require();
        BloodRequest request = bloodRequestRepository.findByIdForUpdate(id)
                .filter(found -> staff.getHospital() != null
                        && found.getHospital().getId().equals(staff.getHospital().getId()))
                .orElseThrow(() -> new NotFoundException("Request " + BloodRequestDetail.reference(id) + " was not found."));

        if (body.status() != RequestStatus.FULFILLED && body.status() != RequestStatus.CANCELLED) {
            throw new BadRequestException("A request can be marked FULFILLED or CANCELLED.",
                    "status", "must be FULFILLED or CANCELLED");
        }
        if (request.getStatus() != RequestStatus.OPEN) {
            throw new ConflictException("This request is already closed.");
        }

        Map<Long, Donor> accepted = donorResponseRepository.findByRequestIdWithDonor(request.getId()).stream()
                .filter(response -> response.getStatus() == ResponseStatus.ACCEPTED)
                .collect(Collectors.toMap(response -> response.getDonor().getId(), DonorResponse::getDonor));
        LocalDate today = LocalDate.now(clock);

        Set<Long> donated = Set.of();
        if (body.status() == RequestStatus.FULFILLED) {
            donated = recordDonations(request, body.donorIds(), accepted, today);
        } else if (!body.donorIds().isEmpty()) {
            throw new BadRequestException("A cancelled request has no donations.", "donorIds", "must be empty when cancelling");
        }

        request.setStatus(body.status());
        request.setClosedAt(Instant.now(clock));
        notificationService.requestClosed(request, accepted.values(), donated, DonorEligibility.nextEligibleDate(today));
        return overview(request);
    }

    // Returns the ids of the donors recorded as having given blood
    private Set<Long> recordDonations(BloodRequest request, List<Long> donorIds, Map<Long, Donor> accepted, LocalDate today) {
        Set<Long> picked = new LinkedHashSet<>(donorIds);
        if (picked.isEmpty()) {
            throw new BadRequestException("Choose at least one donor who gave blood, or cancel the request instead.",
                    "donorIds", "must include at least one donor");
        }
        if (!accepted.keySet().containsAll(picked)) {
            throw new BadRequestException("Only donors who accepted this request can be marked as having donated.",
                    "donorIds", "must all have accepted this request");
        }

        donationRepository.saveAll(picked.stream().map(donorId -> {
            Donor donor = accepted.get(donorId);
            donor.setLastDonationDate(today); // restarts their 90-day clock; saved when the transaction commits
            Donation donation = new Donation();
            donation.setDonor(donor);
            donation.setHospital(request.getHospital());
            donation.setRequest(request);
            donation.setDonationDate(today);
            donation.setUnits(1);
            return donation;
        }).toList());
        return picked;
    }

    /**
     * H7: every donor's reply to this request. Accepted first (who is coming), then withdrawn (who was coming),
     * then declined; within each, the earliest reply first.
     */
    public List<RequestResponse> findResponses(Long id) {
        ownRequest(id);
        return donorResponseRepository.findByRequestIdWithDonor(id).stream()
                .map(RequestResponse::from)
                .sorted(Comparator.comparingInt((RequestResponse response) -> RESPONSE_ORDER.indexOf(response.status()))
                        .thenComparing(RequestResponse::respondedAt)
                        .thenComparing(RequestResponse::donorId))
                .toList();
    }

    private static final List<ResponseStatus> RESPONSE_ORDER =
            List.of(ResponseStatus.ACCEPTED, ResponseStatus.WITHDRAWN, ResponseStatus.DECLINED);

    // Staff only see their own hospital's requests; anyone else's is "not found", so ids reveal nothing
    private BloodRequest ownRequest(Long id) {
        User staff = currentUser.require();
        return bloodRequestRepository.findByIdWithHospital(id)
                .filter(request -> staff.getHospital() != null
                        && request.getHospital().getId().equals(staff.getHospital().getId()))
                .orElseThrow(() -> new NotFoundException("Request " + BloodRequestDetail.reference(id) + " was not found."));
    }

    private RequestOverview overview(BloodRequest request) {
        Long id = request.getId();
        return new RequestOverview(BloodRequestDetail.from(request),
                notificationRepository.countByRequestIdAndUserRole(id, Role.DONOR),
                donationRepository.findByRequestId(id).stream().map(donation -> donation.getDonor().getId()).toList());
    }

    // Hospital approval is not a role (README "Authentication"): staff are signed in, but can't post until APPROVED
    private Hospital approvedHospitalOf(User staff) {
        Hospital hospital = staff.getHospital();
        if (hospital == null) {
            throw new ForbiddenException("Only hospital staff can post blood requests.");
        }
        if (hospital.getStatus() == HospitalStatus.PENDING) {
            throw new ForbiddenException("Posting unlocks after an admin approves your hospital.");
        }
        if (hospital.getStatus() == HospitalStatus.REJECTED) {
            throw new ForbiddenException("Your hospital's registration wasn't approved, so it can't post requests.");
        }
        return hospital;
    }
}
