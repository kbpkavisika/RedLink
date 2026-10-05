package com.redlink.backend.controller;

import com.redlink.backend.dto.donor.DonorProfile;
import com.redlink.backend.dto.donor.UpdateAvailabilityRequest;
import com.redlink.backend.dto.donor.UpdateDonorProfileRequest;
import com.redlink.backend.service.DonorSelfService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

// The signed-in donor's own profile. DONOR only: SecurityConfig guards /api/donor/**.
@RestController
@RequestMapping("/api/donor/me")
public class DonorSelfController {

    private final DonorSelfService donorSelfService;

    public DonorSelfController(DonorSelfService donorSelfService) {
        this.donorSelfService = donorSelfService;
    }

    // Profile plus eligibility: eligible, nextEligibleDate, daysSinceLastDonation
    @GetMapping
    public DonorProfile me() {
        return donorSelfService.me();
    }

    @PatchMapping
    public DonorProfile update(@Valid @RequestBody UpdateDonorProfileRequest body) {
        return donorSelfService.update(body);
    }

    @PatchMapping("/availability")
    public DonorProfile setAvailability(@Valid @RequestBody UpdateAvailabilityRequest body) {
        return donorSelfService.setAvailability(body);
    }
}
