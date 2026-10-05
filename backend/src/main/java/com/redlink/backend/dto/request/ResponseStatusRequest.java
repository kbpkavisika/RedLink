package com.redlink.backend.dto.request;

import com.redlink.backend.model.enums.ResponseStatus;
import jakarta.validation.constraints.NotNull;

/**
 * A donor's reply. The service checks which values each endpoint takes:
 *   POST  /api/requests/{id}/responses     ACCEPTED or DECLINED (D6, D7)
 *   PATCH /api/requests/{id}/responses/me  WITHDRAWN (D9)
 */
public record ResponseStatusRequest(@NotNull ResponseStatus status) {
}
