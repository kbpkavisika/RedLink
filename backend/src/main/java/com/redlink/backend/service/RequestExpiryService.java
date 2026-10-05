package com.redlink.backend.service;

import com.redlink.backend.model.BloodRequest;
import com.redlink.backend.model.Donor;
import com.redlink.backend.model.DonorResponse;
import com.redlink.backend.model.enums.RequestStatus;
import com.redlink.backend.model.enums.ResponseStatus;
import com.redlink.backend.repository.BloodRequestRepository;
import com.redlink.backend.repository.DonorResponseRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Set;

/**
 * H10: OPEN requests whose needed-by time has passed become EXPIRED, which is final like CANCELLED.
 * Donors who had accepted are told it's no longer needed. Run by RequestExpiryScheduler; "now" comes from
 * the shared Clock, so tests can fix it.
 */
@Service
public class RequestExpiryService {

    private static final Logger log = LoggerFactory.getLogger(RequestExpiryService.class);

    private final BloodRequestRepository bloodRequestRepository;
    private final DonorResponseRepository donorResponseRepository;
    private final NotificationService notificationService;
    private final Clock clock;

    public RequestExpiryService(BloodRequestRepository bloodRequestRepository,
                                DonorResponseRepository donorResponseRepository,
                                NotificationService notificationService, Clock clock) {
        this.bloodRequestRepository = bloodRequestRepository;
        this.donorResponseRepository = donorResponseRepository;
        this.notificationService = notificationService;
        this.clock = clock;
    }

    // Returns how many requests expired
    @Transactional
    public int expireOverdue() {
        Instant now = Instant.now(clock);
        List<BloodRequest> overdue = bloodRequestRepository.findOverdueForUpdate(RequestStatus.OPEN, now);
        for (BloodRequest request : overdue) {
            request.setStatus(RequestStatus.EXPIRED);
            request.setClosedAt(now);
            List<Donor> accepted = donorResponseRepository.findByRequestIdWithDonor(request.getId()).stream()
                    .filter(response -> response.getStatus() == ResponseStatus.ACCEPTED)
                    .map(DonorResponse::getDonor)
                    .toList();
            notificationService.requestClosed(request, accepted, Set.of(), null);
        }
        if (!overdue.isEmpty()) {
            log.info("Expired {} request(s) past their needed-by time", overdue.size());
        }
        return overdue.size();
    }
}
