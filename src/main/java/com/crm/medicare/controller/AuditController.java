package com.crm.medicare.controller;

import com.crm.medicare.dto.AnomalieCaisseCompatDto;
import com.crm.medicare.dto.AnomalieDto;
import com.crm.medicare.dto.AuditDemoExampleDto;
import com.crm.medicare.dto.AuditDemoStatusDto;
import com.crm.medicare.dto.AuditKpisDto;
import com.crm.medicare.dto.TendanceAnomalieDto;
import com.crm.medicare.security.PermissionCatalog;
import com.crm.medicare.service.AnomalyAuditService;
import com.crm.medicare.service.AnomalyScoringService;
import com.crm.medicare.service.AuditDemoService;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping({"/api/audit", "/api/v1/audit"})
@RequiredArgsConstructor
public class AuditController {

    private final AnomalyAuditService anomalyAuditService;
    private final AnomalyScoringService anomalyScoringService;
    private final AuditDemoService auditDemoService;

    @GetMapping("/anomalies")
    @PreAuthorize("hasAuthority('" + PermissionCatalog.AUDIT_READ + "')")
    public List<AnomalieDto> anomalies() {
        return anomalyAuditService.listAnomalies();
    }

    @GetMapping("/kpis")
    @PreAuthorize("hasAuthority('" + PermissionCatalog.AUDIT_READ + "')")
    public AuditKpisDto kpis() {
        return anomalyAuditService.kpis();
    }

    @GetMapping("/tendance")
    @PreAuthorize("hasAuthority('" + PermissionCatalog.AUDIT_READ + "')")
    public List<TendanceAnomalieDto> tendance() {
        return anomalyAuditService.tendance();
    }

    @PatchMapping("/anomalies/{id}")
    @PreAuthorize("hasAuthority('" + PermissionCatalog.FRAUD_REVIEW + "')")
    public Map<String, Object> updateDecision(
            @PathVariable String id, @RequestBody Map<String, String> body) {
        String statut = body != null ? body.get("statut") : null;
        anomalyAuditService.updateDecision(id, statut);
        return Map.of("ok", true, "id", id, "statut", statut);
    }

    @PostMapping("/rescore")
    @PreAuthorize("hasAuthority('" + PermissionCatalog.FRAUD_REVIEW + "')")
    public Map<String, Object> rescore(@RequestParam(defaultValue = "90") int days) {
        int count = anomalyScoringService.rescoreRecentInvoices(days);
        return Map.of("ok", true, "scored", count, "days", days);
    }

    @GetMapping("/demo/examples")
    @PreAuthorize("hasAuthority('" + PermissionCatalog.AUDIT_READ + "')")
    public List<AuditDemoExampleDto> demoExamples() {
        return auditDemoService.examples();
    }

    @GetMapping("/demo/status")
    @PreAuthorize("hasAuthority('" + PermissionCatalog.AUDIT_READ + "')")
    public AuditDemoStatusDto demoStatus() {
        return auditDemoService.status();
    }

    @PostMapping("/demo/load")
    @PreAuthorize("hasAuthority('" + PermissionCatalog.FRAUD_REVIEW + "')")
    public AuditDemoStatusDto loadDemo() {
        return auditDemoService.load();
    }

    @PostMapping("/demo/reset")
    @PreAuthorize("hasAuthority('" + PermissionCatalog.FRAUD_REVIEW + "')")
    public AuditDemoStatusDto resetDemo() {
        return auditDemoService.reset();
    }
}

@RestController
@RequiredArgsConstructor
class AuditFraudeCompatController {

    private final AnomalyAuditService anomalyAuditService;

    /** Compat frontend CaisseFraudAlert + legacy shape. */
    @GetMapping({"/api/audit/fraude/anomalies", "/api/v1/audit/fraude/anomalies"})
    @PreAuthorize("hasAuthority('" + PermissionCatalog.AUDIT_READ + "')")
    public AnomalieCaisseCompatDto fraudeAnomalies() {
        return anomalyAuditService.caisseCompat();
    }
}
