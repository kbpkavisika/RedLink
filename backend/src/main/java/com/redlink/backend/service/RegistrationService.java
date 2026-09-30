package com.redlink.backend.service;

import com.redlink.backend.dto.auth.CurrentUserResponse;
import com.redlink.backend.dto.auth.LoginResponse;
import com.redlink.backend.dto.auth.RegisterDonorRequest;
import com.redlink.backend.dto.auth.RegisterHospitalRequest;
import com.redlink.backend.exception.BadRequestException;
import com.redlink.backend.exception.ConflictException;
import com.redlink.backend.model.Donor;
import com.redlink.backend.model.Hospital;
import com.redlink.backend.model.User;
import com.redlink.backend.model.enums.HospitalStatus;
import com.redlink.backend.model.enums.Role;
import com.redlink.backend.repository.DonorRepository;
import com.redlink.backend.repository.HospitalRepository;
import com.redlink.backend.repository.UserRepository;
import com.redlink.backend.security.JwtService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDate;
import java.time.Period;

/**
 * Creates accounts. Each method is one transaction: if any insert fails, nothing is saved.
 * The new user is signed in straight away (the response includes a token).
 */
@Service
public class RegistrationService {

    // Blood donation age range in Sri Lanka
    static final int MIN_DONOR_AGE = 18;
    static final int MAX_DONOR_AGE = 60;

    private final UserRepository userRepository;
    private final DonorRepository donorRepository;
    private final HospitalRepository hospitalRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final Clock clock;

    public RegistrationService(UserRepository userRepository, DonorRepository donorRepository,
                               HospitalRepository hospitalRepository, PasswordEncoder passwordEncoder,
                               JwtService jwtService, Clock clock) {
        this.userRepository = userRepository;
        this.donorRepository = donorRepository;
        this.hospitalRepository = hospitalRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.clock = clock;
    }

    // Creates the DONOR user and their donor profile
    @Transactional
    public LoginResponse registerDonor(RegisterDonorRequest request) {
        ensureEmailIsFree(request.email(), "email");
        ensureDonorAge(request.dateOfBirth());

        User user = newUser(request.fullName(), request.email(), request.phone(), request.password(), Role.DONOR);
        userRepository.save(user);

        Donor donor = new Donor();
        donor.setUser(user);
        donor.setBloodGroup(request.bloodGroup());
        donor.setDateOfBirth(request.dateOfBirth());
        donor.setCity(request.city());
        donorRepository.save(donor);

        return signIn(user);
    }

    // Creates the hospital (PENDING, so it can't post until an admin approves it) and its first staff user
    @Transactional
    public LoginResponse registerHospital(RegisterHospitalRequest request) {
        RegisterHospitalRequest.HospitalDetails details = request.hospital();
        RegisterHospitalRequest.StaffDetails staff = request.staff();

        if (hospitalRepository.existsByRegistrationNo(details.registrationNo())) {
            throw new ConflictException(
                    "A hospital with this registration number is already registered. Ask its staff or the admin to add you.",
                    "hospital.registrationNo", "is already registered");
        }
        ensureEmailIsFree(staff.email(), "staff.email");

        Hospital hospital = new Hospital();
        hospital.setName(details.name());
        hospital.setRegistrationNo(details.registrationNo());
        hospital.setAddress(details.address());
        hospital.setCity(details.city());
        hospital.setPhone(details.phone());
        hospital.setStatus(HospitalStatus.PENDING);
        hospitalRepository.save(hospital);

        User user = newUser(staff.fullName(), staff.email(), staff.phone(), staff.password(), Role.HOSPITAL_STAFF);
        user.setHospital(hospital);
        userRepository.save(user);

        return signIn(user);
    }

    // Checked first for a friendly message; the database's UNIQUE(email) still catches two sign-ups at the same moment
    private void ensureEmailIsFree(String email, String field) {
        if (userRepository.existsByEmail(email)) {
            throw new ConflictException(
                    "An account with this email already exists. Sign in instead, or use another email.",
                    field, "is already registered");
        }
    }

    private void ensureDonorAge(LocalDate dateOfBirth) {
        int age = Period.between(dateOfBirth, LocalDate.now(clock)).getYears();
        if (age < MIN_DONOR_AGE || age > MAX_DONOR_AGE) {
            throw new BadRequestException(
                    "Donors must be between " + MIN_DONOR_AGE + " and " + MAX_DONOR_AGE + " years old.",
                    "dateOfBirth", "must make you " + MIN_DONOR_AGE + " to " + MAX_DONOR_AGE + " years old");
        }
    }

    private User newUser(String fullName, String email, String phone, String password, Role role) {
        User user = new User();
        user.setFullName(fullName);
        user.setEmail(email);
        user.setPhone(phone);
        user.setPasswordHash(passwordEncoder.encode(password));
        user.setRole(role);
        return user;
    }

    private LoginResponse signIn(User user) {
        JwtService.IssuedToken token = jwtService.issue(user, false);
        return new LoginResponse(token.token(), token.expiresAt(), CurrentUserResponse.from(user));
    }
}
