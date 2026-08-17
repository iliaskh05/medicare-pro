package com.crm.medicare.controller;

import com.crm.medicare.security.PermissionCatalog;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping({"/api/audit/fraude", "/api/v1/audit/fraude"})
public class AuditController {

    @GetMapping("/anomalies")
    @PreAuthorize("hasAuthority('" + PermissionCatalog.AUDIT_READ + "')")
    public Map<String, Object> getAnomalies() {
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("totalAnomalies", 0);
        response.put("scoreRisqueMoyen", 0);
        response.put("alertesCritiques", 0);
        response.put("alertesMoyennes", 0);
        response.put("alertesFaibles", 0);
        response.put("anomalies", List.of());
        return response;
    }
}
