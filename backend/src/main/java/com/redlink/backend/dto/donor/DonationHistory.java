package com.redlink.backend.dto.donor;

import com.redlink.backend.dto.request.BloodRequestDetail;
import com.redlink.backend.model.BloodRequest;
import com.redlink.backend.model.Donation;
import com.redlink.backend.model.Hospital;

import java.time.LocalDate;
import java.util.List;

/**
 * GET /api/donor/donations (D10): "7 total · 7 lives helped", every donation newest first,
 * and when the donor can give again (the dashed callout at the end of the list).
 *
 * @param livesHelped      one per donation, as the design shows it ("7 total · 7 lives helped")
 * @param nextEligibleDate null while the donor can donate
 */
public record DonationHistory(
        int totalDonations,
        int totalUnits,
        int livesHelped,
        boolean eligible,
        LocalDate nextEligibleDate,
        List<Item> donations
) {
    /**
     * @param requestId / reference null for a donation not linked to a request
     */
    public record Item(
            Long id,
            LocalDate donationDate,
            int units,
            String hospitalName,
            String hospitalCity,
            Long requestId,
            String reference
    ) {
        // Reads the hospital and request, so call it inside a transaction
        public static Item from(Donation donation) {
            Hospital hospital = donation.getHospital();
            BloodRequest request = donation.getRequest();
            return new Item(
                    donation.getId(),
                    donation.getDonationDate(),
                    donation.getUnits(),
                    hospital.getName(),
                    hospital.getCity(),
                    request == null ? null : request.getId(),
                    request == null ? null : BloodRequestDetail.reference(request.getId())
            );
        }
    }
}
