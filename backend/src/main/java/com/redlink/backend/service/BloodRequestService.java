package com.redlink.backend.service;

import com.redlink.backend.config.MatchingProperties;
import com.redlink.backend.dto.request.BloodRequestDetail;
import com.redlink.backend.dto.request.CreateBloodRequestRequest;
import com.redlink.backend.dto.request.PostedRequestResponse;
import com.redlink.backend.exception.BadRequestException;
import com.redlink.backend.exception.ForbiddenException;
import com.redlink.backend.model.BloodRequest;
import com.redlink.backend.model.Donor;
import com.redlink.backend.model.Hospital;
import com.redlink.backend.model.Notification;
import com.redlink.backend.model.User;
import com.redlink.backend.model.enums.HospitalStatus;
import com.redlink.backend.model.enums.RequestStatus;
import com.redlink.backend.repository.BloodRequestRepository;
import com.redlink.backend.repository.NotificationRepository;
import com.redlink.backend.security.CurrentUser;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Instant;
import java.util.List;

/**
 * Hospital staff's blood requests. Posting (H3, H4, H6) is one transaction:
 *
 *   hospital APPROVED? ── no ──► 403
 *        │ yes
 *        ▼
 *   save request (OPEN) → rank matches → notify the top N → 201 with counts
 *
 * Only donors are notified now; hospital-side notifications come with donor responses.
 */
@Service
@Transactional(readOnly = true)
public class BloodRequestService {

    private final BloodRequestRepository bloodRequestRepository;
    private final NotificationRepository notificationRepository;
    private final MatchingService matchingService;
    private final MatchingProperties matchingProperties;
    private final CurrentUser currentUser;
    private final Clock clock;

    public BloodRequestService(BloodRequestRepository bloodRequestRepository,
                               NotificationRepository notificationRepository, MatchingService matchingService,
                               MatchingProperties matchingProperties, CurrentUser currentUser, Clock clock) {
        this.bloodRequestRepository = bloodRequestRepository;
        this.notificationRepository = notificationRepository;
        this.matchingService = matchingService;
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
        String message = notificationMessage(request);
        notificationRepository.saveAll(matches.subList(0, notifiedCount).stream()
                .map(donor -> notification(donor.getUser(), request, message))
                .toList());

        return new PostedRequestResponse(BloodRequestDetail.from(request), matches.size(), notifiedCount);
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

    // e.g. "Urgent: National Hospital Colombo needs 2 units of O+ in Colombo. Request #RQ-1043."
    static String notificationMessage(BloodRequest request) {
        String prefix = switch (request.getUrgency()) {
            case CRITICAL -> "Critical: ";
            case HIGH -> "Urgent: ";
            case LOW, MEDIUM -> "";
        };
        int units = request.getUnitsNeeded();
        return "%s%s needs %d %s of %s in %s. Request #%s.".formatted(
                prefix,
                request.getHospital().getName(),
                units,
                units == 1 ? "unit" : "units",
                request.getBloodGroup().getLabel(),
                request.getCity(),
                BloodRequestDetail.reference(request.getId()));
    }

    private static Notification notification(User user, BloodRequest request, String message) {
        Notification notification = new Notification();
        notification.setUser(user);
        notification.setRequest(request);
        notification.setMessage(message);
        return notification;
    }
}
