package com.redlink.backend.service;

import com.redlink.backend.dto.auth.RegisterDonorRequest;
import com.redlink.backend.exception.BadRequestException;
import com.redlink.backend.model.enums.BloodGroup;
import com.redlink.backend.repository.DonorRepository;
import com.redlink.backend.repository.HospitalRepository;
import com.redlink.backend.repository.UserRepository;
import com.redlink.backend.security.JwtService;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;

// The 18–60 age rule at its edges, with "today" fixed to 30 Sep 2026
class RegistrationServiceAgeTest {

    private final Clock today = Clock.fixed(Instant.parse("2026-09-30T06:00:00Z"), ZoneOffset.UTC);
    private final JwtService jwtService = mock(JwtService.class);
    private final RegistrationService service = new RegistrationService(
            mock(UserRepository.class), mock(DonorRepository.class), mock(HospitalRepository.class),
            mock(PasswordEncoder.class), jwtService, today);

    private RegisterDonorRequest bornOn(String date) {
        return new RegisterDonorRequest("Kamal Perera", "kamal@test.redlink.lk", "0771234567",
                "Passw0rd!Test", BloodGroup.O_POS, LocalDate.parse(date), "Colombo");
    }

    @ParameterizedTest(name = "born {0} is accepted")
    @CsvSource({
            "2008-09-30", // 18 today
            "1995-04-12",
            "1966-09-30", // 60 today
            "1965-10-01", // still 60 until tomorrow
    })
    void acceptsAges18To60(String dateOfBirth) {
        given(jwtService.issue(any(), anyBoolean())).willReturn(new JwtService.IssuedToken("token", Instant.now()));

        assertThatCode(() -> service.registerDonor(bornOn(dateOfBirth))).doesNotThrowAnyException();
    }

    @ParameterizedTest(name = "born {0} is rejected")
    @CsvSource({
            "2008-10-01", // 18 tomorrow
            "2015-01-01",
            "1965-09-30", // 61 today
            "1950-01-01",
    })
    void rejectsYoungerThan18OrOlderThan60(String dateOfBirth) {
        assertThatThrownBy(() -> service.registerDonor(bornOn(dateOfBirth)))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("Donors must be between 18 and 60 years old.");
    }
}
