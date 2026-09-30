package com.redlink.backend.controller;

import com.redlink.backend.dto.DonorSummary;
import com.redlink.backend.repository.DonorRepository;
import org.springframework.web.bind.annotation.*;
import java.util.List;

// Donors are created through registration (POST /api/auth/register/donor, planned)
@RestController
@RequestMapping("/api/donors")
public class DonorController {

    private final DonorRepository donorRepository;

    public DonorController(DonorRepository donorRepository) {
        this.donorRepository = donorRepository;
    }

    @GetMapping
    public List<DonorSummary> getAll() {
        return donorRepository.findAllWithUser().stream()
                .map(DonorSummary::from)
                .toList();
    }
}
