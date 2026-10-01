package com.redlink.backend.config;

import com.redlink.backend.model.Donor;
import com.redlink.backend.model.Hospital;
import com.redlink.backend.model.User;
import com.redlink.backend.model.enums.BloodGroup;
import com.redlink.backend.model.enums.HospitalStatus;
import com.redlink.backend.model.enums.Role;
import com.redlink.backend.repository.DonorRepository;
import com.redlink.backend.repository.HospitalRepository;
import com.redlink.backend.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDate;
import java.util.List;
import java.util.Locale;

/**
 * Sample data for trying the app by hand: an admin, three hospitals (approved, pending, rejected) with
 * one staff user each, and 20 donors across every blood group and five cities. Every account uses
 * redlink.seed.password and has an @seed.redlink.lk email.
 *
 * Runs only with redlink.seed.enabled=true (application-local.properties). Safe to leave on: anything
 * that already exists is skipped, so restarting doesn't create duplicates. Donation dates are relative
 * to today, so the 90-day rule splits the donors the same way whenever you run it.
 */
@Component
@ConditionalOnProperty(name = "redlink.seed.enabled", havingValue = "true")
public class DevDataSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DevDataSeeder.class);

    static final String EMAIL_DOMAIN = "@seed.redlink.lk";

    // daysSinceDonation null = never donated. Includes the 89- and 90-day edges of the eligibility rule.
    record SampleDonor(String name, BloodGroup group, String city, Integer daysSinceDonation,
                       boolean available, int age) {
    }

    static final List<SampleDonor> DONORS = List.of(
            new SampleDonor("Kamal Perera", BloodGroup.O_POS, "Colombo", null, true, 29),
            new SampleDonor("Nimali Fernando", BloodGroup.O_POS, "Colombo", 200, true, 34),
            new SampleDonor("Ruwan Silva", BloodGroup.O_POS, "Colombo", 30, true, 41),          // donated recently
            new SampleDonor("Tharushi Jayawardena", BloodGroup.O_POS, "Kandy", 120, true, 25),
            new SampleDonor("Sajith Bandara", BloodGroup.O_POS, "Galle", null, false, 38),      // unavailable
            new SampleDonor("Dilshan Wickramasinghe", BloodGroup.A_POS, "Colombo", 95, true, 27),
            new SampleDonor("Ishara Gunasekara", BloodGroup.A_POS, "Kandy", null, true, 31),
            new SampleDonor("Chamari Rathnayake", BloodGroup.A_POS, "Jaffna", 60, true, 45),    // donated recently
            new SampleDonor("Mohamed Rizwan", BloodGroup.B_POS, "Colombo", 150, true, 36),
            new SampleDonor("Priyanka Herath", BloodGroup.B_POS, "Galle", null, true, 22),
            new SampleDonor("Kasun Dissanayake", BloodGroup.B_POS, "Kurunegala", 89, true, 33), // eligible tomorrow
            new SampleDonor("Sivakumar Rajan", BloodGroup.B_POS, "Jaffna", 90, true, 40),       // eligible from today
            new SampleDonor("Anushka Peiris", BloodGroup.AB_POS, "Colombo", null, true, 28),
            new SampleDonor("Nadeesha Karunaratne", BloodGroup.O_NEG, "Colombo", 365, true, 30),
            new SampleDonor("Arjun Navaratnam", BloodGroup.O_NEG, "Jaffna", null, true, 26),
            new SampleDonor("Hasini Senanayake", BloodGroup.A_NEG, "Kandy", 10, true, 24),      // donated recently
            new SampleDonor("Lahiru Mendis", BloodGroup.B_NEG, "Galle", null, true, 35),
            new SampleDonor("Fathima Nazeer", BloodGroup.B_NEG, "Colombo", 180, false, 29),     // unavailable
            new SampleDonor("Pradeep Kumara", BloodGroup.AB_NEG, "Kurunegala", null, true, 47),
            new SampleDonor("Gayani Abeysekara", BloodGroup.AB_NEG, "Kandy", 100, true, 52)
    );

    private final UserRepository userRepository;
    private final HospitalRepository hospitalRepository;
    private final DonorRepository donorRepository;
    private final PasswordEncoder passwordEncoder;
    private final SeedProperties properties;
    private final Clock clock;

    private String passwordHash; // BCrypt is slow on purpose, so hash once for all accounts
    private int created;

    public DevDataSeeder(UserRepository userRepository, HospitalRepository hospitalRepository,
                         DonorRepository donorRepository, PasswordEncoder passwordEncoder,
                         SeedProperties properties, Clock clock) {
        this.userRepository = userRepository;
        this.hospitalRepository = hospitalRepository;
        this.donorRepository = donorRepository;
        this.passwordEncoder = passwordEncoder;
        this.properties = properties;
        this.clock = clock;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        String password = properties.password();
        if (password == null || password.length() < 8 || password.length() > 72) {
            throw new IllegalStateException(
                    "redlink.seed.enabled is true, so set redlink.seed.password (8 to 72 characters) as well");
        }
        log.warn("Seeding development sample data (redlink.seed.enabled=true). Never enable this when deployed.");
        passwordHash = passwordEncoder.encode(password);
        created = 0;

        User admin = user("Seed Admin", "admin", Role.ADMIN, null);

        Hospital approved = hospital("National Hospital Colombo", "SEED-0001", "Regent St, Colombo 10",
                "Colombo", HospitalStatus.APPROVED, admin);
        user("Dilini Perera", "staff.approved", Role.HOSPITAL_STAFF, approved);

        Hospital pending = hospital("Teaching Hospital Kandy", "SEED-0002", "William Gopallawa Mawatha",
                "Kandy", HospitalStatus.PENDING, null);
        user("Nuwan Jayasinghe", "staff.pending", Role.HOSPITAL_STAFF, pending);

        Hospital rejected = hospital("Northern Care Hospital", "SEED-0003", "Hospital Rd, Jaffna",
                "Jaffna", HospitalStatus.REJECTED, admin);
        user("Kavitha Shanmugam", "staff.rejected", Role.HOSPITAL_STAFF, rejected);

        LocalDate today = LocalDate.now(clock);
        for (SampleDonor sample : DONORS) {
            donor(sample, today);
        }

        log.info("Sample data ready: {} rows created, everything else already existed. Sign in as {} etc.",
                created, email("admin"));
    }

    static String email(String localPart) {
        return localPart + EMAIL_DOMAIN;
    }

    // "Kamal Perera" → kamal.perera@seed.redlink.lk
    static String donorEmail(String name) {
        return email(name.toLowerCase(Locale.ROOT).replace(' ', '.'));
    }

    private User user(String fullName, String localPart, Role role, Hospital hospital) {
        String email = email(localPart);
        return userRepository.findByEmail(email).orElseGet(() -> saveUser(fullName, email, role, hospital));
    }

    private User saveUser(String fullName, String email, Role role, Hospital hospital) {
        User user = new User();
        user.setFullName(fullName);
        user.setEmail(email);
        user.setPhone(String.format("07700%05d", created + 1));
        user.setRole(role);
        user.setHospital(hospital);
        user.setPasswordHash(passwordHash);
        created++;
        return userRepository.save(user);
    }

    private Hospital hospital(String name, String registrationNo, String address, String city,
                              HospitalStatus status, User reviewedBy) {
        return hospitalRepository.findByRegistrationNo(registrationNo).orElseGet(() -> {
            Hospital hospital = new Hospital();
            hospital.setName(name);
            hospital.setRegistrationNo(registrationNo);
            hospital.setAddress(address);
            hospital.setCity(city);
            hospital.setPhone("0110000" + registrationNo.substring(registrationNo.length() - 3));
            hospital.setStatus(status);
            if (status != HospitalStatus.PENDING) {
                hospital.setApprovedBy(reviewedBy);
                hospital.setApprovedAt(clock.instant());
            }
            if (status == HospitalStatus.REJECTED) {
                hospital.setRejectionReason("The registration number could not be verified with the Ministry of Health.");
            }
            created++;
            return hospitalRepository.save(hospital);
        });
    }

    private void donor(SampleDonor sample, LocalDate today) {
        String email = donorEmail(sample.name());
        if (userRepository.existsByEmail(email)) {
            return;
        }
        Donor donor = new Donor();
        donor.setUser(saveUser(sample.name(), email, Role.DONOR, null));
        donor.setBloodGroup(sample.group());
        donor.setCity(sample.city());
        donor.setAvailable(sample.available());
        donor.setDateOfBirth(today.minusYears(sample.age()).minusMonths(3));
        if (sample.daysSinceDonation() != null) {
            donor.setLastDonationDate(today.minusDays(sample.daysSinceDonation()));
        }
        donorRepository.save(donor);
    }
}
