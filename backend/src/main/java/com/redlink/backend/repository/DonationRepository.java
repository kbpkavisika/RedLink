package com.redlink.backend.repository;

import com.redlink.backend.model.Donation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface DonationRepository extends JpaRepository<Donation, Long> {

    // The donations recorded when a request was fulfilled
    List<Donation> findByRequestId(Long requestId);

    // A donor's history, newest first, with each hospital and request in the same query (idx_donations_donor)
    @Query("""
            select d from Donation d join fetch d.hospital left join fetch d.request
            where d.donor.id = :donorId
            order by d.donationDate desc, d.id desc""")
    List<Donation> findHistory(Long donorId);
}
