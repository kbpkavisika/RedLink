package com.redlink.backend.controller;

import com.redlink.backend.dto.request.AdminRequestDetail;
import com.redlink.backend.dto.request.RequestListItem;
import com.redlink.backend.service.AdminRequestService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

// Every hospital's requests, read-only (A7, A8). ADMIN only: SecurityConfig guards /api/admin/**.
@RestController
@RequestMapping("/api/admin/requests")
public class AdminRequestController {

    private final AdminRequestService adminRequestService;

    public AdminRequestController(AdminRequestService adminRequestService) {
        this.adminRequestService = adminRequestService;
    }

    // The newest 500, with reply and donation counts; the page searches and filters within them
    @GetMapping
    public List<RequestListItem> list() {
        return adminRequestService.list();
    }

    @GetMapping("/{id}")
    public AdminRequestDetail getOne(@PathVariable Long id) {
        return adminRequestService.findById(id);
    }
}
