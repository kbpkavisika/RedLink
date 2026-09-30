package com.redlink.backend.controller;

import com.redlink.backend.dto.DonorSummary;
import com.redlink.backend.service.DonorService;
import org.springframework.web.bind.annotation.*;
import java.util.List;

// HTTP only: each method calls one service method. Errors are turned into ApiError by GlobalExceptionHandler.
// Donors are created through registration (POST /api/auth/register/donor, planned)
@RestController
@RequestMapping("/api/donors")
public class DonorController {

    private final DonorService donorService;

    public DonorController(DonorService donorService) {
        this.donorService = donorService;
    }

    @GetMapping
    public List<DonorSummary> getAll() {
        return donorService.findAll();
    }

    @GetMapping("/{id}")
    public DonorSummary getOne(@PathVariable Long id) {
        return donorService.findById(id);
    }
}
