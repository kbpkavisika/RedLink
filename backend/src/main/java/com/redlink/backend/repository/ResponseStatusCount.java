package com.redlink.backend.repository;

import com.redlink.backend.model.enums.ResponseStatus;

// How many replies of one status a request has: one row of a grouped count, so a list needs no query per request
public record ResponseStatusCount(Long requestId, ResponseStatus status, Long count) {
}
