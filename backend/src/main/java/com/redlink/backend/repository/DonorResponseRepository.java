package com.redlink.backend.repository;

import com.redlink.backend.model.DonorResponse;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface DonorResponseRepository extends JpaRepository<DonorResponse, Long> {

    // A donor's own replies to the given requests, so a list can show "You accepted" next to each
    List<DonorResponse> findByDonorIdAndRequestIdIn(Long donorId, Collection<Long> requestIds);

    // At most one: UNIQUE (request_id, donor_id)
    Optional<DonorResponse> findByRequestIdAndDonorId(Long requestId, Long donorId);

    // Every reply to a request with the donor and their user, in one query
    @Query("""
            select r from DonorResponse r join fetch r.donor d join fetch d.user
            where r.request.id = :requestId""")
    List<DonorResponse> findByRequestIdWithDonor(Long requestId);

    // Replies per request and status, for every request of a hospital (one query for a whole list)
    @Query("""
            select new com.redlink.backend.repository.ResponseStatusCount(r.request.id, r.status, count(r))
            from DonorResponse r
            where r.request.hospital.id = :hospitalId
            group by r.request.id, r.status""")
    List<ResponseStatusCount> countByStatusForHospital(Long hospitalId);
}
