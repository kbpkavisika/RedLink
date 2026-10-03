package com.redlink.backend.service;

import com.redlink.backend.dto.request.MatchedDonor;
import com.redlink.backend.model.BloodRequest;
import com.redlink.backend.model.Donor;
import com.redlink.backend.model.User;
import com.redlink.backend.model.enums.BloodGroup;
import com.redlink.backend.model.enums.HospitalStatus;
import com.redlink.backend.model.enums.ResponseStatus;
import com.redlink.backend.support.IntegrationTest;
import com.redlink.backend.support.TestData;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.Arrays;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The match filters against real PostgreSQL: compatible group, available, enabled, 90-day rule,
 * not yet responded. Other rows may exist in redLink_test, so each test only looks at its own donors.
 * Dates are relative to today (the app's Clock is UTC), because the Clock also signs tokens elsewhere.
 */
@IntegrationTest
class MatchingIntegrationTest {

    @Autowired private MatchingService matchingService;
    @Autowired private TestData testData;

    private final LocalDate today = LocalDate.now(ZoneOffset.UTC);
    private User staff;

    @BeforeEach
    void setUp() {
        staff = testData.staff(testData.hospital(HospitalStatus.APPROVED));
    }

    private LocalDate daysAgo(int days) {
        return today.minusDays(days);
    }

    // The matches for this request, limited to the given donors, in ranked order
    private List<Long> matchedIds(BloodRequest request, Donor... mine) {
        Set<Long> ids = Arrays.stream(mine).map(Donor::getId).collect(Collectors.toSet());
        return matchingService.findMatches(request).stream()
                .map(MatchedDonor::donorId)
                .filter(ids::contains)
                .toList();
    }

    @Test
    void onlyCompatibleBloodGroupsMatch() {
        BloodRequest request = testData.bloodRequest(staff, BloodGroup.A_POS, "Colombo");
        Donor aPos = testData.donor(BloodGroup.A_POS, "Colombo", null);
        Donor aNeg = testData.donor(BloodGroup.A_NEG, "Colombo", null);
        Donor oNeg = testData.donor(BloodGroup.O_NEG, "Colombo", null);
        Donor bPos = testData.donor(BloodGroup.B_POS, "Colombo", null);   // can't give to A+
        Donor abPos = testData.donor(BloodGroup.AB_POS, "Colombo", null); // can't give to A+

        assertThat(matchedIds(request, aPos, aNeg, oNeg, bPos, abPos))
                .containsExactlyInAnyOrder(aPos.getId(), aNeg.getId(), oNeg.getId());
    }

    @Test
    void unavailableDonorsAndDisabledAccountsAreLeftOut() {
        BloodRequest request = testData.bloodRequest(staff, BloodGroup.O_POS, "Kandy");
        Donor available = testData.donor(BloodGroup.O_POS, "Kandy", null);
        Donor unavailable = testData.donor(BloodGroup.O_POS, "Kandy", null);
        unavailable.setAvailable(false);
        Donor disabled = testData.donor(BloodGroup.O_POS, "Kandy", null);
        disabled.getUser().setEnabled(false);

        assertThat(matchedIds(request, available, unavailable, disabled)).containsExactly(available.getId());
    }

    @Test
    void the90DayRuleAtItsEdge() {
        BloodRequest request = testData.bloodRequest(staff, BloodGroup.B_POS, "Jaffna");
        Donor ninetyDays = testData.donor(BloodGroup.B_POS, "Jaffna", daysAgo(90));
        Donor eightyNineDays = testData.donor(BloodGroup.B_POS, "Jaffna", daysAgo(89));
        Donor yesterday = testData.donor(BloodGroup.B_POS, "Jaffna", daysAgo(1));
        Donor never = testData.donor(BloodGroup.B_POS, "Jaffna", null);

        assertThat(matchedIds(request, ninetyDays, eightyNineDays, yesterday, never))
                .containsExactlyInAnyOrder(ninetyDays.getId(), never.getId());
    }

    @Test
    void donorsWhoAlreadyRespondedToThisRequestAreLeftOut() {
        BloodRequest request = testData.bloodRequest(staff, BloodGroup.AB_NEG, "Galle");
        BloodRequest otherRequest = testData.bloodRequest(staff, BloodGroup.AB_NEG, "Galle");
        Donor accepted = testData.donor(BloodGroup.AB_NEG, "Galle", null);
        Donor declined = testData.donor(BloodGroup.AB_NEG, "Galle", null);
        Donor withdrew = testData.donor(BloodGroup.AB_NEG, "Galle", null);
        Donor respondedElsewhere = testData.donor(BloodGroup.AB_NEG, "Galle", null);
        Donor notYet = testData.donor(BloodGroup.AB_NEG, "Galle", null);
        testData.response(request, accepted, ResponseStatus.ACCEPTED);
        testData.response(request, declined, ResponseStatus.DECLINED);
        testData.response(request, withdrew, ResponseStatus.WITHDRAWN);
        testData.response(otherRequest, respondedElsewhere, ResponseStatus.DECLINED);

        assertThat(matchedIds(request, accepted, declined, withdrew, respondedElsewhere, notYet))
                .containsExactlyInAnyOrder(respondedElsewhere.getId(), notYet.getId());
    }

    @Test
    void matchesComeBackRanked() {
        BloodRequest request = testData.bloodRequest(staff, BloodGroup.A_POS, "Colombo");
        Donor substituteSameCity = testData.donor(BloodGroup.O_NEG, "colombo", null);
        Donor exactOtherCity = testData.donor(BloodGroup.A_POS, "Kandy", null);
        Donor exactSameCityRecent = testData.donor(BloodGroup.A_POS, "Colombo", daysAgo(100));
        Donor exactSameCityLongAgo = testData.donor(BloodGroup.A_POS, "Colombo", daysAgo(400));

        assertThat(matchedIds(request, substituteSameCity, exactOtherCity, exactSameCityRecent, exactSameCityLongAgo))
                .containsExactly(exactSameCityLongAgo.getId(), exactSameCityRecent.getId(),
                        exactOtherCity.getId(), substituteSameCity.getId());
    }
}
