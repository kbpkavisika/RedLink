package com.redlink.backend.exception;

import org.springframework.http.HttpStatus;

// 403: the user is known but not allowed, e.g. posting while the hospital is still PENDING
public class ForbiddenException extends ApiException {

    public ForbiddenException(String message) {
        super(HttpStatus.FORBIDDEN, message);
    }
}
