package com.redlink.backend.config;

import com.redlink.backend.model.Donor;
import com.redlink.backend.model.User;
import com.redlink.backend.model.enums.BloodGroup;
import com.redlink.backend.model.enums.HospitalStatus;
import com.redlink.backend.model.enums.Role;
import com.redlink.backend.repository.DonorRepository;
import com.redlink.backend.repository.HospitalRepository;
import com.redlink.backend.repository.UserRepository;
import com.redlink.backend.service.DonorEligibility;
import com.redlink.backend.support.IntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationContext;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

// Runs the seeder against redLink_test inside the test's transaction, so everything is rolled back afterwards
@IntegrationTest
class DevDataSeederTest {

    private static final String PASSWORD = "Seed-Pass-123";
    private static final LocalDate TODAY = LocalDate.parse("2026-09-30");

    @Autowired private UserRepository userRepository;
    @Autowired private HospitalRepository hospitalRepository;
    @Autowired private DonorRepository donorRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private ApplicationContext context;

    private DevDataSeeder seeder(String password) {
        Clock clock = Clock.fixed(Instant.parse("2026-09-30T06:00:00Z"), ZoneOffset.UTC);
        return new DevDataSeeder(userRepository, hospitalRepository, donorRepository, passwordEncoder,
                new SeedProperties(true, password), clock);
    }

    private List<User> seededUsers() {
        return userRepository.findAll().stream()
                .filter(user -> user.getEmail().endsWith(DevDataSeeder.EMAIL_DOMAIN))
                .toList();
    }

    private Donor seededDonor(String name) {
        return donorRepository.findAllWithUser().stream()
                .filter(donor -> donor.getUser().getEmail().equals(DevDataSeeder.donorEmail(name)))
                .findFirst().orElseThrow();
    }

    @Test
    void isOffUnlessEnabled() {
        assertThat(context.getBeanNamesForType(DevDataSeeder.class)).isEmpty();
    }

    @Test
    void createsTheAdminHospitalsStaffAndDonors() {
        seeder(PASSWORD).run(null);

        Map<Role, Long> byRole = seededUsers().stream()
                .collect(Collectors.groupingBy(User::getRole, Collectors.counting()));
        assertThat(byRole).containsEntry(Role.ADMIN, 1L)
                .containsEntry(Role.HOSPITAL_STAFF, 3L)
                .containsEntry(Role.DONOR, 20L);

        assertThat(hospitalRepository.findByRegistrationNo("SEED-0001")).get()
                .satisfies(h -> assertThat(h.getStatus()).isEqualTo(HospitalStatus.APPROVED));
        assertThat(hospitalRepository.findByRegistrationNo("SEED-0002")).get()
                .satisfies(h -> assertThat(h.getStatus()).isEqualTo(HospitalStatus.PENDING));
        assertThat(hospitalRepository.findByRegistrationNo("SEED-0003")).get()
                .satisfies(h -> assertThat(h.getRejectionReason()).isNotBlank());

        User admin = userRepository.findByEmail("admin@seed.redlink.lk").orElseThrow();
        assertThat(passwordEncoder.matches(PASSWORD, admin.getPasswordHash())).isTrue();
        assertThat(admin.isMustChangePassword()).isFalse();
    }

    @Test
    void donorsCoverEveryBloodGroupAndBothSidesOfThe90DayRule() {
        seeder(PASSWORD).run(null);

        assertThat(DevDataSeeder.DONORS).extracting(DevDataSeeder.SampleDonor::group)
                .containsAll(List.of(BloodGroup.values()));

        Donor kasun = seededDonor("Kasun Dissanayake");      // 89 days ago
        Donor sivakumar = seededDonor("Sivakumar Rajan");    // 90 days ago
        assertThat(kasun.getLastDonationDate()).isEqualTo("2026-07-03");
        assertThat(DonorEligibility.isEligible(kasun.getLastDonationDate(), TODAY)).isFalse();
        assertThat(DonorEligibility.isEligible(sivakumar.getLastDonationDate(), TODAY)).isTrue();
        assertThat(seededDonor("Kamal Perera").getLastDonationDate()).isNull();
        assertThat(seededDonor("Sajith Bandara").isAvailable()).isFalse();
    }

    @Test
    void runningAgainCreatesNoDuplicates() {
        seeder(PASSWORD).run(null);
        long users = userRepository.count();
        long hospitals = hospitalRepository.count();
        long donors = donorRepository.count();

        seeder(PASSWORD).run(null);

        assertThat(userRepository.count()).isEqualTo(users);
        assertThat(hospitalRepository.count()).isEqualTo(hospitals);
        assertThat(donorRepository.count()).isEqualTo(donors);
    }

    @Test
    void refusesToStartWithoutAValidPassword() {
        assertThatThrownBy(() -> seeder(null).run(null))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("redlink.seed.password");
        assertThatThrownBy(() -> seeder("short").run(null))
                .isInstanceOf(IllegalStateException.class);
    }
}
