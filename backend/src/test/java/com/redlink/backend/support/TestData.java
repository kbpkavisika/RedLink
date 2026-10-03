package com.redlink.backend.support;

import com.redlink.backend.model.BloodRequest;
import com.redlink.backend.model.Donor;
import com.redlink.backend.model.DonorResponse;
import com.redlink.backend.model.Hospital;
import com.redlink.backend.model.User;
import com.redlink.backend.model.enums.BloodGroup;
import com.redlink.backend.model.enums.HospitalStatus;
import com.redlink.backend.model.enums.ResponseStatus;
import com.redlink.backend.model.enums.Role;
import com.redlink.backend.model.enums.Urgency;
import com.redlink.backend.repository.BloodRequestRepository;
import com.redlink.backend.repository.DonorRepository;
import com.redlink.backend.repository.DonorResponseRepository;
import com.redlink.backend.repository.HospitalRepository;
import com.redlink.backend.repository.UserRepository;
import com.redlink.backend.security.JwtService;
import org.springframework.boot.test.context.TestComponent;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Builds rows for integration tests in one line each: users, hospitals, donors and their tokens.
 * Every user gets the password {@link #PASSWORD}. Emails and registration numbers are unique per
 * run, so they can't clash with rows already in the database.
 *
 * <pre>
 * Donor donor = testData.donor(BloodGroup.O_NEG, "Kandy", LocalDate.parse("2026-05-01"));
 * User staff = testData.staff(testData.hospital(HospitalStatus.APPROVED));
 * mvc.perform(get("/api/...").header("Authorization", testData.bearer(staff)))
 * </pre>
 */
@TestComponent
public class TestData {

    public static final String PASSWORD = "Passw0rd!Test";

    private final UserRepository userRepository;
    private final HospitalRepository hospitalRepository;
    private final DonorRepository donorRepository;
    private final BloodRequestRepository bloodRequestRepository;
    private final DonorResponseRepository donorResponseRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    private final String run = UUID.randomUUID().toString().substring(0, 8);
    private final AtomicInteger counter = new AtomicInteger();
    private String passwordHash; // BCrypt is slow on purpose, so hash once

    public TestData(UserRepository userRepository, HospitalRepository hospitalRepository,
                    DonorRepository donorRepository, BloodRequestRepository bloodRequestRepository,
                    DonorResponseRepository donorResponseRepository, PasswordEncoder passwordEncoder,
                    JwtService jwtService) {
        this.userRepository = userRepository;
        this.hospitalRepository = hospitalRepository;
        this.donorRepository = donorRepository;
        this.bloodRequestRepository = bloodRequestRepository;
        this.donorResponseRepository = donorResponseRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    // Same name → same email within a run, so a test can register "kamal" and then log in as "kamal"
    public String email(String name) {
        return name + "-" + run + "@test.redlink.lk";
    }

    // Different every call, e.g. "REG-1a2b3c4d-7"
    public String unique(String prefix) {
        return prefix + "-" + run + "-" + counter.incrementAndGet();
    }

    // An ADMIN or DONOR user (no donor profile; use donor() for that)
    public User user(String name, Role role) {
        User user = new User();
        user.setEmail(email(name));
        user.setFullName("Test " + name);
        user.setPhone("0771234567");
        user.setRole(role);
        user.setPasswordHash(passwordHash());
        return userRepository.save(user);
    }

    public User admin() {
        return user(unique("admin"), Role.ADMIN);
    }

    public Hospital hospital(HospitalStatus status) {
        String registrationNo = unique("REG").toUpperCase();
        Hospital hospital = new Hospital();
        hospital.setName("Test Hospital " + registrationNo);
        hospital.setRegistrationNo(registrationNo);
        hospital.setAddress("1 Test Rd");
        hospital.setCity("Colombo");
        hospital.setPhone("0115577111");
        hospital.setStatus(status);
        if (status == HospitalStatus.REJECTED) {
            hospital.setRejectionReason("Registration number could not be verified.");
        }
        return hospitalRepository.save(hospital);
    }

    public User staff(Hospital hospital) {
        User user = new User();
        user.setEmail(email(unique("staff")));
        user.setFullName("Test Staff");
        user.setPhone("0712345678");
        user.setRole(Role.HOSPITAL_STAFF);
        user.setHospital(hospital);
        user.setPasswordHash(passwordHash());
        return userRepository.save(user);
    }

    // lastDonationDate may be null (never donated)
    public Donor donor(BloodGroup bloodGroup, String city, LocalDate lastDonationDate) {
        Donor donor = new Donor();
        donor.setUser(user(unique("donor"), Role.DONOR));
        donor.setBloodGroup(bloodGroup);
        donor.setDateOfBirth(LocalDate.of(1995, 4, 12));
        donor.setCity(city);
        donor.setLastDonationDate(lastDonationDate);
        return donorRepository.save(donor);
    }

    // An OPEN request for 1 unit at MEDIUM urgency, needed within 2 days, posted by this staff member
    public BloodRequest bloodRequest(User staff, BloodGroup bloodGroup, String city) {
        BloodRequest request = new BloodRequest();
        request.setHospital(staff.getHospital());
        request.setCreatedBy(staff);
        request.setBloodGroup(bloodGroup);
        request.setUnitsNeeded(1);
        request.setUrgency(Urgency.MEDIUM);
        request.setCity(city);
        request.setNeededBy(Instant.now().plus(Duration.ofDays(2)));
        return bloodRequestRepository.save(request);
    }

    public DonorResponse response(BloodRequest request, Donor donor, ResponseStatus status) {
        DonorResponse response = new DonorResponse();
        response.setRequest(request);
        response.setDonor(donor);
        response.setStatus(status);
        return donorResponseRepository.save(response);
    }

    public String token(User user) {
        return jwtService.issue(user, false).token();
    }

    // Ready for .header("Authorization", testData.bearer(user))
    public String bearer(User user) {
        return "Bearer " + token(user);
    }

    private String passwordHash() {
        if (passwordHash == null) {
            passwordHash = passwordEncoder.encode(PASSWORD);
        }
        return passwordHash;
    }
}
