package com.redlink.backend.exception;

import org.springframework.http.HttpStatus;

// 400: a rule that field annotations can't express, e.g. rejecting a hospital without a reason
public class BadRequestException extends ApiException {

    public BadRequestException(String message) {
        super(HttpStatus.BAD_REQUEST, message);
    }
}
