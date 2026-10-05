package com.redlink.backend.service;

import com.redlink.backend.dto.request.RequestListItem;
import com.redlink.backend.model.BloodRequest;
import com.redlink.backend.repository.RequestTotal;
import com.redlink.backend.repository.ResponseStatusCount;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Joins a list of requests with their grouped reply and donation counts, in memory, so a whole list costs
 * three queries however long it is. Shared by the hospital's list (H11) and the admin's (A7).
 */
final class RequestLists {

    private RequestLists() {
    }

    static List<RequestListItem> build(List<BloodRequest> requests, List<ResponseStatusCount> replies,
                                       List<RequestTotal> donations) {
        Map<Long, long[]> byRequest = new HashMap<>(); // coming, withdrew, declined, donated
        for (ResponseStatusCount row : replies) {
            long[] counts = byRequest.computeIfAbsent(row.requestId(), id -> new long[4]);
            switch (row.status()) {
                case ACCEPTED -> counts[0] = row.count();
                case WITHDRAWN -> counts[1] = row.count();
                case DECLINED -> counts[2] = row.count();
            }
        }
        for (RequestTotal row : donations) {
            byRequest.computeIfAbsent(row.requestId(), id -> new long[4])[3] = row.count();
        }

        return requests.stream()
                .map(request -> {
                    long[] c = byRequest.get(request.getId());
                    return RequestListItem.from(request, c == null
                            ? RequestListItem.Counts.NONE
                            : new RequestListItem.Counts(c[0], c[1], c[2], c[3]));
                })
                .toList();
    }
}
