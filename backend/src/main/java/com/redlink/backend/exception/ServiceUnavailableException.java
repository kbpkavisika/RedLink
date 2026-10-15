package com.redlink.backend.exception;

import org.springframework.http.HttpStatus;

// 503: a service we depend on (the AI assistant's Groq API) is switched off, busy or down. Trying later may work.
public class ServiceUnavailableException extends ApiException {

    public ServiceUnavailableException(String message) {
        super(HttpStatus.SERVICE_UNAVAILABLE, message);
    }
}
