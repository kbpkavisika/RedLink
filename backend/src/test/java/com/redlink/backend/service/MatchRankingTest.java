package com.redlink.backend.service;

import com.redlink.backend.dto.request.MatchedDonor;
import com.redlink.backend.model.Donor;
import com.redlink.backend.model.User;
import com.redlink.backend.model.enums.BloodGroup;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

// The ranking order, exactly: exact group → same city → longest since last donation → id
class MatchRankingTest {

    private static final LocalDate TODAY = LocalDate.parse("2026-09-30");

    private long nextId = 1;

    private Donor donor(String name, BloodGroup group, String city, String lastDonation) {
        User user = new User();
        user.setFullName(name);
        user.setPhone("0771234567");
        Donor donor = new Donor();
        donor.setId(nextId++);
        donor.setUser(user);
        donor.setBloodGroup(group);
        donor.setCity(city);
        donor.setLastDonationDate(lastDonation == null ? null : LocalDate.parse(lastDonation));
        return donor;
    }

    private List<String> names(List<MatchedDonor> ranked) {
        return ranked.stream().map(MatchedDonor::name).toList();
    }

    @Test
    void exactGroupBeatsSameCityBeatsLongestSinceDonation() {
        List<Donor> donors = List.of(
                donor("substitute, same city, never donated", BloodGroup.O_NEG, "Colombo", null),
                donor("exact, other city, never donated", BloodGroup.A_POS, "Kandy", null),
                donor("exact, same city, donated in May", BloodGroup.A_POS, "Colombo", "2026-05-01"),
                donor("exact, same city, donated in January", BloodGroup.A_POS, "Colombo", "2026-01-15"),
                donor("substitute, other city, donated in June", BloodGroup.O_POS, "Galle", "2026-06-01"));

        assertThat(names(MatchRanking.rank(donors, BloodGroup.A_POS, "Colombo", TODAY))).containsExactly(
                "exact, same city, donated in January",
                "exact, same city, donated in May",
                "exact, other city, never donated",
                "substitute, same city, never donated",
                "substitute, other city, donated in June");
    }

    @Test
    void neverDonatedCountsAsLongestSinceDonation() {
        List<Donor> donors = List.of(
                donor("donated long ago", BloodGroup.B_POS, "Jaffna", "2020-01-01"),
                donor("never donated", BloodGroup.B_POS, "Jaffna", null));

        assertThat(names(MatchRanking.rank(donors, BloodGroup.B_POS, "Jaffna", TODAY)))
                .containsExactly("never donated", "donated long ago");
    }

    @Test
    void cityComparisonIgnoresCaseAndSpaces() {
        List<Donor> donors = List.of(
                donor("other city", BloodGroup.O_POS, "Galle", null),
                donor("same city, typed differently", BloodGroup.O_POS, "  nuwara   ELIYA ", "2026-05-01"));

        List<MatchedDonor> ranked = MatchRanking.rank(donors, BloodGroup.O_POS, "Nuwara Eliya", TODAY);

        assertThat(names(ranked)).containsExactly("same city, typed differently", "other city");
        assertThat(ranked.get(0).sameCity()).isTrue();
    }

    @Test
    void tiesKeepAStableOrderById() {
        List<Donor> donors = List.of(
                donor("first", BloodGroup.AB_NEG, "Kandy", null),
                donor("second", BloodGroup.AB_NEG, "Kandy", null));

        assertThat(names(MatchRanking.rank(donors.reversed(), BloodGroup.AB_NEG, "Kandy", TODAY)))
                .containsExactly("first", "second");
    }

    @Test
    void reportsWhyEachDonorRanksWhereTheyDo() {
        MatchedDonor match = MatchRanking.rank(
                List.of(donor("Nimali", BloodGroup.O_NEG, "Colombo", "2026-07-02")),
                BloodGroup.AB_POS, "Kandy", TODAY).get(0);

        assertThat(match.exactMatch()).isFalse();
        assertThat(match.sameCity()).isFalse();
        assertThat(match.daysSinceLastDonation()).isEqualTo(90);
        assertThat(match.phone()).isEqualTo("0771234567");
    }
}
