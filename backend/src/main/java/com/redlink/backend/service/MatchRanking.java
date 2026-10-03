package com.redlink.backend.service;

import com.redlink.backend.dto.request.MatchedDonor;
import com.redlink.backend.model.Donor;
import com.redlink.backend.model.enums.BloodGroup;
import com.redlink.backend.util.Cities;

import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;

/**
 * Orders donors who already passed the match filters (README "Matching engine"):
 *   1. exact blood group before a compatible substitute (saves scarce groups such as O−)
 *   2. same city as the request before other cities
 *   3. longest time since last donation first; never donated counts as longest
 *   then donor id, so the order is the same every time
 *
 * No database access, so the order can be unit tested exactly.
 */
public final class MatchRanking {

    private MatchRanking() {
    }

    public static List<MatchedDonor> rank(List<Donor> donors, BloodGroup requested, String requestCity, LocalDate today) {
        return donors.stream()
                .map(donor -> MatchedDonor.from(donor,
                        donor.getBloodGroup() == requested,
                        Cities.same(donor.getCity(), requestCity),
                        today))
                .sorted(ORDER)
                .toList();
    }

    static final Comparator<MatchedDonor> ORDER = Comparator
            .comparing(MatchedDonor::exactMatch).reversed()
            .thenComparing(Comparator.comparing(MatchedDonor::sameCity).reversed())
            // Earlier date = longer ago; null (never donated) sorts first
            .thenComparing(MatchedDonor::lastDonationDate, Comparator.nullsFirst(Comparator.naturalOrder()))
            .thenComparing(MatchedDonor::donorId);
}
