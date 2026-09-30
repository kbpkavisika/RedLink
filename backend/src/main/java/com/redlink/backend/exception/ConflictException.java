package com.redlink.backend.exception;

import com.redlink.backend.dto.ApiError;
import org.springframework.http.HttpStatus;

import java.util.List;

// 409: the request clashes with the current state, e.g. already responded or email already registered
public class ConflictException extends ApiException {

    public ConflictException(String message) {
        super(HttpStatus.CONFLICT, message);
    }

    // Also marks one form field, e.g. new ConflictException("…", "email", "is already registered")
    public ConflictException(String message, String field, String fieldMessage) {
        super(HttpStatus.CONFLICT, message, List.of(new ApiError.FieldError(field, fieldMessage)));
    }
}
