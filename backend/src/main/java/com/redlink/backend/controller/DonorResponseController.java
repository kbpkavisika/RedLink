package com.redlink.backend.controller;

import com.redlink.backend.dto.donor.IncomingRequest;
import com.redlink.backend.dto.request.ResponseStatusRequest;
import com.redlink.backend.service.DonorResponseService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

// A donor's reply to a request. DONOR only: SecurityConfig lists these two paths before the staff rule.
@RestController
@RequestMapping("/api/requests/{id}/responses")
public class DonorResponseController {

    private final DonorResponseService donorResponseService;

    public DonorResponseController(DonorResponseService donorResponseService) {
        this.donorResponseService = donorResponseService;
    }

    // {"status":"ACCEPTED"} or {"status":"DECLINED"}; 201 with the request as the donor now sees it
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public IncomingRequest respond(@PathVariable Long id, @Valid @RequestBody ResponseStatusRequest body) {
        return donorResponseService.respond(id, body);
    }

    // {"status":"WITHDRAWN"}: an accepted donor can't make it after all
    @PatchMapping("/me")
    public IncomingRequest withdraw(@PathVariable Long id, @Valid @RequestBody ResponseStatusRequest body) {
        return donorResponseService.withdraw(id, body);
    }
}
