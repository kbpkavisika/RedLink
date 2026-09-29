package com.redlink.backend.controller;

import com.redlink.backend.model.Donor;
import com.redlink.backend.repository.DonorRepository;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/donors")
public class DonorController {

    private final DonorRepository donorRepository;

    public DonorController(DonorRepository donorRepository) {
        this.donorRepository = donorRepository;
    }

    @GetMapping
    public List<Donor> getAll() {
        return donorRepository.findAll();
    }

    @PostMapping
    public Donor create(@RequestBody Donor donor) {
        return donorRepository.save(donor);
    }
}
