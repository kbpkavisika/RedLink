package com.redlink.backend.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

// The 90-day rule at its edges, with "today" fixed to 30 Sep 2026
class DonorEligibilityTest {

    private static final LocalDate TODAY = LocalDate.parse("2026-09-30");

    @Test
    void neverDonatedIsEligible() {
        assertThat(DonorEligibility.isEligible(null, TODAY)).isTrue();
    }

    @ParameterizedTest(name = "last donated {0} is eligible")
    @CsvSource({
            "2026-07-02", // exactly 90 days ago
            "2026-07-01", // 91 days ago
            "2025-01-15",
    })
    void eligibleAfter90Days(String lastDonation) {
        assertThat(DonorEligibility.isEligible(LocalDate.parse(lastDonation), TODAY)).isTrue();
    }

    @ParameterizedTest(name = "last donated {0} is not eligible")
    @CsvSource({
            "2026-07-03", // 89 days ago
            "2026-09-30", // today
            "2026-10-05", // date in the future (bad data) is never eligible
    })
    void notEligibleWithin90Days(String lastDonation) {
        assertThat(DonorEligibility.isEligible(LocalDate.parse(lastDonation), TODAY)).isFalse();
    }

    @Test
    void nextEligibleDateIs90DaysLater() {
        assertThat(DonorEligibility.nextEligibleDate(LocalDate.parse("2026-07-03")))
                .isEqualTo("2026-10-01");
        // Leap year: 29 Feb counts as a day
        assertThat(DonorEligibility.nextEligibleDate(LocalDate.parse("2028-01-01")))
                .isEqualTo("2028-03-31");
    }

    // The matching query's cutoff must agree with isEligible on both sides of the edge
    @Test
    void queryCutoffAgreesWithIsEligible() {
        LocalDate cutoff = DonorEligibility.latestEligibleDonationDate(TODAY);

        assertThat(cutoff).isEqualTo("2026-07-02");
        assertThat(DonorEligibility.isEligible(cutoff, TODAY)).isTrue();
        assertThat(DonorEligibility.isEligible(cutoff.plusDays(1), TODAY)).isFalse();
    }
}
