package com.redlink.backend.controller;

import com.redlink.backend.dto.request.CreateBloodRequestRequest;
import com.redlink.backend.dto.request.PostedRequestResponse;
import com.redlink.backend.service.BloodRequestService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

// Blood requests. SecurityConfig lets HOSPITAL_STAFF in here (donors only reach the two response endpoints);
// the service also checks that the staff member's hospital is APPROVED.
@RestController
@RequestMapping("/api/requests")
public class BloodRequestController {

    private final BloodRequestService bloodRequestService;

    public BloodRequestController(BloodRequestService bloodRequestService) {
        this.bloodRequestService = bloodRequestService;
    }

    // 201: the request is OPEN and the top matches have been notified
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PostedRequestResponse create(@Valid @RequestBody CreateBloodRequestRequest body) {
        return bloodRequestService.create(body);
    }
}
