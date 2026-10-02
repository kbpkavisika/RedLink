package com.redlink.backend.controller;

import com.redlink.backend.dto.hospital.HospitalDetail;
import com.redlink.backend.dto.hospital.HospitalSummary;
import com.redlink.backend.dto.hospital.UpdateHospitalStatusRequest;
import com.redlink.backend.model.enums.HospitalStatus;
import com.redlink.backend.service.HospitalAdminService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.util.List;

// Hospital review for admins. ADMIN only: SecurityConfig guards /api/admin/**.
@RestController
@RequestMapping("/api/admin/hospitals")
public class AdminHospitalController {

    private final HospitalAdminService hospitalAdminService;

    public AdminHospitalController(HospitalAdminService hospitalAdminService) {
        this.hospitalAdminService = hospitalAdminService;
    }

    // ?status=PENDING is the approval queue; without it, every hospital
    @GetMapping
    public List<HospitalSummary> getAll(@RequestParam(required = false) HospitalStatus status) {
        return hospitalAdminService.findAll(status);
    }

    @GetMapping("/{id}")
    public HospitalDetail getOne(@PathVariable Long id) {
        return hospitalAdminService.findById(id);
    }

    // Approve or reject; returns the updated hospital
    @PatchMapping("/{id}/status")
    public HospitalDetail updateStatus(@PathVariable Long id, @Valid @RequestBody UpdateHospitalStatusRequest body) {
        return hospitalAdminService.updateStatus(id, body);
    }
}
