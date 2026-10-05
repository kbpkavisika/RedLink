package com.redlink.backend.admin;

import com.redlink.backend.model.BloodRequest;
import com.redlink.backend.model.Donation;
import com.redlink.backend.model.Donor;
import com.redlink.backend.model.Hospital;
import com.redlink.backend.model.User;
import com.redlink.backend.model.enums.BloodGroup;
import com.redlink.backend.model.enums.HospitalStatus;
import com.redlink.backend.model.enums.RequestStatus;
import com.redlink.backend.model.enums.ResponseStatus;
import com.redlink.backend.repository.DonationRepository;
import com.redlink.backend.support.IntegrationTest;
import com.redlink.backend.support.TestData;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.time.LocalDate;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// A7, A8: the admin sees every hospital's requests, read-only, with replies and donations
@IntegrationTest
class AdminRequestIntegrationTest {

    @Autowired private MockMvc mvc;
    @Autowired private TestData testData;
    @Autowired private DonationRepository donationRepository;

    private String admin;
    private Hospital colombo;
    private Hospital kandy;
    private User colomboStaff;
    private User kandyStaff;

    @BeforeEach
    void setUp() {
        admin = testData.bearer(testData.admin());
        colombo = testData.hospital(HospitalStatus.APPROVED);
        kandy = testData.hospital(HospitalStatus.APPROVED);
        colomboStaff = testData.staff(colombo);
        kandyStaff = testData.staff(kandy);
    }

    @Test
    void everyHospitalsRequestsNewestFirstWithCounts() throws Exception {
        BloodRequest first = testData.bloodRequest(colomboStaff, BloodGroup.A_POS, "Colombo");
        BloodRequest second = testData.bloodRequest(kandyStaff, BloodGroup.O_NEG, "Kandy");
        testData.response(second, testData.donor(BloodGroup.O_NEG, "Kandy", null), ResponseStatus.ACCEPTED);

        mvc.perform(get("/api/admin/requests").header("Authorization", admin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(second.getId()))
                .andExpect(jsonPath("$[0].hospitalName").value(kandy.getName()))
                .andExpect(jsonPath("$[0].coming").value(1))
                .andExpect(jsonPath("$[1].id").value(first.getId()))
                .andExpect(jsonPath("$[1].hospitalId").value(colombo.getId()))
                .andExpect(jsonPath("$[1].coming").value(0));
    }

    @Test
    void oneRequestWithItsRepliesAndDonations() throws Exception {
        BloodRequest request = testData.bloodRequest(colomboStaff, BloodGroup.A_POS, "Colombo");
        Donor gave = testData.donor(BloodGroup.A_POS, "Colombo", null);
        Donor declined = testData.donor(BloodGroup.O_POS, "Colombo", null);
        testData.response(request, gave, ResponseStatus.ACCEPTED);
        testData.response(request, declined, ResponseStatus.DECLINED);
        request.setStatus(RequestStatus.FULFILLED);
        request.setClosedAt(Instant.now());
        Donation donation = new Donation();
        donation.setDonor(gave);
        donation.setHospital(colombo);
        donation.setRequest(request);
        donation.setDonationDate(LocalDate.now());
        donationRepository.saveAndFlush(donation);

        mvc.perform(get("/api/admin/requests/{id}", request.getId()).header("Authorization", admin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.request.reference").value("RQ-" + request.getId()))
                .andExpect(jsonPath("$.request.status").value("FULFILLED"))
                .andExpect(jsonPath("$.request.hospitalName").value(colombo.getName()))
                .andExpect(jsonPath("$.hospitalId").value(colombo.getId()))
                .andExpect(jsonPath("$.hospitalPhone").value("0115577111"))
                .andExpect(jsonPath("$.responses.length()").value(2))
                .andExpect(jsonPath("$.responses[0].donorId").value(gave.getId()))
                .andExpect(jsonPath("$.responses[0].status").value("ACCEPTED"))
                .andExpect(jsonPath("$.responses[1].status").value("DECLINED"))
                .andExpect(jsonPath("$.donatedDonorIds[0]").value(gave.getId()));
    }

    @Test
    void unknownRequestIs404() throws Exception {
        mvc.perform(get("/api/admin/requests/{id}", Long.MAX_VALUE).header("Authorization", admin))
                .andExpect(status().isNotFound());
    }

    @Test
    void adminsCanLookButNotChange() throws Exception {
        BloodRequest request = testData.bloodRequest(colomboStaff, BloodGroup.A_POS, "Colombo");

        // Staff endpoints stay staff-only
        mvc.perform(patch("/api/requests/{id}/status", request.getId()).header("Authorization", admin)
                        .contentType("application/json").content("{\"status\":\"CANCELLED\"}"))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/admin/requests").header("Authorization", testData.bearer(colomboStaff)))
                .andExpect(status().isForbidden());
    }
}
