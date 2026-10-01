package com.redlink.backend.service;

import java.time.LocalDate;

/**
 * The 90-day rule: a donor can give again once at least 90 days have passed since their last donation.
 * A donor who has never donated (no last donation date) is always eligible.
 *
 * Takes "today" as a parameter so callers pass LocalDate.now(clock) and tests can fix the date.
 */
public final class DonorEligibility {

    public static final int DAYS_BETWEEN_DONATIONS = 90;

    private DonorEligibility() {
    }

    public static boolean isEligible(LocalDate lastDonationDate, LocalDate today) {
        return lastDonationDate == null || !today.isBefore(nextEligibleDate(lastDonationDate));
    }

    // First day the donor can give again, e.g. donated 1 Jan → eligible from 1 Apr (31 Mar in a leap year)
    public static LocalDate nextEligibleDate(LocalDate lastDonationDate) {
        return lastDonationDate.plusDays(DAYS_BETWEEN_DONATIONS);
    }

    // For the matching query: donors whose last donation is on or before this date are eligible
    public static LocalDate latestEligibleDonationDate(LocalDate today) {
        return today.minusDays(DAYS_BETWEEN_DONATIONS);
    }
}
