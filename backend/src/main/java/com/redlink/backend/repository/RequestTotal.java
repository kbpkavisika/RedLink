package com.redlink.backend.repository;

// How many of something (e.g. donations) a request has: one row of a grouped count
public record RequestTotal(Long requestId, Long count) {
}
