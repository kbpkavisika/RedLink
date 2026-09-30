package com.redlink.backend.dto;

import com.redlink.backend.model.Donor;
import com.redlink.backend.model.enums.BloodGroup;
import java.time.LocalDate;

// Flat view of a donor for lists; name and phone come from the donor's user
public record DonorSummary(
        Long id,
        String name,
        BloodGroup bloodGroup,
        String phone,
        String city,
        boolean available,
        LocalDate lastDonationDate
) {
    public static DonorSummary from(Donor donor) {
        return new DonorSummary(
                donor.getId(),
                donor.getUser().getFullName(),
                donor.getBloodGroup(),
                donor.getUser().getPhone(),
                donor.getCity(),
                donor.isAvailable(),
                donor.getLastDonationDate()
        );
    }
}
