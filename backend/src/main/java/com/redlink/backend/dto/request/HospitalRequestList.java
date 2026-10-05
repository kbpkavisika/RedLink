package com.redlink.backend.dto.request;

import java.util.List;

/**
 * GET /api/requests (H11): the hospital's dashboard numbers and every request it has posted, newest first.
 *
 * @param open               OPEN requests (including any just past their deadline, until the expiry job runs)
 * @param criticalOpen       OPEN and CRITICAL
 * @param fulfilledLast30Days FULFILLED in the last 30 days
 * @param donorsComing       donors who accepted an OPEN request and haven't withdrawn
 */
public record HospitalRequestList(
        long open,
        long criticalOpen,
        long fulfilledLast30Days,
        long donorsComing,
        List<RequestListItem> requests
) {
}
