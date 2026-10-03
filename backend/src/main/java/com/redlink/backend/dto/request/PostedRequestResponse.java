package com.redlink.backend.dto.request;

/**
 * 201 from POST /api/requests: the saved request and what happened next (H4),
 * e.g. "Request #RQ-1043 is live. We notified the top 10 of 46 matching donors."
 *
 * @param matchCount    every donor who can give to this request right now
 * @param notifiedCount how many of the best matches were notified (0 if there were no matches)
 */
public record PostedRequestResponse(BloodRequestDetail request, int matchCount, int notifiedCount) {
}
