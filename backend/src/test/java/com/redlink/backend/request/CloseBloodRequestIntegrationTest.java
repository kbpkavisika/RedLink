package com.redlink.backend.request;

import com.redlink.backend.model.BloodRequest;
import com.redlink.backend.model.Donation;
import com.redlink.backend.model.Donor;
import com.redlink.backend.model.User;
import com.redlink.backend.model.enums.BloodGroup;
import com.redlink.backend.model.enums.HospitalStatus;
import com.redlink.backend.model.enums.RequestStatus;
import com.redlink.backend.model.enums.ResponseStatus;
import com.redlink.backend.repository.BloodRequestRepository;
import com.redlink.backend.repository.DonationRepository;
import com.redlink.backend.repository.DonorRepository;
import com.redlink.backend.support.IntegrationTest;
import com.redlink.backend.support.TestData;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.Arrays;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// H8, H9: fulfilling records donations and restarts donors' 90-day clocks; cancelling records none; both are final
@IntegrationTest
class CloseBloodRequestIntegrationTest {

    @Autowired private MockMvc mvc;
    @Autowired private TestData testData;
    @Autowired private BloodRequestRepository bloodRequestRepository;
    @Autowired private DonationRepository donationRepository;
    @Autowired private DonorRepository donorRepository;

    private final LocalDate today = LocalDate.now(ZoneOffset.UTC);
    private User staff;
    private BloodRequest request;
    private Donor came;
    private Donor alsoCame;

    @BeforeEach
    void setUp() {
        staff = testData.staff(testData.hospital(HospitalStatus.APPROVED));
        request = testData.bloodRequest(staff, BloodGroup.O_POS, "Colombo");
        came = testData.donor(BloodGroup.O_POS, "Colombo", today.minusDays(200));
        alsoCame = testData.donor(BloodGroup.O_NEG, "Colombo", null);
        testData.response(request, came, ResponseStatus.ACCEPTED);
        testData.response(request, alsoCame, ResponseStatus.ACCEPTED);
    }

    private ResultActions close(User who, BloodRequest closing, String body) throws Exception {
        return mvc.perform(patch("/api/requests/{id}/status", closing.getId())
                .header("Authorization", testData.bearer(who))
                .contentType("application/json").content(body));
    }

    private String fulfil(Donor... donors) {
        String ids = String.join(",", Arrays.stream(donors).map(d -> d.getId().toString()).toList());
        return "{\"status\":\"FULFILLED\",\"donorIds\":[" + ids + "]}";
    }

    @Test
    void fulfillingRecordsADonationPerDonorAndRestartsTheirClock() throws Exception {
        close(staff, request, fulfil(came, alsoCame))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.request.status").value("FULFILLED"))
                .andExpect(jsonPath("$.request.closedAt").isNotEmpty());

        List<Donation> donations = donationRepository.findByRequestId(request.getId());
        assertThat(donations).hasSize(2).allSatisfy(donation -> {
            assertThat(donation.getDonationDate()).isEqualTo(today);
            assertThat(donation.getUnits()).isEqualTo(1);
            assertThat(donation.getHospital().getId()).isEqualTo(staff.getHospital().getId());
        });
        assertThat(donations).extracting(donation -> donation.getDonor().getId())
                .containsExactlyInAnyOrder(came.getId(), alsoCame.getId());
        assertThat(donorRepository.findById(came.getId()).orElseThrow().getLastDonationDate()).isEqualTo(today);
        assertThat(donorRepository.findById(alsoCame.getId()).orElseThrow().getLastDonationDate()).isEqualTo(today);

        // Their 90-day clock restarted: they can't accept requests again until then
        mvc.perform(get("/api/donor/me").header("Authorization", testData.bearer(came.getUser())))
                .andExpect(jsonPath("$.eligible").value(false))
                .andExpect(jsonPath("$.nextEligibleDate").value(today.plusDays(90).toString()));
    }

