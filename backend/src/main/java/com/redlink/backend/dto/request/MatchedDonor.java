package com.redlink.backend.dto.request;

import com.redlink.backend.model.Donor;
import com.redlink.backend.model.enums.BloodGroup;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

/**
 * One donor in a request's ranked match list (H5). The phone is included because the hospital
 * may call matches directly. exactMatch and sameCity say why a donor ranks where they do.
 *
 * @param daysSinceLastDonation null if the donor has never donated
 */
public record MatchedDonor(
        Long donorId,
        String name,
        String phone,
        BloodGroup bloodGroup,
        String city,
        LocalDate lastDonationDate,
        Long daysSinceLastDonation,
        boolean exactMatch,
        boolean sameCity
) {
    public static MatchedDonor from(Donor donor, boolean exactMatch, boolean sameCity, LocalDate today) {
        LocalDate last = donor.getLastDonationDate();
        return new MatchedDonor(
                donor.getId(),
                donor.getUser().getFullName(),
                donor.getUser().getPhone(),
                donor.getBloodGroup(),
                donor.getCity(),
                last,
                last == null ? null : ChronoUnit.DAYS.between(last, today),
                exactMatch,
                sameCity
        );
    }
}
