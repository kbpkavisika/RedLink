package com.redlink.backend.controller;

import com.redlink.backend.dto.request.CreateBloodRequestRequest;
import com.redlink.backend.dto.request.HospitalRequestList;
import com.redlink.backend.dto.request.MatchedDonor;
import com.redlink.backend.dto.request.PostedRequestResponse;
import com.redlink.backend.dto.request.RequestOverview;
import com.redlink.backend.dto.request.RequestResponse;
import com.redlink.backend.dto.request.UpdateRequestStatusRequest;
import com.redlink.backend.model.enums.BloodGroup;
import com.redlink.backend.service.BloodRequestService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

// Blood requests. SecurityConfig lets HOSPITAL_STAFF in here (donors only reach the two response endpoints);
// the service also checks that the staff member's hospital is APPROVED, and that a request is their hospital's.
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

    // H11: the hospital's requests, newest first, with reply and donation counts and the dashboard numbers
    @GetMapping
    public HospitalRequestList list() {
        return bloodRequestService.list();
    }

    @GetMapping("/{id}")
    public RequestOverview getOne(@PathVariable Long id) {
        return bloodRequestService.findById(id);
    }

    // Ranked best first; ?bloodGroup=O- and ?city=Kandy narrow it (encode "+" as %2B, e.g. O%2B)
    @GetMapping("/{id}/matches")
    public List<MatchedDonor> getMatches(@PathVariable Long id,
                                         @RequestParam(required = false) BloodGroup bloodGroup,
                                         @RequestParam(required = false) String city) {
        return bloodRequestService.findMatches(id, bloodGroup, city);
    }

    // H8, H9: {"status":"FULFILLED","donorIds":[...]} or {"status":"CANCELLED"}; returns the closed request
    @PatchMapping("/{id}/status")
    public RequestOverview close(@PathVariable Long id, @Valid @RequestBody UpdateRequestStatusRequest body) {
        return bloodRequestService.close(id, body);
    }

    // H7: donors' replies, accepted first. (Donors reply through DonorResponseController on the same path.)
    @GetMapping("/{id}/responses")
    public List<RequestResponse> getResponses(@PathVariable Long id) {
        return bloodRequestService.findResponses(id);
    }
}
