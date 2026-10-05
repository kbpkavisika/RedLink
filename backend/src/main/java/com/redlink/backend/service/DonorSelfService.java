package com.redlink.backend.service;

import com.redlink.backend.dto.donor.DonorProfile;
import com.redlink.backend.dto.donor.IncomingRequest;
import com.redlink.backend.dto.donor.UpdateAvailabilityRequest;
import com.redlink.backend.dto.donor.UpdateDonorProfileRequest;
import com.redlink.backend.exception.NotFoundException;
import com.redlink.backend.model.BloodRequest;
import com.redlink.backend.model.Donor;
import com.redlink.backend.model.DonorResponse;
import com.redlink.backend.model.enums.RequestStatus;
import com.redlink.backend.repository.BloodRequestRepository;
import com.redlink.backend.repository.DonorRepository;
import com.redlink.backend.repository.DonorResponseRepository;
import com.redlink.backend.security.CurrentUser;
import com.redlink.backend.util.Cities;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * The signed-in donor's own data (D2, D3, D4) and incoming requests (D5). Always the current user's donor profile: there is no id
 * to pass, so a donor can never read or change anyone else's.
 */
@Service
@Transactional(readOnly = true)
public class DonorSelfService {

    private final DonorRepository donorRepository;
    private final BloodRequestRepository bloodRequestRepository;
    private final DonorResponseRepository donorResponseRepository;
    private final CurrentUser currentUser;
    private final Clock clock;

    public DonorSelfService(DonorRepository donorRepository, BloodRequestRepository bloodRequestRepository,
                            DonorResponseRepository donorResponseRepository, CurrentUser currentUser, Clock clock) {
        this.donorRepository = donorRepository;
        this.bloodRequestRepository = bloodRequestRepository;
        this.donorResponseRepository = donorResponseRepository;
        this.currentUser = currentUser;
        this.clock = clock;
    }

    public DonorProfile me() {
        return DonorProfile.from(currentDonor(), LocalDate.now(clock));
    }

    @Transactional
    public DonorProfile update(UpdateDonorProfileRequest request) {
        Donor donor = currentDonor();
        donor.getUser().setFullName(request.fullName());
        donor.getUser().setPhone(request.phone());
        donor.setCity(request.city());
        return DonorProfile.from(donor, LocalDate.now(clock)); // saved when the transaction commits
    }

    @Transactional
    public DonorProfile setAvailability(UpdateAvailabilityRequest request) {
        Donor donor = currentDonor();
        donor.setAvailable(request.available());
        return DonorProfile.from(donor, LocalDate.now(clock));
    }

    /**
     * D5: every open request this donor's blood group can give to, in any city, whether or not they were
     * notified about it. Most urgent first, then their own city, then the soonest deadline.
     * Each carries the donor's own reply, if any, so the page can show "You accepted".
     */
    public List<IncomingRequest> incomingRequests() {
        Donor donor = currentDonor();
        List<BloodRequest> requests = bloodRequestRepository.findOpenForGroups(
                RequestStatus.OPEN, Instant.now(clock), donor.getBloodGroup().compatibleRecipients());
        if (requests.isEmpty()) {
            return List.of();
        }

        Map<Long, DonorResponse> myResponses = donorResponseRepository
                .findByDonorIdAndRequestIdIn(donor.getId(), requests.stream().map(BloodRequest::getId).toList())
                .stream()
                .collect(Collectors.toMap(response -> response.getRequest().getId(), Function.identity()));

        return requests.stream()
                .map(request -> IncomingRequest.from(request,
                        request.getBloodGroup() == donor.getBloodGroup(),
                        Cities.same(request.getCity(), donor.getCity()),
                        myResponses.get(request.getId())))
                .sorted(INCOMING_ORDER)
                .toList();
    }

    static final Comparator<IncomingRequest> INCOMING_ORDER = Comparator
            .comparing((IncomingRequest request) -> request.urgency().ordinal()).reversed() // CRITICAL first
            .thenComparing(Comparator.comparing(IncomingRequest::sameCity).reversed())
            .thenComparing(IncomingRequest::neededBy)
            .thenComparing(IncomingRequest::requestId);

    // The signed-in user's donor profile; every DONOR has one (created at registration)
    Donor currentDonor() {
        Long userId = currentUser.require().getId();
        return donorRepository.findByUserIdWithUser(userId)
                .orElseThrow(() -> new NotFoundException("Your donor profile was not found. Contact admin@redlink.lk for help."));
    }
}
