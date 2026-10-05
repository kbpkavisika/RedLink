package com.redlink.backend.donor;

import com.redlink.backend.model.BloodRequest;
import com.redlink.backend.model.Donation;
import com.redlink.backend.model.Donor;
import com.redlink.backend.model.Hospital;
import com.redlink.backend.model.User;
import com.redlink.backend.model.enums.BloodGroup;
import com.redlink.backend.model.enums.HospitalStatus;
import com.redlink.backend.model.enums.ResponseStatus;
import com.redlink.backend.repository.DonationRepository;
import com.redlink.backend.support.IntegrationTest;
import com.redlink.backend.support.TestData;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import java.time.LocalDate;
import java.time.ZoneOffset;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// D10: GET /api/donor/donations
@IntegrationTest
class DonationHistoryIntegrationTest {

    @Autowired private MockMvc mvc;
    @Autowired private TestData testData;
    @Autowired private DonationRepository donationRepository;

    private final LocalDate today = LocalDate.now(ZoneOffset.UTC);
    private User staff;
    private Hospital hospital;

    @BeforeEach
    void setUp() {
        hospital = testData.hospital(HospitalStatus.APPROVED);
        staff = testData.staff(hospital);
    }

    private ResultActions history(Donor donor) throws Exception {
        return mvc.perform(get("/api/donor/donations").header("Authorization", testData.bearer(donor.getUser())));
    }

    private Donation donation(Donor donor, BloodRequest request, LocalDate date) {
        Donation donation = new Donation();
        donation.setDonor(donor);
        donation.setHospital(hospital);
        donation.setRequest(request);
        donation.setDonationDate(date);
        return donationRepository.save(donation);
    }

    @Test
    void aNewDonorHasNoDonationsAndCanGive() throws Exception {
        Donor donor = testData.donor(BloodGroup.A_POS, "Kandy", null);

        history(donor)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalDonations").value(0))
                .andExpect(jsonPath("$.totalUnits").value(0))
                .andExpect(jsonPath("$.livesHelped").value(0))
                .andExpect(jsonPath("$.eligible").value(true))
                .andExpect(jsonPath("$.nextEligibleDate").doesNotExist())
                .andExpect(jsonPath("$.donations").isEmpty());
    }

    @Test
    void donationsComeNewestFirstWithHospitalAndRequest() throws Exception {
        Donor donor = testData.donor(BloodGroup.O_NEG, "Colombo", today.minusDays(30));
        Donor someoneElse = testData.donor(BloodGroup.O_NEG, "Colombo", null);
        BloodRequest request = testData.bloodRequest(staff, BloodGroup.A_POS, "Colombo");
        donation(donor, null, today.minusDays(400));
        Donation recent = donation(donor, request, today.minusDays(30));
        donation(someoneElse, request, today.minusDays(30));

        history(donor)
                .andExpect(jsonPath("$.totalDonations").value(2))
                .andExpect(jsonPath("$.totalUnits").value(2))
                .andExpect(jsonPath("$.livesHelped").value(2))
                .andExpect(jsonPath("$.eligible").value(false))
                .andExpect(jsonPath("$.nextEligibleDate").value(today.plusDays(60).toString()))
                .andExpect(jsonPath("$.donations.length()").value(2))
                .andExpect(jsonPath("$.donations[0].id").value(recent.getId()))
                .andExpect(jsonPath("$.donations[0].donationDate").value(today.minusDays(30).toString()))
                .andExpect(jsonPath("$.donations[0].hospitalName").value(hospital.getName()))
                .andExpect(jsonPath("$.donations[0].hospitalCity").value("Colombo"))
                .andExpect(jsonPath("$.donations[0].reference").value("RQ-" + request.getId()))
                .andExpect(jsonPath("$.donations[1].requestId").doesNotExist())
                .andExpect(jsonPath("$.donations[1].reference").doesNotExist());
    }

    @Test
    void fulfillingARequestAddsToTheDonorsHistory() throws Exception {
        Donor donor = testData.donor(BloodGroup.B_POS, "Galle", null);
        BloodRequest request = testData.bloodRequest(staff, BloodGroup.B_POS, "Galle");
        testData.response(request, donor, ResponseStatus.ACCEPTED);

        mvc.perform(patch("/api/requests/{id}/status", request.getId())
                        .header("Authorization", testData.bearer(staff))
                        .contentType("application/json")
                        .content("{\"status\":\"FULFILLED\",\"donorIds\":[" + donor.getId() + "]}"))
                .andExpect(status().isOk());

        history(donor)
                .andExpect(jsonPath("$.totalDonations").value(1))
                .andExpect(jsonPath("$.donations[0].reference").value("RQ-" + request.getId()))
                .andExpect(jsonPath("$.donations[0].donationDate").value(today.toString()))
                .andExpect(jsonPath("$.nextEligibleDate").value(today.plusDays(90).toString()));
    }

    @Test
    void onlyDonorsHaveAHistory() throws Exception {
        mvc.perform(get("/api/donor/donations").header("Authorization", testData.bearer(staff)))
                .andExpect(status().isForbidden());
    }
}
