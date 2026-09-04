package com.crm.medicare.controller;

import com.crm.medicare.common.PageResponse;
import com.crm.medicare.entity.AuditLog;
import com.crm.medicare.repository.AuditLogRepository;
import com.crm.medicare.security.PermissionCatalog;
import java.util.LinkedHashMap;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping({"/api/audit-trail", "/api/v1/audit-trail"})
@RequiredArgsConstructor
public class AuditTrailController {

    private final AuditLogRepository auditLogRepository;

    @GetMapping
    @PreAuthorize("hasAuthority('" + PermissionCatalog.AUDIT_READ + "')")
    public PageResponse<Map<String, Object>> list(
            @RequestParam(required = false) String entityType,
            @RequestParam(required = false) String entityId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        int safeSize = Math.min(Math.max(size, 1), 200);
        PageRequest pr = PageRequest.of(Math.max(page, 0), safeSize);
        Page<AuditLog> result;
        if (entityType != null && !entityType.isBlank() && entityId != null && !entityId.isBlank()) {
            result =
                    auditLogRepository.findByEntityTypeAndEntityIdOrderByCreatedAtDesc(
                            entityType.trim(), entityId.trim(), pr);
        } else if (entityType != null && !entityType.isBlank()) {
            result = auditLogRepository.findByEntityTypeOrderByCreatedAtDesc(entityType.trim(), pr);
        } else {
            result = auditLogRepository.findAllByOrderByCreatedAtDesc(pr);
        }
        return PageResponse.<Map<String, Object>>builder()
                .content(result.getContent().stream().map(this::toDto).toList())
                .page(result.getNumber())
                .size(result.getSize())
                .totalElements(result.getTotalElements())
                .totalPages(result.getTotalPages())
                .build();
    }

    private Map<String, Object> toDto(AuditLog log) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", log.getId());
        m.put("action", log.getAction());
        m.put("entityType", log.getEntityType());
        m.put("entityId", log.getEntityId());
        m.put("userId", log.getUserId());
        m.put("userEmail", log.getUserEmail());
        m.put("ipAddress", log.getIpAddress());
        m.put("correlationId", log.getCorrelationId());
        m.put("metadata", log.getMetadata());
        m.put("createdAt", log.getCreatedAt());
        return m;
    }
}
