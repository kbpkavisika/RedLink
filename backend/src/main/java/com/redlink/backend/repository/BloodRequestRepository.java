package com.redlink.backend.repository;

import com.redlink.backend.model.BloodRequest;
import com.redlink.backend.model.enums.BloodGroup;
import com.redlink.backend.model.enums.RequestStatus;
import jakarta.persistence.LockModeType;
import jakarta.persistence.QueryHint;
import org.springframework.data.domain.Limit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.QueryHints;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface BloodRequestRepository extends JpaRepository<BloodRequest, Long> {

    // Loads the hospital and the poster in the same query (both are shown with the request)
    @Query("select r from BloodRequest r join fetch r.hospital join fetch r.createdBy where r.id = :id")
    Optional<BloodRequest> findByIdWithHospital(Long id);

    // Locks the row until the transaction ends, so closing a request and a donor replying can't overlap
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select r from BloodRequest r where r.id = :id")
    Optional<BloodRequest> findByIdForUpdate(Long id);

    /**
     * OPEN requests whose needed-by time has passed, locked for the expiry job. SKIP LOCKED: a request that a
     * donor or staff member is busy with right now is left for the next run instead of waiting on it.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @QueryHints(@QueryHint(name = "jakarta.persistence.lock.timeout", value = "-2"))
    @Query("select r from BloodRequest r where r.status = :status and r.neededBy <= :now order by r.id")
    List<BloodRequest> findOverdueForUpdate(RequestStatus status, Instant now);

    // A hospital's requests, newest first, with who posted each (idx_requests_hospital)
    @Query("""
            select r from BloodRequest r join fetch r.createdBy join fetch r.hospital
            where r.hospital.id = :hospitalId
            order by r.createdAt desc, r.id desc""")
    List<BloodRequest> findByHospitalNewestFirst(Long hospitalId);

    // Every hospital's requests, newest first (A7), up to a limit
    @Query("""
            select r from BloodRequest r join fetch r.createdBy join fetch r.hospital
            order by r.createdAt desc, r.id desc""")
    List<BloodRequest> findAllNewestFirst(Limit limit);

    // A donor's incoming requests (D5): still OPEN, not yet past their deadline, for a group the donor can give to
    @Query("""
            select r from BloodRequest r join fetch r.hospital
            where r.status = :status and r.neededBy > :now and r.bloodGroup in :groups""")
    List<BloodRequest> findOpenForGroups(RequestStatus status, Instant now, Collection<BloodGroup> groups);
}
