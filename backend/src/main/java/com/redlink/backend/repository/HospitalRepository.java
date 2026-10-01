package com.redlink.backend.repository;

import com.redlink.backend.model.Hospital;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface HospitalRepository extends JpaRepository<Hospital, Long> {

    // Registration numbers are stored uppercased, so pass an uppercased value
    boolean existsByRegistrationNo(String registrationNo);

    Optional<Hospital> findByRegistrationNo(String registrationNo);
}
