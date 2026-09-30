package com.redlink.backend.exception;

import com.redlink.backend.dto.ApiError;
import org.springframework.http.HttpStatus;

import java.util.List;

/**
 * Base class for errors a service throws on purpose.
 * The message is shown to the user, so write it as a plain sentence that says what to do next.
 * Optional field errors point the frontend at the form field to highlight, e.g. "email".
 */
public abstract class ApiException extends RuntimeException {

    private final HttpStatus status;
    private final List<ApiError.FieldError> fieldErrors;

    protected ApiException(HttpStatus status, String message) {
        this(status, message, List.of());
    }

    protected ApiException(HttpStatus status, String message, List<ApiError.FieldError> fieldErrors) {
        super(message);
        this.status = status;
        this.fieldErrors = List.copyOf(fieldErrors);
    }

    public HttpStatus getStatus() {
        return status;
    }

    public List<ApiError.FieldError> getFieldErrors() {
        return fieldErrors;
    }
}
