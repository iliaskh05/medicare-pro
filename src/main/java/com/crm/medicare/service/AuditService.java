package com.crm.medicare.service;

import com.crm.medicare.common.CorrelationIdFilter;
import com.crm.medicare.entity.AuditLog;
import com.crm.medicare.entity.SecurityEvent;
import com.crm.medicare.entity.Utilisateur;
import com.crm.medicare.repository.AuditLogRepository;
import com.crm.medicare.repository.SecurityEventRepository;
import com.crm.medicare.security.SecurityUtils;
import jakarta.servlet.http.HttpServletRequest;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuditService {

    public static final String LOGIN = "LOGIN";
    public static final String LOGIN_FAILED = "LOGIN_FAILED";
    public static final String LOGOUT = "LOGOUT";
    public static final String PATIENT_VIEW = "PATIENT_VIEW";
    public static final String PATIENT_CREATE = "PATIENT_CREATE";
    public static final String PATIENT_UPDATE = "PATIENT_UPDATE";
    public static final String EXAM_CREATE = "EXAM_CREATE";
    public static final String EXAM_UPDATE = "EXAM_UPDATE";
    public static final String EXAM_STATUS_CHANGED = "EXAM_STATUS_CHANGED";
    public static final String APPOINTMENT_CREATE = "APPOINTMENT_CREATE";
    public static final String APPOINTMENT_UPDATE = "APPOINTMENT_UPDATE";
    public static final String APPOINTMENT_CANCEL = "APPOINTMENT_CANCEL";
    public static final String CHECKIN = "CHECKIN";
    public static final String WORKLIST_ASSIGN = "WORKLIST_ASSIGN";
    public static final String REPORT_CREATE = "REPORT_CREATE";
    public static final String REPORT_UPDATE = "REPORT_UPDATE";
    public static final String REPORT_VALIDATE = "REPORT_VALIDATE";
    public static final String REPORT_AMEND = "REPORT_AMEND";
    public static final String INVOICE_CREATE = "INVOICE_CREATE";
    public static final String INVOICE_CANCEL = "INVOICE_CANCEL";
    public static final String INVOICE_REFUND = "INVOICE_REFUND";
    public static final String PAYMENT_CREATE = "PAYMENT_CREATE";
    public static final String DOCUMENT_DOWNLOAD = "DOCUMENT_DOWNLOAD";
    public static final String SETTINGS_UPDATE = "SETTINGS_UPDATE";
    public static final String USER_PERMISSION_CHANGED = "USER_PERMISSION_CHANGED";

    private final AuditLogRepository auditLogRepository;
    private final SecurityEventRepository securityEventRepository;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void record(String action, String entityType, String entityId, Map<String, ?> metadata) {
        record(action, entityType, entityId, metadata, null, null);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void record(
            String action,
            String entityType,
            String entityId,
            Map<String, ?> metadata,
            Map<String, ?> before,
            Map<String, ?> after) {
        try {
            Utilisateur user = SecurityUtils.currentUserOrNull();
            AuditLog logEntry =
                    AuditLog.builder()
                            .action(action)
                            .entityType(entityType)
                            .entityId(entityId)
                            .userId(user != null ? user.getId() : null)
                            .userEmail(user != null ? user.getEmail() : null)
                            .ipAddress(clientIp())
                            .correlationId(CorrelationIdFilter.currentOrUnknown())
                            .metadata(copy(metadata))
                            .beforeState(copy(before))
                            .afterState(copy(after))
                            .createdAt(Instant.now())
                            .build();
            auditLogRepository.save(logEntry);
        } catch (Exception ex) {
            log.warn("Échec écriture audit action={} entity={}/{}", action, entityType, entityId, ex);
        }
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void securityEvent(String eventType, String email, boolean success, String detail) {
        try {
            securityEventRepository.save(
                    SecurityEvent.builder()
                            .eventType(eventType)
                            .email(email)
                            .ipAddress(clientIp())
                            .success(success)
                            .detail(detail)
                            .createdAt(Instant.now())
                            .build());
        } catch (Exception ex) {
            log.warn("Échec écriture security_event type={} email={}", eventType, email, ex);
        }
    }

    private static Map<String, Object> copy(Map<String, ?> value) {
        if (value == null || value.isEmpty()) {
            return null;
        }
        return new HashMap<>(value);
    }

    private static String clientIp() {
        ServletRequestAttributes attrs =
                (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        if (attrs == null) {
            return null;
        }
        HttpServletRequest request = attrs.getRequest();
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
