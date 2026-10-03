package com.redlink.backend.repository;

import com.redlink.backend.model.Donor;
import com.redlink.backend.model.enums.BloodGroup;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface DonorRepository extends JpaRepository<Donor, Long> {

    // Loads each donor's user in the same query instead of one extra query per donor
    @Query("select d from Donor d join fetch d.user order by d.id")
    List<Donor> findAllWithUser();

    @Query("select d from Donor d join fetch d.user where d.id = :id")
    Optional<Donor> findByIdWithUser(Long id);

    /**
     * Everyone who may be matched to a request, before ranking (README "Matching engine"):
     * a compatible blood group, available, an enabled account, eligible under the 90-day rule
     * (never donated, or last donated on or before the cutoff), and no response to this request yet.
     * blood_group + available is covered by idx_donors_matching.
     */
    @Query("""
            select d from Donor d join fetch d.user u
            where d.bloodGroup in :groups
              and d.available = true
              and u.enabled = true
              and (d.lastDonationDate is null or d.lastDonationDate <= :latestEligibleDonation)
              and not exists (select 1 from DonorResponse r where r.donor = d and r.request.id = :requestId)""")
    List<Donor> findMatchCandidates(Collection<BloodGroup> groups, LocalDate latestEligibleDonation, Long requestId);
}
