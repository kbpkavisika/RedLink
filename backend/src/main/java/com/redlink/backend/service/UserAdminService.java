package com.redlink.backend.service;

import com.redlink.backend.dto.user.AddStaffRequest;
import com.redlink.backend.dto.user.SetTemporaryPasswordRequest;
import com.redlink.backend.dto.user.UserSummary;
import com.redlink.backend.exception.BadRequestException;
import com.redlink.backend.exception.ConflictException;
import com.redlink.backend.exception.NotFoundException;
import com.redlink.backend.model.Hospital;
import com.redlink.backend.model.User;
import com.redlink.backend.model.enums.HospitalStatus;
import com.redlink.backend.model.enums.Role;
import com.redlink.backend.repository.HospitalRepository;
import com.redlink.backend.repository.UserRepository;
import com.redlink.backend.security.CurrentUser;
import org.springframework.data.domain.Limit;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;

/**
 * The admin's "Manage users" (A5) and the two decisions it carries out:
 *   decision 3: further hospital staff are added by the admin
 *   decision 5: no email reset in v1; the admin sets a temporary password instead
 * Both give the user a temporary password they must replace at their next sign-in (must_change_password).
 */
@Service
@Transactional(readOnly = true)
public class UserAdminService {

    // Enough for any realistic search; refine the search instead of paging through thousands
    static final int MAX_RESULTS = 200;

    private final UserRepository userRepository;
    private final HospitalRepository hospitalRepository;
    private final PasswordEncoder passwordEncoder;
    private final CurrentUser currentUser;

    public UserAdminService(UserRepository userRepository, HospitalRepository hospitalRepository,
                            PasswordEncoder passwordEncoder, CurrentUser currentUser) {
        this.userRepository = userRepository;
        this.hospitalRepository = hospitalRepository;
        this.passwordEncoder = passwordEncoder;
        this.currentUser = currentUser;
    }

    // role null = every role; q matches part of the name or email, ignoring case
    public List<UserSummary> search(Role role, String q) {
        return userRepository.search(role, likePattern(q), Limit.of(MAX_RESULTS)).stream()
                .map(UserSummary::from)
                .toList();
    }

    @Transactional
    public UserSummary addStaff(AddStaffRequest request) {
        Hospital hospital = hospitalRepository.findById(request.hospitalId())
                .orElseThrow(() -> new BadRequestException("That hospital doesn't exist.",
                        "hospitalId", "doesn't exist"));
        if (hospital.getStatus() != HospitalStatus.APPROVED) {
            throw new ConflictException("Staff can only be added to an approved hospital.",
                    "hospitalId", "isn't approved");
        }
        // Checked first for a friendly message; UNIQUE(email) still catches a race
        if (userRepository.existsByEmail(request.email())) {
            throw new ConflictException("An account with this email already exists.", "email", "is already registered");
        }

        User user = new User();
        user.setFullName(request.fullName());
        user.setEmail(request.email());
        user.setPhone(request.phone());
        user.setRole(Role.HOSPITAL_STAFF);
        user.setHospital(hospital);
        user.setPasswordHash(passwordEncoder.encode(request.temporaryPassword()));
        user.setMustChangePassword(true);
        userRepository.saveAndFlush(user); // sets createdAt for the response

        return UserSummary.from(user);
    }

    @Transactional
    public UserSummary setTemporaryPassword(Long id, SetTemporaryPasswordRequest request) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("User " + id + " was not found."));
        if (user.getId().equals(currentUser.id())) {
            throw new BadRequestException("Use Change password to change your own password.");
        }

        user.setPasswordHash(passwordEncoder.encode(request.temporaryPassword()));
        user.setMustChangePassword(true);
        return UserSummary.from(user); // saved when the transaction commits
    }

    // "  Kamal " → "%kamal%"; % and _ typed by the admin are matched literally
    static String likePattern(String q) {
        if (q == null || q.isBlank()) {
            return "%";
        }
        String escaped = q.trim().toLowerCase(Locale.ROOT)
                .replace("\\", "\\\\")
                .replace("%", "\\%")
                .replace("_", "\\_");
        return "%" + escaped + "%";
    }
}
