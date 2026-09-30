package com.redlink.backend.exception;

import org.springframework.http.HttpStatus;

// 404: the thing asked for doesn't exist, e.g. an unknown donor or request ID
public class NotFoundException extends ApiException {

    public NotFoundException(String message) {
        super(HttpStatus.NOT_FOUND, message);
    }
}
