package com.redlink.backend.exception;

import org.springframework.http.HttpStatus;

/**
 * Base class for errors a service throws on purpose.
 * The message is shown to the user, so write it as a plain sentence that says what to do next.
 */
public abstract class ApiException extends RuntimeException {

    private final HttpStatus status;

    protected ApiException(HttpStatus status, String message) {
        super(message);
        this.status = status;
    }

    public HttpStatus getStatus() {
        return status;
    }
}
