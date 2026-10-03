package com.redlink.backend.dto.request;

import com.redlink.backend.dto.auth.Inputs;
import com.redlink.backend.model.enums.BloodGroup;
import com.redlink.backend.model.enums.Urgency;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.Instant;

/**
 * POST /api/requests (H3). The hospital and the poster come from the signed-in staff member, never the body.
 * neededBy must be in the future; the service checks that against the app's Clock.
 *
 * @param unitsNeeded 1 to 20; larger needs are posted as more than one request
 * @param city        where the blood is needed, usually the hospital's city
 * @param neededBy    deadline as an ISO timestamp, e.g. "2026-10-04T12:00:00Z"
 */
public record CreateBloodRequestRequest(
        @NotNull BloodGroup bloodGroup,
        @NotNull @Min(1) @Max(20) Integer unitsNeeded,
        @NotNull Urgency urgency,
        @NotBlank @Size(max = 100) String city,
        @NotNull Instant neededBy
) {
    public CreateBloodRequestRequest {
        city = Inputs.trim(city);
    }
}
