package com.redlink.backend.exception;

import com.redlink.backend.dto.ApiError;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.util.List;

/**
 * Turns every exception from any controller into an {@link ApiError}.
 * 4xx: the client's mistake, logged briefly. 5xx: our bug, logged in full with the ref.
 * Stack traces, SQL and class names never reach the client.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    // Thrown on purpose by services: NotFound, Conflict, Forbidden, BadRequest
    @ExceptionHandler(ApiException.class)
    ResponseEntity<ApiError> handleApi(ApiException ex, HttpServletRequest request) {
        return build(ex.getStatus(), ex.getMessage(), ex.getFieldErrors(), request);
    }

    // Tried too often (AuthRateLimiter): Retry-After says how many seconds to wait
    @ExceptionHandler(TooManyRequestsException.class)
    ResponseEntity<ApiError> handleTooManyRequests(TooManyRequestsException ex, HttpServletRequest request) {
        HttpHeaders headers = new HttpHeaders();
        headers.set(HttpHeaders.RETRY_AFTER, String.valueOf(TooManyRequestsException.seconds(ex.getRetryAfter())));
        log.info("Rate limit hit path={}: {}", request.getRequestURI(), ex.getMessage());
        return build(ex.getStatus(), ex.getMessage(), List.of(), request, headers);
    }

    // @Valid on a request body failed
    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<ApiError> handleInvalidBody(MethodArgumentNotValidException ex, HttpServletRequest request) {
        List<ApiError.FieldError> fields = ex.getBindingResult().getFieldErrors().stream()
                .map(error -> new ApiError.FieldError(error.getField(), error.getDefaultMessage()))
                .toList();
        return build(HttpStatus.BAD_REQUEST, "Some fields are invalid.", fields, request);
    }

    // Constraint annotations on @PathVariable / @RequestParam failed, e.g. @Positive Long id
    @ExceptionHandler(HandlerMethodValidationException.class)
    ResponseEntity<ApiError> handleInvalidParameter(HandlerMethodValidationException ex, HttpServletRequest request) {
        List<ApiError.FieldError> fields = ex.getParameterValidationResults().stream()
                .flatMap(result -> result.getResolvableErrors().stream()
                        .map(error -> new ApiError.FieldError(
                                result.getMethodParameter().getParameterName(),
                                error.getDefaultMessage())))
                .toList();
        return build(HttpStatus.BAD_REQUEST, "Some fields are invalid.", fields, request);
    }

    // Missing body, broken JSON, or a value of the wrong type such as "bloodGroup": "C+"
    @ExceptionHandler(HttpMessageNotReadableException.class)
    ResponseEntity<ApiError> handleUnreadable(HttpMessageNotReadableException ex, HttpServletRequest request) {
        return build(HttpStatus.BAD_REQUEST,
                "The request body is missing, isn't valid JSON, or has a value of the wrong type.",
                List.of(), request);
    }

    // e.g. GET /api/donors/abc
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    ResponseEntity<ApiError> handleTypeMismatch(MethodArgumentTypeMismatchException ex, HttpServletRequest request) {
        String expected = ex.getRequiredType() == null ? "a different type" : describe(ex.getRequiredType());
        return build(HttpStatus.BAD_REQUEST,
                "'" + ex.getName() + "' must be " + expected + ".",
                List.of(new ApiError.FieldError(ex.getName(), "must be " + expected)), request);
    }

    @ExceptionHandler(MissingServletRequestParameterException.class)
    ResponseEntity<ApiError> handleMissingParameter(MissingServletRequestParameterException ex, HttpServletRequest request) {
        return build(HttpStatus.BAD_REQUEST,
                "The '" + ex.getParameterName() + "' parameter is required.",
                List.of(new ApiError.FieldError(ex.getParameterName(), "is required")), request);
    }

    // Unknown URL
    @ExceptionHandler(NoResourceFoundException.class)
    ResponseEntity<ApiError> handleNoResource(NoResourceFoundException ex, HttpServletRequest request) {
        return build(HttpStatus.NOT_FOUND, "There is no endpoint at this address.", List.of(), request);
    }

    // e.g. POST to a GET-only endpoint; the Allow header lists what is supported
    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    ResponseEntity<ApiError> handleMethodNotAllowed(HttpRequestMethodNotSupportedException ex, HttpServletRequest request) {
        HttpHeaders headers = new HttpHeaders();
        if (ex.getSupportedHttpMethods() != null) {
            headers.setAllow(ex.getSupportedHttpMethods());
        }
        return build(HttpStatus.METHOD_NOT_ALLOWED,
                ex.getMethod() + " is not supported here.", List.of(), request, headers);
    }

    @ExceptionHandler(HttpMediaTypeNotSupportedException.class)
    ResponseEntity<ApiError> handleMediaType(HttpMediaTypeNotSupportedException ex, HttpServletRequest request) {
        return build(HttpStatus.UNSUPPORTED_MEDIA_TYPE,
                "Send the request body as JSON (Content-Type: application/json).", List.of(), request);
    }

    // A unique or CHECK constraint in the database caught something the service didn't,
    // e.g. two sign-ups with the same email at the same moment
    @ExceptionHandler(DataIntegrityViolationException.class)
    ResponseEntity<ApiError> handleDataIntegrity(DataIntegrityViolationException ex, HttpServletRequest request) {
        ApiError body = error(HttpStatus.CONFLICT, "This conflicts with existing data.", List.of(), request);
        log.warn("Data integrity violation ref={} path={}: {}",
                body.ref(), body.path(), ex.getMostSpecificCause().getMessage());
        return ResponseEntity.status(HttpStatus.CONFLICT).body(body);
    }

    // Anything we didn't expect: generic message for the user, full detail in the log
    @ExceptionHandler(Exception.class)
    ResponseEntity<ApiError> handleUnexpected(Exception ex, HttpServletRequest request) {
        ApiError body = error(HttpStatus.INTERNAL_SERVER_ERROR,
                "Something on our side failed. Please try again; if it keeps happening, share the reference below.",
                List.of(), request);
        log.error("Unhandled error ref={} path={}", body.ref(), body.path(), ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(body);
    }

    private ResponseEntity<ApiError> build(HttpStatus status, String message,
                                           List<ApiError.FieldError> fields, HttpServletRequest request) {
        return build(status, message, fields, request, new HttpHeaders());
    }

    private ResponseEntity<ApiError> build(HttpStatus status, String message, List<ApiError.FieldError> fields,
                                           HttpServletRequest request, HttpHeaders headers) {
        ApiError body = error(status, message, fields, request);
        log.debug("{} {} ref={}: {}", status.value(), body.path(), body.ref(), message);
        return ResponseEntity.status(status).headers(headers).body(body);
    }

    private ApiError error(HttpStatus status, String message,
                           List<ApiError.FieldError> fields, HttpServletRequest request) {
        return ApiError.of(status, message, fields, request.getRequestURI());
    }

    private static String describe(Class<?> type) {
        if (Number.class.isAssignableFrom(type) || (type.isPrimitive() && type != boolean.class)) {
            return "a number";
        }
        if (type.isEnum()) {
            return "one of " + List.of(type.getEnumConstants());
        }
        return "a valid " + type.getSimpleName();
    }
}
