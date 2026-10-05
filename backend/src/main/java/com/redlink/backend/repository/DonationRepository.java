package com.redlink.backend.repository;

import com.redlink.backend.model.Donation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.Collection;
import java.util.List;

public interface DonationRepository extends JpaRepository<Donation, Long> {

    // The donations recorded when a request was fulfilled
    List<Donation> findByRequestId(Long requestId);

    // Donations per request, for every request of a hospital
    @Query("""
            select new com.redlink.backend.repository.RequestTotal(d.request.id, count(d))
            from Donation d
            where d.hospital.id = :hospitalId and d.request is not null
            group by d.request.id""")
    List<RequestTotal> countByRequestForHospital(Long hospitalId);

    // The same, for any set of requests (the admin's list across hospitals)
    @Query("""
            select new com.redlink.backend.repository.RequestTotal(d.request.id, count(d))
            from Donation d
            where d.request.id in :requestIds
            group by d.request.id""")
    List<RequestTotal> countByRequests(Collection<Long> requestIds);

    // A donor's history, newest first, with each hospital and request in the same query (idx_donations_donor)
    @Query("""
            select d from Donation d join fetch d.hospital left join fetch d.request
            where d.donor.id = :donorId
            order by d.donationDate desc, d.id desc""")
    List<Donation> findHistory(Long donorId);
}
