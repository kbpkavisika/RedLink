package com.redlink.backend.controller;

import com.redlink.backend.dto.DonorSummary;
import com.redlink.backend.exception.NotFoundException;
import com.redlink.backend.model.enums.BloodGroup;
import com.redlink.backend.security.SecurityConfig;
import com.redlink.backend.service.DonorService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.util.List;

import static com.redlink.backend.support.TestAuth.ADMIN;
import static com.redlink.backend.support.TestAuth.DONOR;
import static org.hamcrest.Matchers.matchesPattern;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// Loads only the web layer (controller + GlobalExceptionHandler + security rules); the service is mocked,
// so no database is needed. TestAuth.ADMIN / DONOR stand in for a signed-in user with that role.
@WebMvcTest(DonorController.class)
@Import(SecurityConfig.class)
class DonorControllerTest {

    @Autowired
    private MockMvc mvc;

    @MockitoBean
    private DonorService donorService;

    private final DonorSummary kamal = new DonorSummary(
            1L, "Kamal Perera", BloodGroup.O_POS, "0771234567", "Colombo", true, LocalDate.of(2026, 5, 1));

    @Test
    void listsDonors() throws Exception {
        given(donorService.findAll()).willReturn(List.of(kamal));

        mvc.perform(get("/api/donors").with(ADMIN))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].name").value("Kamal Perera"))
                .andExpect(jsonPath("$[0].bloodGroup").value("O+"))
                .andExpect(jsonPath("$[0].lastDonationDate").value("2026-05-01"));
    }

    @Test
    void getsOneDonor() throws Exception {
        given(donorService.findById(1L)).willReturn(kamal);

        mvc.perform(get("/api/donors/1").with(ADMIN))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.city").value("Colombo"));
    }

    @Test
    void unknownDonorIs404InApiErrorFormat() throws Exception {
        given(donorService.findById(99L)).willThrow(new NotFoundException("Donor 99 was not found."));

        mvc.perform(get("/api/donors/99").with(ADMIN))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.error").value("Not Found"))
                .andExpect(jsonPath("$.message").value("Donor 99 was not found."))
                .andExpect(jsonPath("$.fieldErrors").isEmpty())
                .andExpect(jsonPath("$.ref").value(matchesPattern("[0-9a-f]{4}-[0-9a-f]{4}")))
                .andExpect(jsonPath("$.path").value("/api/donors/99"))
                .andExpect(jsonPath("$.timestamp").exists());
    }

    @Test
    void nonNumericIdIs400() throws Exception {
        mvc.perform(get("/api/donors/abc").with(ADMIN))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("'id' must be a number."))
                .andExpect(jsonPath("$.fieldErrors[0].field").value("id"));
    }

    @Test
    void creatingDonorsHereIsNotAllowed() throws Exception {
        mvc.perform(post("/api/donors").with(ADMIN).contentType("application/json").content("{}"))
                .andExpect(status().isMethodNotAllowed())
                .andExpect(header().string("Allow", "GET"))
                .andExpect(jsonPath("$.message").value("POST is not supported here."));
    }

    // ---- Security rules ----

    @Test
    void withoutTokenIs401InApiErrorFormat() throws Exception {
        mvc.perform(get("/api/donors"))
                .andExpect(status().isUnauthorized())
                .andExpect(header().string("WWW-Authenticate", "Bearer"))
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.message").value(
                        "You're not signed in, or your session has expired. Please sign in again."))
                .andExpect(jsonPath("$.ref").value(matchesPattern("[0-9a-f]{4}-[0-9a-f]{4}")))
                .andExpect(jsonPath("$.path").value("/api/donors"));
    }

    @Test
    void invalidTokenIs401() throws Exception {
        mvc.perform(get("/api/donors").header("Authorization", "Bearer not-a-real-token"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401));
    }

    @Test
    void donorRoleIs403InApiErrorFormat() throws Exception {
        mvc.perform(get("/api/donors").with(DONOR))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403))
                .andExpect(jsonPath("$.message").value("You don't have access to this."));
    }
}
