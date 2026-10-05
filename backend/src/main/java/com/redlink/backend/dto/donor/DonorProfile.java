package com.redlink.backend.dto.donor;

import com.redlink.backend.model.Donor;
import com.redlink.backend.model.enums.BloodGroup;
import com.redlink.backend.service.DonorEligibility;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

/**
 * The signed-in donor's own profile (D2) with their eligibility (D4), as the donor home page shows it:
 * "You can donate" or "You'll be eligible again on 28 Dec 2026".
 *
 * @param daysSinceLastDonation null if they have never donated
 * @param nextEligibleDate      null while they are eligible
 */
public record DonorProfile(
        Long id,
        String fullName,
        String email,
        String phone,
        BloodGroup bloodGroup,
        LocalDate dateOfBirth,
        String city,
        boolean available,
        LocalDate lastDonationDate,
        Long daysSinceLastDonation,
        boolean eligible,
        LocalDate nextEligibleDate,
        int daysBetweenDonations
) {
    // Reads donor.getUser(), so call it inside a transaction
    public static DonorProfile from(Donor donor, LocalDate today) {
        LocalDate last = donor.getLastDonationDate();
        boolean eligible = DonorEligibility.isEligible(last, today);
        return new DonorProfile(
                donor.getId(),
                donor.getUser().getFullName(),
                donor.getUser().getEmail(),
                donor.getUser().getPhone(),
                donor.getBloodGroup(),
                donor.getDateOfBirth(),
                donor.getCity(),
                donor.isAvailable(),
                last,
                last == null ? null : ChronoUnit.DAYS.between(last, today),
                eligible,
                eligible ? null : DonorEligibility.nextEligibleDate(last),
                DonorEligibility.DAYS_BETWEEN_DONATIONS
        );
    }
}
