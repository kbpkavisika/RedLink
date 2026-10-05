package com.redlink.backend.dto.donor;

import jakarta.validation.constraints.NotNull;

// PATCH /api/donor/me/availability (D3). Unavailable donors are left out of matching until they switch back.
public record UpdateAvailabilityRequest(@NotNull Boolean available) {
}
