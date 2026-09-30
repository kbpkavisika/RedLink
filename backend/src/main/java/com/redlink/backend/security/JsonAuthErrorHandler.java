package com.redlink.backend.security;

import com.redlink.backend.dto.ApiError;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.access.AccessDeniedHandler;
import tools.jackson.databind.json.JsonMapper;

import java.io.IOException;
import java.util.List;

/**
 * Writes 401 and 403 responses in the ApiError format.
 * Security rejects requests in the filter chain, before any controller runs, so GlobalExceptionHandler
 * never sees these; without this class Spring would send an empty body.
 */
public class JsonAuthErrorHandler implements AuthenticationEntryPoint, AccessDeniedHandler {

    private static final Logger log = LoggerFactory.getLogger(JsonAuthErrorHandler.class);

    private final JsonMapper jsonMapper;

    public JsonAuthErrorHandler(JsonMapper jsonMapper) {
        this.jsonMapper = jsonMapper;
    }

    // 401: no token, a tampered token, or an expired one. The frontend signs the user out.
    @Override
    public void commence(HttpServletRequest request, HttpServletResponse response,
                         AuthenticationException exception) throws IOException {
        response.setHeader(HttpHeaders.WWW_AUTHENTICATE, "Bearer");
        write(request, response, HttpStatus.UNAUTHORIZED,
                "You're not signed in, or your session has expired. Please sign in again.");
        log.debug("401 {}: {}", request.getRequestURI(), exception.getMessage());
    }

    // 403: signed in, but this role may not use this endpoint. The frontend does NOT sign the user out.
    @Override
    public void handle(HttpServletRequest request, HttpServletResponse response,
                       AccessDeniedException exception) throws IOException {
        write(request, response, HttpStatus.FORBIDDEN, "You don't have access to this.");
        log.debug("403 {}: {}", request.getRequestURI(), exception.getMessage());
    }

    private void write(HttpServletRequest request, HttpServletResponse response,
                       HttpStatus status, String message) throws IOException {
        ApiError body = ApiError.of(status, message, List.of(), request.getRequestURI());
        response.setStatus(status.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        jsonMapper.writeValue(response.getOutputStream(), body);
    }
}
