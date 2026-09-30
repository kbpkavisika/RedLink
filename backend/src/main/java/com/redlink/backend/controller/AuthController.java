package com.redlink.backend.controller;

import com.redlink.backend.dto.auth.CurrentUserResponse;
import com.redlink.backend.dto.auth.LoginRequest;
import com.redlink.backend.dto.auth.LoginResponse;
import com.redlink.backend.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

// Sign-in and "who am I". Login is public (see SecurityConfig); /me needs a valid token.
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/login")
    public LoginResponse login(@Valid @RequestBody LoginRequest body) {
        return authService.login(body);
    }

    @GetMapping("/me")
    public CurrentUserResponse me() {
        return authService.me();
    }
}
