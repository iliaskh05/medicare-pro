package com.crm.medicare.common;

import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ApiErrorResponse {

    private String timestamp;
    private int status;
    private String code;
    private String message;
    private String path;
    private List<FieldError> validationErrors;
    private String correlationId;

    /** Compatibilité des anciens handlers locaux. */
    public ApiErrorResponse(String message, String code) {
        this.message = message;
        this.code = code;
        this.status = 400;
        this.timestamp = java.time.Instant.now().toString();
        this.correlationId = CorrelationIdFilter.currentOrUnknown();
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FieldError {
        private String field;
        private String message;
    }
}
