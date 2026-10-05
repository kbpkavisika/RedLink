package com.redlink.backend.controller;

import com.redlink.backend.dto.donor.DonationHistory;
import com.redlink.backend.service.DonorSelfService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

// A donor's donation history. DONOR only: SecurityConfig guards /api/donor/**.
@RestController
@RequestMapping("/api/donor/donations")
public class DonorDonationController {

    private final DonorSelfService donorSelfService;

    public DonorDonationController(DonorSelfService donorSelfService) {
        this.donorSelfService = donorSelfService;
    }

    // Totals, every donation newest first, and the next eligible date
    @GetMapping
    public DonationHistory history() {
        return donorSelfService.donations();
    }
}
