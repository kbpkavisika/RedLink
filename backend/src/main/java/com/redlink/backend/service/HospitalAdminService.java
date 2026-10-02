package com.redlink.backend.service;

import com.redlink.backend.dto.hospital.HospitalDetail;
import com.redlink.backend.dto.hospital.HospitalSummary;
import com.redlink.backend.dto.hospital.UpdateHospitalStatusRequest;
import com.redlink.backend.exception.BadRequestException;
import com.redlink.backend.exception.ConflictException;
import com.redlink.backend.exception.NotFoundException;
import com.redlink.backend.model.Hospital;
import com.redlink.backend.model.enums.HospitalStatus;
import com.redlink.backend.repository.HospitalRepository;
import com.redlink.backend.repository.UserRepository;
import com.redlink.backend.security.CurrentUser;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Instant;
import java.util.List;

/**
 * The admin's hospital review (A1–A4):
 *
 *   PENDING ──approve──► APPROVED   (staff can post requests)
 *      └─────reject───► REJECTED   (reason required, shown to the hospital's staff)
 *
 * A decision is final: an approved or rejected hospital can't be reviewed again (409).
 */
@Service
@Transactional(readOnly = true)
public class HospitalAdminService {

    private final HospitalRepository hospitalRepository;
    private final UserRepository userRepository;
    private final CurrentUser currentUser;
    private final Clock clock;

    public HospitalAdminService(HospitalRepository hospitalRepository, UserRepository userRepository,
                                CurrentUser currentUser, Clock clock) {
        this.hospitalRepository = hospitalRepository;
        this.userRepository = userRepository;
        this.currentUser = currentUser;
        this.clock = clock;
    }

    // status null = every hospital, newest first; a status = that queue, oldest first
    public List<HospitalSummary> findAll(HospitalStatus status) {
        List<Hospital> hospitals = status == null
                ? hospitalRepository.findAllByOrderByCreatedAtDesc()
                : hospitalRepository.findAllByStatusOrderByCreatedAtAsc(status);
        return hospitals.stream().map(HospitalSummary::from).toList();
    }

    public HospitalDetail findById(Long id) {
        Hospital hospital = find(id);
        return HospitalDetail.from(hospital, userRepository.findAllByHospitalIdOrderByCreatedAtAsc(id));
    }

    @Transactional
    public HospitalDetail updateStatus(Long id, UpdateHospitalStatusRequest request) {
        // Locked: a second admin deciding at the same moment waits, then sees it's no longer PENDING (409)
        Hospital hospital = hospitalRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new NotFoundException("Hospital " + id + " was not found."));

        if (request.status() == HospitalStatus.PENDING) {
            throw new BadRequestException("Choose APPROVED or REJECTED.", "status", "must be APPROVED or REJECTED");
        }
        if (hospital.getStatus() != HospitalStatus.PENDING) {
            throw new ConflictException("This hospital has already been "
                    + hospital.getStatus().name().toLowerCase() + ". A decision can't be changed.");
        }
        if (request.status() == HospitalStatus.REJECTED && request.reason() == null) {
            throw new BadRequestException("Rejecting a hospital requires a reason.",
                    "reason", "is required when rejecting");
        }

        hospital.setStatus(request.status());
        hospital.setRejectionReason(request.status() == HospitalStatus.REJECTED ? request.reason() : null);
        // Recorded for both decisions: which admin decided, and when
        hospital.setApprovedBy(currentUser.require());
        hospital.setApprovedAt(Instant.now(clock));
        hospitalRepository.flush(); // surface a CHECK-constraint problem here, not after the response

        return HospitalDetail.from(hospital, userRepository.findAllByHospitalIdOrderByCreatedAtAsc(id));
    }

    private Hospital find(Long id) {
        return hospitalRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Hospital " + id + " was not found."));
    }
}
