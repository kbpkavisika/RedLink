package com.redlink.backend.request;

import com.jayway.jsonpath.JsonPath;
import com.redlink.backend.model.BloodRequest;
import com.redlink.backend.model.Donor;
import com.redlink.backend.model.Notification;
import com.redlink.backend.model.User;
import com.redlink.backend.model.enums.BloodGroup;
import com.redlink.backend.model.enums.HospitalStatus;
import com.redlink.backend.model.enums.RequestStatus;
import com.redlink.backend.model.enums.Role;
import com.redlink.backend.repository.BloodRequestRepository;
import com.redlink.backend.repository.NotificationRepository;
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
import java.time.ZoneOffset;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * POST /api/requests (H3, H4, H6) through the whole app. Each test's request is for a city no other row uses,
 * so this test's donors are the best matches (exact group + same city) whatever else is in redLink_test.
 */
@IntegrationTest
class PostBloodRequestIntegrationTest {

    @Autowired private MockMvc mvc;
    @Autowired private TestData testData;
    @Autowired private BloodRequestRepository bloodRequestRepository;
    @Autowired private NotificationRepository notificationRepository;

    private User staff;
    private String city;

    @BeforeEach
    void setUp() {
        staff = testData.staff(testData.hospital(HospitalStatus.APPROVED));
        city = testData.unique("City");
    }

    private String json(String bloodGroup, int units, String urgency, Instant neededBy) {
        return """
                {"bloodGroup":"%s","unitsNeeded":%d,"urgency":"%s","city":" %s ","neededBy":"%s"}"""
                .formatted(bloodGroup, units, urgency, city, neededBy);
    }

    private Instant tomorrow() {
        return Instant.now().plus(Duration.ofDays(1));
    }

    private ResultActions postAs(User user, String body) throws Exception {
        return mvc.perform(post("/api/requests")
                .header("Authorization", testData.bearer(user))
                .contentType("application/json").content(body));
    }

    @Test
    void postingSavesAnOpenRequestAndNotifiesTheTopMatches() throws Exception {
        LocalDate today = LocalDate.now(ZoneOffset.UTC);
        Donor neverDonated = testData.donor(BloodGroup.A_POS, city, null);
        Donor longAgo = testData.donor(BloodGroup.A_POS, city, today.minusDays(200));
        Donor lessLongAgo = testData.donor(BloodGroup.A_POS, city, today.minusDays(100));

        // LOW Ã— 1 unit = 2 donors notified: the two best of these three
        String body = postAs(staff, json("A+", 1, "LOW", tomorrow()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.request.bloodGroup").value("A+"))
                .andExpect(jsonPath("$.request.unitsNeeded").value(1))
                .andExpect(jsonPath("$.request.urgency").value("LOW"))
                .andExpect(jsonPath("$.request.city").value(city))
                .andExpect(jsonPath("$.request.status").value("OPEN"))
                .andExpect(jsonPath("$.request.closedAt").doesNotExist())
                .andExpect(jsonPath("$.request.hospitalName").value(staff.getHospital().getName()))
                .andExpect(jsonPath("$.request.createdBy").value("Test Staff"))
                .andExpect(jsonPath("$.matchCount").value(greaterThanOrEqualTo(3)))
                .andExpect(jsonPath("$.notifiedCount").value(2))
                .andReturn().getResponse().getContentAsString();

        long id = ((Number) JsonPath.read(body, "$.request.id")).longValue();
        assertThat((String) JsonPath.read(body, "$.request.reference")).isEqualTo("RQ-" + id);

        BloodRequest saved = bloodRequestRepository.findById(id).orElseThrow();
        assertThat(saved.getStatus()).isEqualTo(RequestStatus.OPEN);
        assertThat(saved.getCreatedBy().getId()).isEqualTo(staff.getId());
        assertThat(saved.getHospital().getId()).isEqualTo(staff.getHospital().getId());

        assertThat(notificationRepository.findByRequestIdOrderById(id))
                .extracting(notification -> notification.getUser().getId())
                .containsExactly(neverDonated.getUser().getId(), longAgo.getUser().getId());
        assertThat(lessLongAgo.getUser().getId()).isNotIn(
                notificationRepository.findByRequestIdOrderById(id).stream().map(n -> n.getUser().getId()).toList());
    }

    @Test
    void notificationSaysWhoNeedsWhatAndWhere() throws Exception {
        testData.donor(BloodGroup.O_NEG, city, null);

        String body = postAs(staff, json("O-", 2, "CRITICAL", tomorrow()))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        long id = ((Number) JsonPath.read(body, "$.request.id")).longValue();
        Notification first = notificationRepository.findByRequestIdOrderById(id).getFirst();
        assertThat(first.getMessage()).isEqualTo("Critical: %s needs 2 units of O- in %s. Request #RQ-%d."
                .formatted(staff.getHospital().getName(), city, id));
        assertThat(first.isRead()).isFalse();
    }

    @Test
    void notifiedCountIsCappedAndNeverMoreThanTheMatches() throws Exception {
        testData.donor(BloodGroup.O_POS, city, null);

        // CRITICAL Ã— 4 units = 32 wanted, capped at 25, and never more than the matches there are
        String body = postAs(staff, json("O+", 4, "CRITICAL", tomorrow()))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        int matches = JsonPath.read(body, "$.matchCount");
        int notified = JsonPath.read(body, "$.notifiedCount");
        long id = ((Number) JsonPath.read(body, "$.request.id")).longValue();
        assertThat(notified).isEqualTo(Math.min(25, matches));
        assertThat(notificationRepository.findByRequestIdOrderById(id)).hasSize(notified);
    }

    @Test
    void pendingAndRejectedHospitalsCantPost() throws Exception {
        User pending = testData.staff(testData.hospital(HospitalStatus.PENDING));
        User rejected = testData.staff(testData.hospital(HospitalStatus.REJECTED));
        long before = bloodRequestRepository.count();

        postAs(pending, json("A+", 1, "HIGH", tomorrow()))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("Posting unlocks after an admin approves your hospital."));
        postAs(rejected, json("A+", 1, "HIGH", tomorrow()))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value(
                        "Your hospital's registration wasn't approved, so it can't post requests."));

        assertThat(bloodRequestRepository.count()).isEqualTo(before);
    }

    @Test
    void onlyHospitalStaffCanPost() throws Exception {
        postAs(testData.user("kamal", Role.DONOR), json("A+", 1, "LOW", tomorrow())).andExpect(status().isForbidden());
        postAs(testData.admin(), json("A+", 1, "LOW", tomorrow())).andExpect(status().isForbidden());
        mvc.perform(post("/api/requests").contentType("application/json").content(json("A+", 1, "LOW", tomorrow())))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void missingFieldsAreAllReported() throws Exception {
        postAs(staff, "{}")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors[*].field").value(containsInAnyOrder(
                        "bloodGroup", "unitsNeeded", "urgency", "city", "neededBy")));
    }

    @Test
    void unitsMustBe1To20() throws Exception {
        postAs(staff, json("A+", 0, "LOW", tomorrow()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors[0].field").value("unitsNeeded"));
        postAs(staff, json("A+", 21, "LOW", tomorrow()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors[0].field").value("unitsNeeded"));
    }

    @Test
    void neededByMustBeInTheFuture() throws Exception {
        postAs(staff, json("A+", 1, "LOW", Instant.now().minus(Duration.ofMinutes(5))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors[0].field").value("neededBy"));
    }

    @Test
    void unknownUrgencyIs400() throws Exception {
        postAs(staff, json("A+", 1, "SOON", tomorrow())).andExpect(status().isBadRequest());
    }
}
