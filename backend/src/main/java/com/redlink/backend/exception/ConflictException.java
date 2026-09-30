package com.redlink.backend.exception;

import org.springframework.http.HttpStatus;

// 409: the request clashes with the current state, e.g. already responded or email already registered
public class ConflictException extends ApiException {

    public ConflictException(String message) {
        super(HttpStatus.CONFLICT, message);
    }
}
