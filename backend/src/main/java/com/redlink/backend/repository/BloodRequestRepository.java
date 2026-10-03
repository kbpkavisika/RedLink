package com.redlink.backend.repository;

import com.redlink.backend.model.BloodRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;

public interface BloodRequestRepository extends JpaRepository<BloodRequest, Long> {

    // Loads the hospital and the poster in the same query (both are shown with the request)
    @Query("select r from BloodRequest r join fetch r.hospital join fetch r.createdBy where r.id = :id")
    Optional<BloodRequest> findByIdWithHospital(Long id);
}
