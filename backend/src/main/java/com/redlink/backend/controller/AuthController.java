package com.redlink.backend.controller;

import com.redlink.backend.dto.auth.ChangePasswordRequest;
import com.redlink.backend.dto.auth.CurrentUserResponse;
import com.redlink.backend.dto.auth.LoginRequest;
import com.redlink.backend.dto.auth.LoginResponse;
import com.redlink.backend.dto.auth.RegisterDonorRequest;
import com.redlink.backend.dto.auth.RegisterHospitalRequest;
import com.redlink.backend.security.AuthRateLimiter;
import com.redlink.backend.service.AuthService;
import com.redlink.backend.service.RegistrationService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

// Registration, sign-in and "who am I". Register and login are public (see SecurityConfig); /me needs a valid token.
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final RegistrationService registrationService;
    private final AuthRateLimiter rateLimiter;

    public AuthController(AuthService authService, RegistrationService registrationService,
                          AuthRateLimiter rateLimiter) {
        this.authService = authService;
        this.registrationService = registrationService;
        this.rateLimiter = rateLimiter;
    }

    // 201 + token: the new donor is signed in straight away. 429 if this address signed up too often.
    @PostMapping("/register/donor")
    @ResponseStatus(HttpStatus.CREATED)
    public LoginResponse registerDonor(@Valid @RequestBody RegisterDonorRequest body, HttpServletRequest request) {
        rateLimiter.checkRegistration(request);
        return registrationService.registerDonor(body);
    }

    // 201 + token: the staff member is signed in and sees "Posting unlocks after approval"
    @PostMapping("/register/hospital")
    @ResponseStatus(HttpStatus.CREATED)
    public LoginResponse registerHospital(@Valid @RequestBody RegisterHospitalRequest body,
                                          HttpServletRequest request) {
        rateLimiter.checkRegistration(request);
        return registrationService.registerHospital(body);
    }

    // 429 if this address or this account has tried too often, before the password is even checked
    @PostMapping("/login")
    public LoginResponse login(@Valid @RequestBody LoginRequest body, HttpServletRequest request) {
        rateLimiter.checkLogin(request, body.email());
        return authService.login(body);
    }

    @GetMapping("/me")
    public CurrentUserResponse me() {
        return authService.me();
    }

    // Returns a new token and the updated user (mustChangePassword is now false); older tokens stop working
    @PatchMapping("/me/password")
    public LoginResponse changePassword(@Valid @RequestBody ChangePasswordRequest body) {
        return authService.changePassword(body);
    }
}
