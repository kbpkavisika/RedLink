package com.redlink.backend.controller;

import com.redlink.backend.dto.donor.IncomingRequest;
import com.redlink.backend.service.DonorSelfService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

// A donor's incoming requests. DONOR only: SecurityConfig guards /api/donor/**.
@RestController
@RequestMapping("/api/donor/requests")
public class DonorRequestController {

    private final DonorSelfService donorSelfService;

    public DonorRequestController(DonorSelfService donorSelfService) {
        this.donorSelfService = donorSelfService;
    }

    // Open requests the donor can give to: critical first, then their own city, then the soonest deadline
    @GetMapping
    public List<IncomingRequest> incoming() {
        return donorSelfService.incomingRequests();
    }
}
