package com.redlink.backend.service;

import com.redlink.backend.dto.request.AdminRequestDetail;
import com.redlink.backend.dto.request.BloodRequestDetail;
import com.redlink.backend.dto.request.RequestListItem;
import com.redlink.backend.dto.request.RequestResponse;
import com.redlink.backend.exception.NotFoundException;
import com.redlink.backend.model.BloodRequest;
import com.redlink.backend.model.Hospital;
import com.redlink.backend.model.enums.Role;
import com.redlink.backend.repository.BloodRequestRepository;
import com.redlink.backend.repository.DonationRepository;
import com.redlink.backend.repository.DonorResponseRepository;
import com.redlink.backend.repository.NotificationRepository;
import org.springframework.data.domain.Limit;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * The admin's view of requests across every hospital (A7, A8). Read-only: admins look into problems,
 * hospitals run their own requests.
 */
@Service
@Transactional(readOnly = true)
public class AdminRequestService {

    // The newest this many; the page filters within them. Enough for monitoring; older ones stay in the database.
    static final int MAX_REQUESTS = 500;

    private final BloodRequestRepository bloodRequestRepository;
    private final DonorResponseRepository donorResponseRepository;
    private final DonationRepository donationRepository;
    private final NotificationRepository notificationRepository;

    public AdminRequestService(BloodRequestRepository bloodRequestRepository,
                               DonorResponseRepository donorResponseRepository, DonationRepository donationRepository,
                               NotificationRepository notificationRepository) {
        this.bloodRequestRepository = bloodRequestRepository;
        this.donorResponseRepository = donorResponseRepository;
        this.donationRepository = donationRepository;
        this.notificationRepository = notificationRepository;
    }

    // A7: newest first, each with reply and donation counts, in three queries
    public List<RequestListItem> list() {
        List<BloodRequest> requests = bloodRequestRepository.findAllNewestFirst(Limit.of(MAX_REQUESTS));
        if (requests.isEmpty()) {
            return List.of();
        }
        List<Long> ids = requests.stream().map(BloodRequest::getId).toList();
        return RequestLists.build(requests,
                donorResponseRepository.countByStatusForRequests(ids),
                donationRepository.countByRequests(ids));
    }

    // A8: one request with every reply and who donated
    public AdminRequestDetail findById(Long id) {
        BloodRequest request = bloodRequestRepository.findByIdWithHospital(id)
                .orElseThrow(() -> new NotFoundException("Request " + BloodRequestDetail.reference(id) + " was not found."));
        Hospital hospital = request.getHospital();
        return new AdminRequestDetail(
                BloodRequestDetail.from(request),
                hospital.getId(),
                hospital.getCity(),
                hospital.getPhone(),
                notificationRepository.countByRequestIdAndUserRole(id, Role.DONOR),
                donorResponseRepository.findByRequestIdWithDonor(id).stream()
                        .map(RequestResponse::from)
                        .sorted(RequestResponse.ORDER)
                        .toList(),
                donationRepository.findByRequestId(id).stream().map(donation -> donation.getDonor().getId()).toList());
    }
}
