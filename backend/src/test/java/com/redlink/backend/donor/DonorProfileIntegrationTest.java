package com.redlink.backend.donor;

import com.redlink.backend.model.Donor;
import com.redlink.backend.model.enums.BloodGroup;
import com.redlink.backend.model.enums.HospitalStatus;
import com.redlink.backend.repository.DonorRepository;
import com.redlink.backend.support.IntegrationTest;
import com.redlink.backend.support.TestData;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import java.time.LocalDate;
import java.time.ZoneOffset;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// D2, D3, D4: the signed-in donor's profile, eligibility and availability
@IntegrationTest
class DonorProfileIntegrationTest {

    @Autowired private MockMvc mvc;
    @Autowired private TestData testData;
    @Autowired private DonorRepository donorRepository;

    private final LocalDate today = LocalDate.now(ZoneOffset.UTC);

    private ResultActions as(Donor donor, MockHttpServletRequestBuilder request) throws Exception {
        return mvc.perform(request.header("Authorization", testData.bearer(donor.getUser())));
    }

    private MockHttpServletRequestBuilder json(MockHttpServletRequestBuilder request, String body) {
        return request.contentType("application/json").content(body);
    }

    @Test
    void neverDonatedMeansEligibleNow() throws Exception {
        Donor donor = testData.donor(BloodGroup.AB_NEG, "Kandy", null);

        as(donor, get("/api/donor/me"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(donor.getId()))
                .andExpect(jsonPath("$.email").value(donor.getUser().getEmail()))
                .andExpect(jsonPath("$.bloodGroup").value("AB-"))
                .andExpect(jsonPath("$.dateOfBirth").value("1995-04-12"))
                .andExpect(jsonPath("$.city").value("Kandy"))
                .andExpect(jsonPath("$.available").value(true))
                .andExpect(jsonPath("$.lastDonationDate").doesNotExist())
                .andExpect(jsonPath("$.daysSinceLastDonation").doesNotExist())
                .andExpect(jsonPath("$.eligible").value(true))
                .andExpect(jsonPath("$.nextEligibleDate").doesNotExist())
                .andExpect(jsonPath("$.daysBetweenDonations").value(90));
    }

    @Test
    void recentDonorSeesWhenTheyCanGiveAgain() throws Exception {
        Donor donor = testData.donor(BloodGroup.O_POS, "Colombo", today.minusDays(30));

        as(donor, get("/api/donor/me"))
                .andExpect(jsonPath("$.daysSinceLastDonation").value(30))
                .andExpect(jsonPath("$.eligible").value(false))
                .andExpect(jsonPath("$.nextEligibleDate").value(today.plusDays(60).toString()));
    }

    @Test
    void eligibleAgainOnTheNinetiethDay() throws Exception {
        Donor donor = testData.donor(BloodGroup.O_POS, "Colombo", today.minusDays(90));

        as(donor, get("/api/donor/me"))
                .andExpect(jsonPath("$.eligible").value(true))
                .andExpect(jsonPath("$.nextEligibleDate").doesNotExist());
    }

    @Test
    void switchingAvailabilityOffAndOnAgain() throws Exception {
        Donor donor = testData.donor(BloodGroup.A_POS, "Galle", null);

        as(donor, json(patch("/api/donor/me/availability"), """
                {"available":false}"""))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.available").value(false));
        assertThat(donorRepository.findById(donor.getId()).orElseThrow().isAvailable()).isFalse();

        as(donor, json(patch("/api/donor/me/availability"), """
                {"available":true}"""))
                .andExpect(jsonPath("$.available").value(true));
    }

    @Test
    void availabilityIsRequired() throws Exception {
        Donor donor = testData.donor(BloodGroup.A_POS, "Galle", null);

        as(donor, json(patch("/api/donor/me/availability"), "{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors[0].field").value("available"));
    }

    @Test
    void donorsEditTheirNamePhoneAndCityButNothingElse() throws Exception {
        Donor donor = testData.donor(BloodGroup.B_POS, "Jaffna", null);

        as(donor, json(patch("/api/donor/me"), """
                {"fullName":"  Kamal Perera ","phone":"077 987-6543","city":" Kurunegala ",
                 "bloodGroup":"O-","email":"sneaky@test.redlink.lk"}"""))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.fullName").value("Kamal Perera"))
                .andExpect(jsonPath("$.phone").value("0779876543"))
                .andExpect(jsonPath("$.city").value("Kurunegala"))
                .andExpect(jsonPath("$.bloodGroup").value("B+"))
                .andExpect(jsonPath("$.email").value(donor.getUser().getEmail()));
    }

    @Test
    void invalidProfileFieldsAreAllReported() throws Exception {
        Donor donor = testData.donor(BloodGroup.B_POS, "Jaffna", null);

        as(donor, json(patch("/api/donor/me"), """
                {"fullName":"","phone":"123","city":""}"""))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors[*].field").value(containsInAnyOrder("fullName", "phone", "city")));
    }

    @Test
    void onlyDonorsHaveADonorProfile() throws Exception {
        String staffToken = testData.bearer(testData.staff(testData.hospital(HospitalStatus.APPROVED)));
        String adminToken = testData.bearer(testData.admin());

        mvc.perform(get("/api/donor/me").header("Authorization", staffToken)).andExpect(status().isForbidden());
        mvc.perform(patch("/api/donor/me/availability").header("Authorization", adminToken)
                        .contentType("application/json").content("{\"available\":false}"))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/donor/me")).andExpect(status().isUnauthorized());
    }
}
