package com.redlink.backend.request;

import com.redlink.backend.model.BloodRequest;
import com.redlink.backend.model.Donation;
import com.redlink.backend.model.Donor;
import com.redlink.backend.model.Hospital;
import com.redlink.backend.model.User;
import com.redlink.backend.model.enums.BloodGroup;
import com.redlink.backend.model.enums.HospitalStatus;
import com.redlink.backend.model.enums.RequestStatus;
import com.redlink.backend.model.enums.ResponseStatus;
import com.redlink.backend.model.enums.Role;
import com.redlink.backend.model.enums.Urgency;
import com.redlink.backend.repository.BloodRequestRepository;
import com.redlink.backend.repository.DonationRepository;
import com.redlink.backend.support.IntegrationTest;
import com.redlink.backend.support.TestData;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// H11: GET /api/requests, the hospital's own requests with reply and donation counts and the dashboard numbers
@IntegrationTest
class HospitalRequestListIntegrationTest {

    @Autowired private MockMvc mvc;
    @Autowired private TestData testData;
    @Autowired private BloodRequestRepository bloodRequestRepository;
    @Autowired private DonationRepository donationRepository;

    private Hospital hospital;
    private User staff;

    @BeforeEach
    void setUp() {
        hospital = testData.hospital(HospitalStatus.APPROVED);
        staff = testData.staff(hospital);
    }

    private ResultActions list(User user) throws Exception {
        return mvc.perform(get("/api/requests").header("Authorization", testData.bearer(user)));
    }

    private BloodRequest request(Urgency urgency) {
        BloodRequest request = testData.bloodRequest(staff, BloodGroup.A_POS, "Colombo");
        request.setUrgency(urgency);
        return request;
    }

    private void close(BloodRequest request, RequestStatus status, Instant when) {
        request.setStatus(status);
        request.setClosedAt(when);
        bloodRequestRepository.flush();
    }

    @Test
    void newHospitalHasNothingYet() throws Exception {
        list(staff)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.open").value(0))
                .andExpect(jsonPath("$.criticalOpen").value(0))
                .andExpect(jsonPath("$.fulfilledLast30Days").value(0))
                .andExpect(jsonPath("$.donorsComing").value(0))
                .andExpect(jsonPath("$.requests").isEmpty());
    }

    @Test
    void requestsComeNewestFirstWithReplyAndDonationCounts() throws Exception {
        BloodRequest older = request(Urgency.LOW);
        BloodRequest newer = request(Urgency.CRITICAL);
        Donor coming = testData.donor(BloodGroup.O_NEG, "Colombo", null);
        Donor alsoComing = testData.donor(BloodGroup.A_POS, "Colombo", null);
        Donor withdrew = testData.donor(BloodGroup.A_POS, "Colombo", null);
        Donor declined = testData.donor(BloodGroup.A_POS, "Colombo", null);
        testData.response(newer, coming, ResponseStatus.ACCEPTED);
        testData.response(newer, alsoComing, ResponseStatus.ACCEPTED);
        testData.response(newer, withdrew, ResponseStatus.WITHDRAWN);
        testData.response(newer, declined, ResponseStatus.DECLINED);

        list(staff)
                .andExpect(jsonPath("$.requests.length()").value(2))
                .andExpect(jsonPath("$.requests[0].id").value(newer.getId()))
                .andExpect(jsonPath("$.requests[0].reference").value("RQ-" + newer.getId()))
                .andExpect(jsonPath("$.requests[0].urgency").value("CRITICAL"))
                .andExpect(jsonPath("$.requests[0].createdBy").value("Test Staff"))
                .andExpect(jsonPath("$.requests[0].hospitalName").value(hospital.getName()))
                .andExpect(jsonPath("$.requests[0].coming").value(2))
                .andExpect(jsonPath("$.requests[0].withdrew").value(1))
                .andExpect(jsonPath("$.requests[0].declined").value(1))
                .andExpect(jsonPath("$.requests[0].donated").value(0))
                .andExpect(jsonPath("$.requests[1].id").value(older.getId()))
                .andExpect(jsonPath("$.requests[1].coming").value(0))
                .andExpect(jsonPath("$.open").value(2))
                .andExpect(jsonPath("$.criticalOpen").value(1))
                .andExpect(jsonPath("$.donorsComing").value(2));
    }

    @Test
    void dashboardNumbersOnlyCountWhatsStillOpenOrRecent() throws Exception {
        BloodRequest fulfilledRecently = request(Urgency.CRITICAL);
        BloodRequest fulfilledLongAgo = request(Urgency.HIGH);
        BloodRequest cancelled = request(Urgency.CRITICAL);
        Donor gave = testData.donor(BloodGroup.A_POS, "Colombo", null);
        testData.response(fulfilledRecently, gave, ResponseStatus.ACCEPTED);
        close(fulfilledRecently, RequestStatus.FULFILLED, Instant.now().minus(Duration.ofDays(2)));
        close(fulfilledLongAgo, RequestStatus.FULFILLED, Instant.now().minus(Duration.ofDays(45)));
        close(cancelled, RequestStatus.CANCELLED, Instant.now());
        Donation donation = new Donation();
        donation.setDonor(gave);
        donation.setHospital(hospital);
        donation.setRequest(fulfilledRecently);
        donation.setDonationDate(LocalDate.now());
        donationRepository.saveAndFlush(donation);

        list(staff)
                .andExpect(jsonPath("$.open").value(0))
                .andExpect(jsonPath("$.criticalOpen").value(0))
                .andExpect(jsonPath("$.fulfilledLast30Days").value(1))
                .andExpect(jsonPath("$.donorsComing").value(0)) // accepted, but on a closed request
                .andExpect(jsonPath("$.requests[?(@.id == %d)].donated".formatted(fulfilledRecently.getId())).value(1));
    }

    @Test
    void onlyYourOwnHospitalsRequests() throws Exception {
        request(Urgency.MEDIUM);
        User otherStaff = testData.staff(testData.hospital(HospitalStatus.APPROVED));

        list(otherStaff).andExpect(jsonPath("$.requests").isEmpty());
        list(testData.user("kamal", Role.DONOR)).andExpect(status().isForbidden());
        list(testData.admin()).andExpect(status().isForbidden());
    }
}
