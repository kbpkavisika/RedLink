package com.redlink.backend.dto.request;

import java.util.List;

/**
 * GET /api/requests/{id} (and the answer to closing it): the request, how many donors were notified when it
 * was posted, and, once FULFILLED, which donors gave blood for it. The current matches come from
 * GET /api/requests/{id}/matches.
 *
 * @param donatedDonorIds empty until the request is fulfilled
 */
public record RequestOverview(BloodRequestDetail request, long notifiedCount, List<Long> donatedDonorIds) {
}
