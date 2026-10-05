package com.redlink.backend.controller;

import com.redlink.backend.dto.user.AddStaffRequest;
import com.redlink.backend.dto.user.UserSummary;
import com.redlink.backend.model.enums.Role;
import com.redlink.backend.service.UserAdminService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

// "Manage users" for admins. ADMIN only: SecurityConfig guards /api/admin/**.
// There is deliberately no endpoint for changing another user's password.
@RestController
@RequestMapping("/api/admin/users")
public class AdminUserController {

    private final UserAdminService userAdminService;

    public AdminUserController(UserAdminService userAdminService) {
        this.userAdminService = userAdminService;
    }

    // ?role=DONOR&q=kamal, both optional; newest first, at most 200
    @GetMapping
    public List<UserSummary> search(@RequestParam(required = false) Role role,
                                    @RequestParam(required = false) String q) {
        return userAdminService.search(role, q);
    }

    // 201: a new HOSPITAL_STAFF user who must change the temporary password at first sign-in
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public UserSummary addStaff(@Valid @RequestBody AddStaffRequest body) {
        return userAdminService.addStaff(body);
    }
}
