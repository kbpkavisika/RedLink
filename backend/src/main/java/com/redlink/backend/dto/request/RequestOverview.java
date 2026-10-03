package com.redlink.backend.dto.request;

/**
 * GET /api/requests/{id}: the request and how many donors were notified when it was posted.
 * The current matches come from GET /api/requests/{id}/matches.
 */
public record RequestOverview(BloodRequestDetail request, long notifiedCount) {
}
