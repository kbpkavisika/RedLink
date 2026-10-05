package com.redlink.backend.service;

import com.redlink.backend.dto.donor.IncomingRequest;
import com.redlink.backend.dto.request.BloodRequestDetail;
import com.redlink.backend.dto.request.ResponseStatusRequest;
import com.redlink.backend.exception.BadRequestException;
import com.redlink.backend.exception.ConflictException;
import com.redlink.backend.exception.ForbiddenException;
import com.redlink.backend.exception.NotFoundException;
import com.redlink.backend.model.BloodRequest;
import com.redlink.backend.model.Donor;
import com.redlink.backend.model.DonorResponse;
import com.redlink.backend.model.enums.RequestStatus;
import com.redlink.backend.model.enums.ResponseStatus;
import com.redlink.backend.repository.BloodRequestRepository;
import com.redlink.backend.repository.DonorResponseRepository;
import com.redlink.backend.util.Cities;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

/**
 * A donor's reply to a request (README "Donor response lifecycle"):
 *
 *              ┌──► ACCEPTED ──► WITHDRAWN   (only while the request is OPEN)
 *   no reply ──┤
 *              └──► DECLINED
 *
 * One reply per donor per request (UNIQUE request_id + donor_id); withdrawing updates that row.
 * DECLINED and WITHDRAWN are final. The hospital's staff are notified when a donor accepts or withdraws.
 */
@Service
@Transactional(readOnly = true)
public class DonorResponseService {

    private static final DateTimeFormatter DAY = DateTimeFormatter.ofPattern("d MMM yyyy", Locale.ENGLISH);

    private final DonorSelfService donorSelfService;
    private final BloodRequestRepository bloodRequestRepository;
    private final DonorResponseRepository donorResponseRepository;
    private final NotificationService notificationService;
    private final Clock clock;

    public DonorResponseService(DonorSelfService donorSelfService, BloodRequestRepository bloodRequestRepository,
                                DonorResponseRepository donorResponseRepository, NotificationService notificationService,
                                Clock clock) {
        this.donorSelfService = donorSelfService;
        this.bloodRequestRepository = bloodRequestRepository;
        this.donorResponseRepository = donorResponseRepository;
        this.notificationService = notificationService;
        this.clock = clock;
    }

    // D6, D7: accept or decline, once
    @Transactional
    public IncomingRequest respond(Long requestId, ResponseStatusRequest body) {
        if (body.status() == ResponseStatus.WITHDRAWN) {
            throw new BadRequestException("Reply with ACCEPTED or DECLINED. To take back an acceptance, withdraw it instead.",
                    "status", "must be ACCEPTED or DECLINED");
        }
        Donor donor = donorSelfService.currentDonor();
        BloodRequest request = findRequest(requestId);
        requireOpen(request);

        if (!donor.getBloodGroup().canDonateTo(request.getBloodGroup())) {
            throw new ForbiddenException("Your blood group (%s) can't be given to someone who needs %s."
                    .formatted(donor.getBloodGroup().getLabel(), request.getBloodGroup().getLabel()));
        }
        if (donorResponseRepository.findByRequestIdAndDonorId(requestId, donor.getId()).isPresent()) {
            throw new ConflictException("You've already responded to this request.");
        }
        LocalDate today = LocalDate.now(clock);
        if (body.status() == ResponseStatus.ACCEPTED && !DonorEligibility.isEligible(donor.getLastDonationDate(), today)) {
            throw new ConflictException("You can donate again from %s, %d days after your last donation."
                    .formatted(DonorEligibility.nextEligibleDate(donor.getLastDonationDate()).format(DAY),
                            DonorEligibility.DAYS_BETWEEN_DONATIONS));
        }

        DonorResponse response = new DonorResponse();
        response.setRequest(request);
        response.setDonor(donor);
        response.setStatus(body.status());
        try {
            donorResponseRepository.saveAndFlush(response); // sets respondedAt for the reply
        } catch (DataIntegrityViolationException sameMoment) {
            // Two replies at the same moment: UNIQUE (request_id, donor_id) kept only the first
            throw new ConflictException("You've already responded to this request.");
        }
        if (body.status() == ResponseStatus.ACCEPTED) {
            notificationService.donorAccepted(request, donor);
        }
        return toIncoming(request, donor, response);
    }

    // D9: "I can't make it anymore"
    @Transactional
    public IncomingRequest withdraw(Long requestId, ResponseStatusRequest body) {
        if (body.status() != ResponseStatus.WITHDRAWN) {
            throw new BadRequestException("Only WITHDRAWN can be sent here.", "status", "must be WITHDRAWN");
        }
        Donor donor = donorSelfService.currentDonor();
        BloodRequest request = findRequest(requestId);
        DonorResponse response = donorResponseRepository.findByRequestIdAndDonorId(requestId, donor.getId())
                .orElseThrow(() -> new NotFoundException("You haven't responded to this request."));
        requireOpen(request);
        if (response.getStatus() != ResponseStatus.ACCEPTED) {
            throw new ConflictException("Only accepted responses can be withdrawn.");
        }

        response.setStatus(ResponseStatus.WITHDRAWN);
        donorResponseRepository.saveAndFlush(response); // sets updatedAt
        notificationService.donorWithdrew(request, donor);
        return toIncoming(request, donor, response);
    }

    // Locked like closing a request does, so a reply and the hospital closing the request can't overlap
    private BloodRequest findRequest(Long id) {
        return bloodRequestRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new NotFoundException("Request " + BloodRequestDetail.reference(id) + " was not found."));
    }

    // Past its needed-by time counts as closed even before the expiry job marks it EXPIRED
    private void requireOpen(BloodRequest request) {
        if (request.getStatus() != RequestStatus.OPEN || !request.getNeededBy().isAfter(Instant.now(clock))) {
            throw new ConflictException("This request is already closed.");
        }
    }

    private static IncomingRequest toIncoming(BloodRequest request, Donor donor, DonorResponse response) {
        return IncomingRequest.from(request,
                request.getBloodGroup() == donor.getBloodGroup(),
                Cities.same(request.getCity(), donor.getCity()),
                response);
    }
}
