package com.redlink.backend.service;

import com.redlink.backend.dto.auth.ChangePasswordRequest;
import com.redlink.backend.dto.auth.CurrentUserResponse;
import com.redlink.backend.dto.auth.LoginRequest;
import com.redlink.backend.dto.auth.LoginResponse;
import com.redlink.backend.exception.BadRequestException;
import com.redlink.backend.exception.ForbiddenException;
import com.redlink.backend.exception.UnauthorizedException;
import com.redlink.backend.model.User;
import com.redlink.backend.repository.UserRepository;
import com.redlink.backend.security.CurrentUser;
import com.redlink.backend.security.JwtService;
import com.redlink.backend.util.Emails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
@Transactional(readOnly = true)
public class AuthService {

    // The same message for "no such email" and "wrong password", so nobody can find out which emails are registered
    static final String INVALID_CREDENTIALS = "Email or password is incorrect.";
    static final String ACCOUNT_DISABLED = "This account is disabled. Contact admin@redlink.lk for help.";

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final CurrentUser currentUser;

    // Checked when the email doesn't exist, so that answer takes as long as a wrong password
    private final String dummyHash;

    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder,
                       JwtService jwtService, CurrentUser currentUser) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.currentUser = currentUser;
        this.dummyHash = passwordEncoder.encode("redlink-timing-equalizer");
    }

    /**
     *   email not found  ─┐
     *   wrong password   ─┴─► 401 "Email or password is incorrect."
     *   account disabled  ──► 403 (only after the password was right, so it reveals nothing to guessers)
     *   otherwise         ──► token + user
     */
    public LoginResponse login(LoginRequest request) {
        Optional<User> found = userRepository.findByEmail(Emails.normalize(request.email()));

        if (found.isEmpty()) {
            passwordEncoder.matches(request.password(), dummyHash);
            throw new UnauthorizedException(INVALID_CREDENTIALS);
        }
        User user = found.get();
        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new UnauthorizedException(INVALID_CREDENTIALS);
        }
        if (!user.isEnabled()) {
            throw new ForbiddenException(ACCOUNT_DISABLED);
        }

        JwtService.IssuedToken token = jwtService.issue(user, request.rememberMe());
        return new LoginResponse(token.token(), token.expiresAt(), CurrentUserResponse.from(user));
    }

    // GET /api/auth/me: restores the session in the frontend after a page reload
    public CurrentUserResponse me() {
        return CurrentUserResponse.from(currentUser.require());
    }

    /**
     * Replaces the signed-in user's password and clears mustChangePassword.
     * A wrong current password is a 400 on the field, not a 401: a 401 would make the frontend sign the user out.
     */
    @Transactional
    public CurrentUserResponse changePassword(ChangePasswordRequest request) {
        User user = currentUser.require();

        if (!passwordEncoder.matches(request.currentPassword(), user.getPasswordHash())) {
            throw new BadRequestException("Your current password is incorrect.",
                    "currentPassword", "is incorrect");
        }
        if (request.newPassword().equals(request.currentPassword())) {
            throw new BadRequestException("Choose a new password that is different from your current one.",
                    "newPassword", "must be different from your current password");
        }

        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        user.setMustChangePassword(false);
        return CurrentUserResponse.from(user); // saved when the transaction commits
    }
}
