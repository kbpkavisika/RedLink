package com.redlink.backend.request;

import com.jayway.jsonpath.JsonPath;
import com.redlink.backend.model.BloodRequest;
import com.redlink.backend.model.Donor;
import com.redlink.backend.model.User;
import com.redlink.backend.model.enums.BloodGroup;
import com.redlink.backend.model.enums.HospitalStatus;
import com.redlink.backend.model.enums.RequestStatus;
import com.redlink.backend.model.enums.Role;
import com.redlink.backend.support.IntegrationTest;
import com.redlink.backend.support.TestData;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.Arrays;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.everyItem;
import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * GET /api/requests/{id} and /matches (H5, H12). Requests are for a city no other row uses, so this
 * test's donors are the top matches; assertions only look at this test's donors.
 */
@IntegrationTest
class ViewBloodRequestIntegrationTest {

    @Autowired private MockMvc mvc;
    @Autowired private TestData testData;

    private final LocalDate today = LocalDate.now(ZoneOffset.UTC);
    private User staff;
    private String city;

    @BeforeEach
    void setUp() {
        staff = testData.staff(testData.hospital(HospitalStatus.APPROVED));
        city = testData.unique("City");
    }

    private ResultActions as(User user, MockHttpServletRequestBuilder request) throws Exception {
        return mvc.perform(request.header("Authorization", testData.bearer(user)));
    }

    // The matched donor ids from a /matches response, limited to the given donors, in order
    private List<Long> ids(ResultActions result, Donor... mine) throws Exception {
        List<Number> all = JsonPath.read(result.andReturn().getResponse().getContentAsString(), "$[*].donorId");
        List<Long> wanted = Arrays.stream(mine).map(Donor::getId).toList();
        return all.stream().map(Number::longValue).filter(wanted::contains).toList();
    }

    @Test
    void staffSeeTheirRequestAndHowManyDonorsWereNotified() throws Exception {
        testData.donor(BloodGroup.B_NEG, city, null);
        testData.donor(BloodGroup.B_NEG, city, null);
        String posted = as(staff, post("/api/requests").contentType("application/json").content("""
                {"bloodGroup":"B-","unitsNeeded":1,"urgency":"LOW","city":"%s","neededBy":"%s"}"""
                .formatted(city, Instant.now().plus(Duration.ofDays(1)))))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        long id = ((Number) JsonPath.read(posted, "$.request.id")).longValue();

        as(staff, get("/api/requests/{id}", id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.request.reference").value("RQ-" + id))
                .andExpect(jsonPath("$.request.bloodGroup").value("B-"))
                .andExpect(jsonPath("$.request.hospitalName").value(staff.getHospital().getName()))
                .andExpect(jsonPath("$.notifiedCount").value(2))
                .andExpect(jsonPath("$.donatedDonorIds").isEmpty());
    }

    @Test
    void matchesComeBackRankedWithWhyTheyRankThere() throws Exception {
        BloodRequest request = testData.bloodRequest(staff, BloodGroup.A_POS, city);
        Donor substitute = testData.donor(BloodGroup.O_NEG, city, null);
        Donor exactRecent = testData.donor(BloodGroup.A_POS, city, today.minusDays(100));
        Donor exactLongAgo = testData.donor(BloodGroup.A_POS, city, today.minusDays(300));

        ResultActions result = as(staff, get("/api/requests/{id}/matches", request.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].donorId").value(exactLongAgo.getId()))
                .andExpect(jsonPath("$[0].exactMatch").value(true))
                .andExpect(jsonPath("$[0].sameCity").value(true))
                .andExpect(jsonPath("$[0].daysSinceLastDonation").value(300))
                .andExpect(jsonPath("$[0].phone").value("0771234567"));

        assertThat(ids(result, substitute, exactRecent, exactLongAgo))
                .containsExactly(exactLongAgo.getId(), exactRecent.getId(), substitute.getId());
    }

    @Test
    void bloodGroupFilterKeepsTheOrder() throws Exception {
        BloodRequest request = testData.bloodRequest(staff, BloodGroup.A_POS, city);
        Donor exact = testData.donor(BloodGroup.A_POS, city, null);
        Donor oNegFirst = testData.donor(BloodGroup.O_NEG, city, today.minusDays(400));
        Donor oNegSecond = testData.donor(BloodGroup.O_NEG, city, today.minusDays(200));

        ResultActions result = as(staff, get("/api/requests/{id}/matches", request.getId()).param("bloodGroup", "O-"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].bloodGroup").value(everyItem(is("O-"))));
        assertThat(ids(result, exact, oNegFirst, oNegSecond)).containsExactly(oNegFirst.getId(), oNegSecond.getId());
    }

    @Test
    void anUnencodedPlusStillMeansPositive() throws Exception {
        BloodRequest request = testData.bloodRequest(staff, BloodGroup.A_POS, city);
        Donor aPos = testData.donor(BloodGroup.A_POS, city, null);

        // "?bloodGroup=A+" arrives as "A " because "+" means a space in a query string
        ResultActions result = as(staff, get("/api/requests/{id}/matches", request.getId()).param("bloodGroup", "A "))
                .andExpect(status().isOk());
        assertThat(ids(result, aPos)).containsExactly(aPos.getId());
    }

    @Test
    void cityFilterIgnoresCase() throws Exception {
        BloodRequest request = testData.bloodRequest(staff, BloodGroup.O_POS, city);
        Donor here = testData.donor(BloodGroup.O_POS, city, null);
        Donor elsewhere = testData.donor(BloodGroup.O_POS, testData.unique("Elsewhere"), null);

        ResultActions result = as(staff, get("/api/requests/{id}/matches", request.getId())
                .param("city", "  " + city.toUpperCase() + " "))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].sameCity").value(everyItem(is(true))));
        assertThat(ids(result, here, elsewhere)).containsExactly(here.getId());
    }

    @Test
    void unknownBloodGroupIs400() throws Exception {
        BloodRequest request = testData.bloodRequest(staff, BloodGroup.O_POS, city);

        as(staff, get("/api/requests/{id}/matches", request.getId()).param("bloodGroup", "C+"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors[0].field").value("bloodGroup"));
    }

    @Test
    void closedRequestsHaveNoMatches() throws Exception {
        BloodRequest request = testData.bloodRequest(staff, BloodGroup.O_POS, city);
        testData.donor(BloodGroup.O_POS, city, null);
        request.setStatus(RequestStatus.CANCELLED);
        request.setClosedAt(Instant.now());

        as(staff, get("/api/requests/{id}/matches", request.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isEmpty());
    }

    @Test
    void otherHospitalsRequestsAreNotFound() throws Exception {
        BloodRequest request = testData.bloodRequest(staff, BloodGroup.O_POS, city);
        User otherStaff = testData.staff(testData.hospital(HospitalStatus.APPROVED));

        as(otherStaff, get("/api/requests/{id}", request.getId()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Request RQ-%d was not found.".formatted(request.getId())));
        as(otherStaff, get("/api/requests/{id}/matches", request.getId())).andExpect(status().isNotFound());
        as(staff, get("/api/requests/{id}", Long.MAX_VALUE)).andExpect(status().isNotFound());
    }

    @Test
    void donorsAndAdminsCantViewRequests() throws Exception {
        BloodRequest request = testData.bloodRequest(staff, BloodGroup.O_POS, city);

        as(testData.user("kamal", Role.DONOR), get("/api/requests/{id}/matches", request.getId()))
                .andExpect(status().isForbidden());
        as(testData.admin(), get("/api/requests/{id}", request.getId())).andExpect(status().isForbidden());
    }
}
