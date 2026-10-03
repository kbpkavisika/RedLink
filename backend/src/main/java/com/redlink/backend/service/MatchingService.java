package com.redlink.backend.service;

import com.redlink.backend.dto.request.MatchedDonor;
import com.redlink.backend.model.BloodRequest;
import com.redlink.backend.repository.DonorRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDate;
import java.util.List;

/**
 * The matching engine (H5): every donor who can give to a request, best match first.
 *
 *   filter (database): compatible group · available · enabled account · 90-day rule · not yet responded
 *   rank   (MatchRanking): exact group → same city → longest since last donation
 *
 * "Today" comes from the shared Clock, so the 90-day rule can be tested on fixed dates.
 */
@Service
@Transactional(readOnly = true)
public class MatchingService {

    private final DonorRepository donorRepository;
    private final Clock clock;

    public MatchingService(DonorRepository donorRepository, Clock clock) {
        this.donorRepository = donorRepository;
        this.clock = clock;
    }

    public List<MatchedDonor> findMatches(BloodRequest request) {
        LocalDate today = LocalDate.now(clock);
        return MatchRanking.rank(
                donorRepository.findMatchCandidates(
                        request.getBloodGroup().compatibleDonors(),
                        DonorEligibility.latestEligibleDonationDate(today),
                        request.getId()),
                request.getBloodGroup(),
                request.getCity(),
                today);
    }
}
