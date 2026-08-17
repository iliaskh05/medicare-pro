package com.crm.medicare.common;

import com.fasterxml.jackson.databind.exc.InvalidFormatException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import java.time.Instant;
import java.util.List;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ApiException.class)
    public ResponseEntity<ApiErrorResponse> handleApi(ApiException ex, HttpServletRequest request) {
        return build(ex.getStatus(), ex.getCode(), ex.getMessage(), request, null);
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<ApiErrorResponse> handleStatus(
            ResponseStatusException ex, HttpServletRequest request) {
        HttpStatus status = HttpStatus.valueOf(ex.getStatusCode().value());
        String message = ex.getReason() != null ? ex.getReason() : "Requête invalide";
        String code = status == HttpStatus.UNAUTHORIZED ? "unauthorized" : "request_error";
        return build(status, code, message, request, null);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiErrorResponse> handleValidation(
            MethodArgumentNotValidException ex, HttpServletRequest request) {
        List<ApiErrorResponse.FieldError> fields =
                ex.getBindingResult().getFieldErrors().stream()
                        .map(err -> new ApiErrorResponse.FieldError(err.getField(), err.getDefaultMessage()))
                        .toList();
        return build(
                HttpStatus.BAD_REQUEST,
                "validation_error",
                "Les données envoyées sont invalides",
                request,
                fields);
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ApiErrorResponse> handleConstraint(
            ConstraintViolationException ex, HttpServletRequest request) {
        List<ApiErrorResponse.FieldError> fields =
                ex.getConstraintViolations().stream()
                        .map(
                                v ->
                                        new ApiErrorResponse.FieldError(
                                                v.getPropertyPath().toString(), v.getMessage()))
                        .toList();
        return build(
                HttpStatus.BAD_REQUEST, "validation_error", "Les données envoyées sont invalides", request, fields);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiErrorResponse> handleUnreadable(
            HttpMessageNotReadableException ex, HttpServletRequest request) {
        String message = "Corps de requête invalide";
        if (ex.getCause() instanceof InvalidFormatException) {
            message = "Format de donnée invalide";
        }
        return build(HttpStatus.BAD_REQUEST, "malformed_json", message, request, null);
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiErrorResponse> handleDenied(
            AccessDeniedException ex, HttpServletRequest request) {
        return build(HttpStatus.FORBIDDEN, "forbidden", "Accès refusé", request, null);
    }

    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<ApiErrorResponse> handleAuth(
            AuthenticationException ex, HttpServletRequest request) {
        return build(HttpStatus.UNAUTHORIZED, "unauthorized", "Authentification requise", request, null);
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ApiErrorResponse> handleIntegrity(
            DataIntegrityViolationException ex, HttpServletRequest request) {
        String raw =
                ex.getMostSpecificCause() != null ? String.valueOf(ex.getMostSpecificCause().getMessage()) : "";
        String lower = raw.toLowerCase();
        if (lower.contains("cin") || lower.contains("uk_patients_cin")) {
            return build(
                    HttpStatus.CONFLICT,
                    "patient_duplicate_cin",
                    "Un patient existe déjà avec ce CIN",
                    request,
                    null);
        }
        if (lower.contains("num_sejour") || lower.contains("uk_examens_num_sejour")) {
            return build(
                    HttpStatus.CONFLICT,
                    "duplicate_num_sejour",
                    "Ce numéro de séjour existe déjà",
                    request,
                    null);
        }
        log.warn("Contrainte d'intégrité path={} detail={}", request.getRequestURI(), raw);
        return build(
                HttpStatus.CONFLICT,
                "data_conflict",
                "L'enregistrement viole une contrainte de données",
                request,
                null);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiErrorResponse> handleUnknown(Exception ex, HttpServletRequest request) {
        log.error(
                "Erreur non gérée path={} cid={}",
                request.getRequestURI(),
                CorrelationIdFilter.currentOrUnknown(),
                ex);
        return build(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "internal_error",
                "Une erreur interne est survenue",
                request,
                null);
    }

    private ResponseEntity<ApiErrorResponse> build(
            HttpStatus status,
            String code,
            String message,
            HttpServletRequest request,
            List<ApiErrorResponse.FieldError> fields) {
        ApiErrorResponse body =
                ApiErrorResponse.builder()
                        .timestamp(Instant.now().toString())
                        .status(status.value())
                        .code(code)
                        .message(message)
                        .path(request.getRequestURI())
                        .validationErrors(fields)
                        .correlationId(CorrelationIdFilter.currentOrUnknown())
                        .build();
        return ResponseEntity.status(status).body(body);
    }
}
