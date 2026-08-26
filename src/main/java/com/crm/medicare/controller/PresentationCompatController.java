package com.crm.medicare.controller;

import com.crm.medicare.security.PermissionCatalog;
import com.crm.medicare.service.PresentationCompatService;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Endpoints de compatibilité pour le tableau de bord FE (widgets historiques).
 * Évite les 404 en démo sans exposer de logique métier séparée.
 */
@RestController
@RequiredArgsConstructor
public class PresentationCompatController {

    private final PresentationCompatService presentationCompatService;

    @GetMapping({"/api/planning/tension", "/api/v1/planning/tension"})
    @PreAuthorize("hasAuthority('" + PermissionCatalog.EXAM_READ + "')")
    public List<Map<String, Object>> planningTension() {
        return presentationCompatService.planningTension();
    }

    @GetMapping({"/api/audit/urgences", "/api/v1/audit/urgences"})
    @PreAuthorize("hasAuthority('" + PermissionCatalog.AUDIT_READ + "')")
    public List<Map<String, Object>> urgences() {
        return presentationCompatService.urgencesFraude();
    }

    @GetMapping({"/api/comptabilite/synthese", "/api/v1/comptabilite/synthese"})
    @PreAuthorize("hasAuthority('" + PermissionCatalog.INVOICE_READ + "')")
    public Map<String, Object> syntheseComptable() {
        return presentationCompatService.syntheseComptable();
    }

    @PostMapping({"/api/comptabilite/export", "/api/v1/comptabilite/export"})
    @PreAuthorize("hasAuthority('" + PermissionCatalog.INVOICE_READ + "')")
    public Map<String, Object> exportComptable() {
        return presentationCompatService.exportComptable();
    }
}
