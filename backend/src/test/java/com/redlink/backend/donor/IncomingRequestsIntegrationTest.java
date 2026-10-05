package com.redlink.backend.donor;

import com.jayway.jsonpath.JsonPath;
import com.redlink.backend.model.BloodRequest;
import com.redlink.backend.model.Donor;
import com.redlink.backend.model.User;
import com.redlink.backend.model.enums.BloodGroup;
import com.redlink.backend.model.enums.HospitalStatus;
import com.redlink.backend.model.enums.RequestStatus;
import com.redlink.backend.model.enums.ResponseStatus;
import com.redlink.backend.model.enums.Urgency;
import com.redlink.backend.support.IntegrationTest;
import com.redlink.backend.support.TestData;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Duration;
import java.time.Instant;
import java.util.Arrays;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * D5: GET /api/donor/requests. Other open requests may exist in redLink_test, so each test
 * only looks at the requests it created.
 */
@IntegrationTest
class IncomingRequestsIntegrationTest {

    @Autowired private MockMvc mvc;
    @Autowired private TestData testData;

    private User staff;
    private String city;

    @BeforeEach
    void setUp() {
        staff = testData.staff(testData.hospital(HospitalStatus.APPROVED));
        city = testData.unique("City");
    }

    private BloodRequest request(BloodGroup group, String requestCity, Urgency urgency, Duration neededIn) {
        BloodRequest request = testData.bloodRequest(staff, group, requestCity);
        request.setUrgency(urgency);
        request.setNeededBy(Instant.now().plus(neededIn));
        return request;
    }

    private List<Map<String, Object>> incoming(Donor donor) throws Exception {
        String body = mvc.perform(get("/api/donor/requests").header("Authorization", testData.bearer(donor.getUser())))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return JsonPath.read(body, "$");
    }

    // The ids from the response that belong to the given requests, in the order the API returned them
    private List<Long> ids(List<Map<String, Object>> incoming, BloodRequest... mine) {
        List<Long> wanted = Arrays.stream(mine).map(BloodRequest::getId).toList();
        return incoming.stream()
                .map(item -> ((Number) item.get("requestId")).longValue())
                .filter(wanted::contains)
                .toList();
    }

    private Map<String, Object> item(List<Map<String, Object>> incoming, BloodRequest request) {
        return incoming.stream()
                .filter(item -> ((Number) item.get("requestId")).longValue() == request.getId())
                .findFirst().orElseThrow();
    }

    @Test
    void onlyRequestsTheDonorsGroupCanGiveTo() throws Exception {
        Donor oPos = testData.donor(BloodGroup.O_POS, city, null);
        BloodRequest forOPos = request(BloodGroup.O_POS, city, Urgency.MEDIUM, Duration.ofDays(1));
        BloodRequest forAPos = request(BloodGroup.A_POS, city, Urgency.MEDIUM, Duration.ofDays(1));
        BloodRequest forONeg = request(BloodGroup.O_NEG, city, Urgency.MEDIUM, Duration.ofDays(1));   // O+ can't give to O−
        BloodRequest forAbNeg = request(BloodGroup.AB_NEG, city, Urgency.MEDIUM, Duration.ofDays(1)); // nor to AB−

        List<Map<String, Object>> incoming = incoming(oPos);

        assertThat(ids(incoming, forOPos, forAPos, forONeg, forAbNeg))
                .containsExactlyInAnyOrder(forOPos.getId(), forAPos.getId());
        assertThat(item(incoming, forOPos).get("exactMatch")).isEqualTo(true);
        assertThat(item(incoming, forAPos).get("exactMatch")).isEqualTo(false);
    }

    @Test
    void criticalFirstThenOwnCityThenSoonestDeadline() throws Exception {
        Donor donor = testData.donor(BloodGroup.O_NEG, city, null);
        BloodRequest lowHereSoon = request(BloodGroup.B_POS, city, Urgency.LOW, Duration.ofHours(6));
        BloodRequest criticalElsewhere = request(BloodGroup.A_POS, testData.unique("Far"), Urgency.CRITICAL, Duration.ofDays(3));
        BloodRequest highElsewhere = request(BloodGroup.O_POS, testData.unique("Far"), Urgency.HIGH, Duration.ofHours(2));
        BloodRequest highHereLater = request(BloodGroup.AB_POS, city, Urgency.HIGH, Duration.ofDays(2));
        BloodRequest highHereSooner = request(BloodGroup.AB_NEG, city, Urgency.HIGH, Duration.ofDays(1));

        assertThat(ids(incoming(donor), lowHereSoon, criticalElsewhere, highElsewhere, highHereLater, highHereSooner))
                .containsExactly(criticalElsewhere.getId(), highHereSooner.getId(), highHereLater.getId(),
                        highElsewhere.getId(), lowHereSoon.getId());
    }

    @Test
    void closedAndOverdueRequestsAreLeftOut() throws Exception {
        Donor donor = testData.donor(BloodGroup.O_NEG, city, null);
        BloodRequest open = request(BloodGroup.A_POS, city, Urgency.HIGH, Duration.ofDays(1));
        BloodRequest cancelled = request(BloodGroup.A_POS, city, Urgency.HIGH, Duration.ofDays(1));
        cancelled.setStatus(RequestStatus.CANCELLED);
        cancelled.setClosedAt(Instant.now());
        BloodRequest overdue = request(BloodGroup.A_POS, city, Urgency.HIGH, Duration.ofMinutes(-30));

        assertThat(ids(incoming(donor), open, cancelled, overdue)).containsExactly(open.getId());
    }

    @Test
    void showsTheHospitalAndTheDonorsOwnReply() throws Exception {
        Donor donor = testData.donor(BloodGroup.B_NEG, city, null);
        BloodRequest accepted = request(BloodGroup.B_NEG, city, Urgency.MEDIUM, Duration.ofDays(1));
        BloodRequest notYet = request(BloodGroup.B_POS, city, Urgency.MEDIUM, Duration.ofDays(1));
        testData.response(accepted, donor, ResponseStatus.ACCEPTED);

        List<Map<String, Object>> incoming = incoming(donor);

        Map<String, Object> first = item(incoming, accepted);
        assertThat(first.get("reference")).isEqualTo("RQ-" + accepted.getId());
        assertThat(first.get("hospitalName")).isEqualTo(staff.getHospital().getName());
        assertThat(first.get("hospitalAddress")).isEqualTo("1 Test Rd");
        assertThat(first.get("hospitalPhone")).isEqualTo("0115577111");
        assertThat(first.get("sameCity")).isEqualTo(true);
        assertThat(first.get("myResponse")).isEqualTo("ACCEPTED");
        assertThat(first.get("respondedAt")).isNotNull();
        assertThat(item(incoming, notYet).get("myResponse")).isNull();
    }

    @Test
    void onlyDonorsHaveIncomingRequests() throws Exception {
        mvc.perform(get("/api/donor/requests").header("Authorization", testData.bearer(staff)))
                .andExpect(status().isForbidden());
    }
}