    @Test
    void staffPickWhoActuallyCame() throws Exception {
        close(staff, request, fulfil(came, came)).andExpect(status().isOk()); // a repeated id counts once

        assertThat(donationRepository.findByRequestId(request.getId())).hasSize(1);
        assertThat(donorRepository.findById(alsoCame.getId()).orElseThrow().getLastDonationDate()).isNull();
    }

    @Test
    void onlyDonorsWhoAcceptedCanBeMarkedAsDonated() throws Exception {
        Donor declined = testData.donor(BloodGroup.O_POS, "Colombo", null);
        Donor withdrew = testData.donor(BloodGroup.O_POS, "Colombo", null);
        Donor neverReplied = testData.donor(BloodGroup.O_POS, "Colombo", null);
        testData.response(request, declined, ResponseStatus.DECLINED);
        testData.response(request, withdrew, ResponseStatus.WITHDRAWN);

        for (Donor wrong : List.of(declined, withdrew, neverReplied)) {
            close(staff, request, fulfil(came, wrong))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.fieldErrors[0].field").value("donorIds"));
        }

        assertThat(donationRepository.findByRequestId(request.getId())).isEmpty();
        assertThat(bloodRequestRepository.findById(request.getId()).orElseThrow().getStatus()).isEqualTo(RequestStatus.OPEN);
    }

    @Test
    void fulfillingNeedsAtLeastOneDonor() throws Exception {
        close(staff, request, "{\"status\":\"FULFILLED\",\"donorIds\":[]}")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors[0].field").value("donorIds"));
        close(staff, request, "{\"status\":\"FULFILLED\"}").andExpect(status().isBadRequest());
    }

    @Test
    void cancellingRecordsNoDonations() throws Exception {
        close(staff, request, "{\"status\":\"CANCELLED\"}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.request.status").value("CANCELLED"))
                .andExpect(jsonPath("$.request.closedAt").isNotEmpty());

        assertThat(donationRepository.findByRequestId(request.getId())).isEmpty();
        assertThat(donorRepository.findById(came.getId()).orElseThrow().getLastDonationDate()).isEqualTo(today.minusDays(200));

        close(staff, request, fulfil(came)).andExpect(status().isConflict());
    }

    @Test
    void aCancelledRequestCantListDonors() throws Exception {
        close(staff, request, "{\"status\":\"CANCELLED\",\"donorIds\":[" + came.getId() + "]}")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors[0].field").value("donorIds"));
    }

    @Test
    void closingIsFinal() throws Exception {
        close(staff, request, fulfil(came)).andExpect(status().isOk());

        close(staff, request, "{\"status\":\"CANCELLED\"}")
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("This request is already closed."));
        close(staff, request, "{\"status\":\"OPEN\"}")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors[0].field").value("status"));
        close(staff, request, "{\"status\":\"EXPIRED\"}").andExpect(status().isBadRequest());
    }

    @Test
    void aClosedRequestTakesNoMoreReplies() throws Exception {
        Donor late = testData.donor(BloodGroup.O_POS, "Colombo", null);
        close(staff, request, "{\"status\":\"CANCELLED\"}").andExpect(status().isOk());

        mvc.perform(post("/api/requests/{id}/responses", request.getId())
                        .header("Authorization", testData.bearer(late.getUser()))
                        .contentType("application/json").content("{\"status\":\"ACCEPTED\"}"))
                .andExpect(status().isConflict());
    }

    @Test
    void onlyTheRequestsOwnHospitalCanCloseIt() throws Exception {
        User otherStaff = testData.staff(testData.hospital(HospitalStatus.APPROVED));

        close(otherStaff, request, "{\"status\":\"CANCELLED\"}").andExpect(status().isNotFound());
        close(came.getUser(), request, "{\"status\":\"CANCELLED\"}").andExpect(status().isForbidden());
        assertThat(bloodRequestRepository.findById(request.getId()).orElseThrow().getStatus()).isEqualTo(RequestStatus.OPEN);
    }
}
