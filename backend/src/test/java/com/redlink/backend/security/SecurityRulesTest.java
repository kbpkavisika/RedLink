package com.redlink.backend.security;

import com.redlink.backend.controller.DonorController;
import com.redlink.backend.service.DonorService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static com.redlink.backend.support.TestAuth.ADMIN;
import static com.redlink.backend.support.TestAuth.DONOR;
import static com.redlink.backend.support.TestAuth.HOSPITAL_STAFF;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * The URL role rules in SecurityConfig for the shared /api/requests area. The endpoints aren't built yet,
 * so a role that is let through gets 404 (no controller) and a role that is stopped gets 403.
 */
@WebMvcTest(DonorController.class)
@Import(SecurityConfig.class)
class SecurityRulesTest {

    @Autowired
    private MockMvc mvc;

    @MockitoBean
    private DonorService donorService;

    @Test
    void hospitalStaffManageRequests() throws Exception {
        mvc.perform(post("/api/requests").with(HOSPITAL_STAFF)).andExpect(status().isNotFound());
        mvc.perform(get("/api/requests/5/matches").with(HOSPITAL_STAFF)).andExpect(status().isNotFound());
        mvc.perform(get("/api/requests/5/responses").with(HOSPITAL_STAFF)).andExpect(status().isNotFound());
        mvc.perform(patch("/api/requests/5/status").with(HOSPITAL_STAFF)).andExpect(status().isNotFound());
    }

    @Test
    void donorsAndAdminsCantManageRequests() throws Exception {
        mvc.perform(post("/api/requests").with(DONOR)).andExpect(status().isForbidden());
        mvc.perform(get("/api/requests/5/matches").with(DONOR)).andExpect(status().isForbidden());
        mvc.perform(get("/api/requests/5/responses").with(DONOR)).andExpect(status().isForbidden());
        mvc.perform(post("/api/requests").with(ADMIN)).andExpect(status().isForbidden());
    }

    @Test
    void donorsRespondToRequests() throws Exception {
        mvc.perform(post("/api/requests/5/responses").with(DONOR)).andExpect(status().isNotFound());
        mvc.perform(patch("/api/requests/5/responses/me").with(DONOR)).andExpect(status().isNotFound());
    }

    @Test
    void hospitalStaffCantRespondForDonors() throws Exception {
        mvc.perform(post("/api/requests/5/responses").with(HOSPITAL_STAFF)).andExpect(status().isForbidden());
        mvc.perform(patch("/api/requests/5/responses/me").with(HOSPITAL_STAFF)).andExpect(status().isForbidden());
    }

    @Test
    void requestsNeedASignedInUser() throws Exception {
        mvc.perform(post("/api/requests")).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/requests/5/responses")).andExpect(status().isUnauthorized());
    }
}
