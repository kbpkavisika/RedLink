package com.redlink.backend.controller;

import com.redlink.backend.dto.DonorSummary;
import com.redlink.backend.exception.NotFoundException;
import com.redlink.backend.model.enums.BloodGroup;
import com.redlink.backend.service.DonorService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.util.List;

import static org.hamcrest.Matchers.matchesPattern;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// Loads only the web layer (controller + GlobalExceptionHandler); the service is mocked, so no database is needed
@WebMvcTest(DonorController.class)
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

        mvc.perform(get("/api/donors"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].name").value("Kamal Perera"))
                .andExpect(jsonPath("$[0].bloodGroup").value("O+"))
                .andExpect(jsonPath("$[0].lastDonationDate").value("2026-05-01"));
    }

    @Test
    void getsOneDonor() throws Exception {
        given(donorService.findById(1L)).willReturn(kamal);

        mvc.perform(get("/api/donors/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.city").value("Colombo"));
    }

    @Test
    void unknownDonorIs404InApiErrorFormat() throws Exception {
        given(donorService.findById(99L)).willThrow(new NotFoundException("Donor 99 was not found."));

        mvc.perform(get("/api/donors/99"))
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
        mvc.perform(get("/api/donors/abc"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("'id' must be a number."))
                .andExpect(jsonPath("$.fieldErrors[0].field").value("id"));
    }

    @Test
    void creatingDonorsHereIsNotAllowed() throws Exception {
        mvc.perform(post("/api/donors").contentType("application/json").content("{}"))
                .andExpect(status().isMethodNotAllowed())
                .andExpect(header().string("Allow", "GET"))
                .andExpect(jsonPath("$.message").value("POST is not supported here."));
    }
}
