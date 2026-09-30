package com.redlink.backend.controller;

import com.redlink.backend.dto.auth.ChangePasswordRequest;
import com.redlink.backend.dto.auth.CurrentUserResponse;
import com.redlink.backend.dto.auth.LoginRequest;
import com.redlink.backend.dto.auth.LoginResponse;
import com.redlink.backend.dto.auth.RegisterDonorRequest;
import com.redlink.backend.dto.auth.RegisterHospitalRequest;
import com.redlink.backend.service.AuthService;
import com.redlink.backend.service.RegistrationService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

// Registration, sign-in and "who am I". Register and login are public (see SecurityConfig); /me needs a valid token.
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final RegistrationService registrationService;

    public AuthController(AuthService authService, RegistrationService registrationService) {
        this.authService = authService;
        this.registrationService = registrationService;
    }

    // 201 + token: the new donor is signed in straight away
    @PostMapping("/register/donor")
    @ResponseStatus(HttpStatus.CREATED)
    public LoginResponse registerDonor(@Valid @RequestBody RegisterDonorRequest body) {
        return registrationService.registerDonor(body);
    }

    // 201 + token: the staff member is signed in and sees "Posting unlocks after approval"
    @PostMapping("/register/hospital")
    @ResponseStatus(HttpStatus.CREATED)
    public LoginResponse registerHospital(@Valid @RequestBody RegisterHospitalRequest body) {
        return registrationService.registerHospital(body);
    }

    @PostMapping("/login")
    public LoginResponse login(@Valid @RequestBody LoginRequest body) {
        return authService.login(body);
    }

    @GetMapping("/me")
    public CurrentUserResponse me() {
        return authService.me();
    }

    // Returns the updated user (mustChangePassword is now false)
    @PatchMapping("/me/password")
    public CurrentUserResponse changePassword(@Valid @RequestBody ChangePasswordRequest body) {
        return authService.changePassword(body);
    }
}
