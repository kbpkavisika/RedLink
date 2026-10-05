package com.redlink.backend.dto.request;

import java.util.List;

/**
 * GET /api/admin/requests/{id} (A8): one request, read-only, with everything needed to look into a problem:
 * the hospital's contact details, how many donors were notified, every reply, and who donated.
 */
public record AdminRequestDetail(
        BloodRequestDetail request,
        Long hospitalId,
        String hospitalCity,
        String hospitalPhone,
        long notifiedCount,
        List<RequestResponse> responses,
        List<Long> donatedDonorIds
) {
}
