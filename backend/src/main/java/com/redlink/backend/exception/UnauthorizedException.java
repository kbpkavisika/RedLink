package com.redlink.backend.exception;

import org.springframework.http.HttpStatus;

// 401: not signed in, wrong email or password, or the token's account no longer exists.
// The frontend signs the user out when a signed-in request gets this.
public class UnauthorizedException extends ApiException {

    public UnauthorizedException(String message) {
        super(HttpStatus.UNAUTHORIZED, message);
    }
}
