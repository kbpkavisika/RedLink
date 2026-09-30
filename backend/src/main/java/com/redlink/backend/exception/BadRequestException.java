package com.redlink.backend.exception;

import com.redlink.backend.dto.ApiError;
import org.springframework.http.HttpStatus;

import java.util.List;

// 400: a rule that field annotations can't express, e.g. rejecting a hospital without a reason
public class BadRequestException extends ApiException {

    public BadRequestException(String message) {
        super(HttpStatus.BAD_REQUEST, message);
    }

    // Also marks one form field, e.g. new BadRequestException("…", "dateOfBirth", "must be 18 to 60 years ago")
    public BadRequestException(String message, String field, String fieldMessage) {
        super(HttpStatus.BAD_REQUEST, message, List.of(new ApiError.FieldError(field, fieldMessage)));
    }
}
