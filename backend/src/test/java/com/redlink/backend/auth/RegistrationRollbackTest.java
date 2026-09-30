package com.redlink.backend.auth;

import com.redlink.backend.dto.auth.RegisterHospitalRequest;
import com.redlink.backend.repository.HospitalRepository;
import com.redlink.backend.service.RegistrationService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.doThrow;

/**
 * Hospital registration saves the hospital first, then the staff user. If anything fails in between,
 * the hospital row must not be left behind. This forces a failure after the hospital insert
 * (hashing the staff password throws) and checks the database afterwards.
 *
 * Deliberately NOT @Transactional: the service's own transaction has to commit or roll back for real.
 */
@SpringBootTest
class RegistrationRollbackTest {

    @Autowired private RegistrationService registrationService;
    @Autowired private HospitalRepository hospitalRepository;
    @Autowired private JdbcTemplate jdbc;

    @MockitoSpyBean private PasswordEncoder passwordEncoder;

    private final String registrationNo = "ROLLBACK-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
    private final String staffEmail = "rollback-" + UUID.randomUUID().toString().substring(0, 8) + "@test.redlink.lk";

    // Only needed if the rollback failed: don't leave test rows in the database
    @AfterEach
    void removeLeftovers() {
        jdbc.update("DELETE FROM users WHERE email = ?", staffEmail);
        jdbc.update("DELETE FROM hospitals WHERE registration_no = ?", registrationNo);
    }

    @Test
    void failureAfterHospitalInsertLeavesNothingBehind() {
        doThrow(new IllegalStateException("simulated failure while creating the staff user"))
                .when(passwordEncoder).encode("Passw0rd!Test");

        RegisterHospitalRequest request = new RegisterHospitalRequest(
                new RegisterHospitalRequest.HospitalDetails(
                        "Rollback Hospital", registrationNo, "1 Test Rd", "Colombo", "0115577111"),
                new RegisterHospitalRequest.StaffDetails(
                        "Test Staff", staffEmail, "0712345678", "Passw0rd!Test"));

        assertThatThrownBy(() -> registrationService.registerHospital(request))
                .hasMessageContaining("simulated failure");

        assertThat(hospitalRepository.existsByRegistrationNo(registrationNo)).isFalse();
    }
}
