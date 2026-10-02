package com.redlink.backend.repository;

import com.redlink.backend.model.Hospital;
import com.redlink.backend.model.enums.HospitalStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface HospitalRepository extends JpaRepository<Hospital, Long> {

    // Registration numbers are stored uppercased, so pass an uppercased value
    boolean existsByRegistrationNo(String registrationNo);

    // The admin's queue: oldest first, so nobody waits longest
    List<Hospital> findAllByStatusOrderByCreatedAtAsc(HospitalStatus status);

    List<Hospital> findAllByOrderByCreatedAtDesc();

    // Locks the row until the transaction ends, so two admins can't decide on the same hospital at once
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select h from Hospital h where h.id = :id")
    Optional<Hospital> findByIdForUpdate(Long id);

    Optional<Hospital> findByRegistrationNo(String registrationNo);
}
