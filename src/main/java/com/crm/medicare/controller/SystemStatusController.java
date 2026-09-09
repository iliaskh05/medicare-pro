package com.crm.medicare.controller;

import com.crm.medicare.dto.SystemStatusDto;
import com.crm.medicare.security.PermissionCatalog;
import com.crm.medicare.service.SystemStatusService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
public class SystemStatusController {

    private final SystemStatusService systemStatusService;

    /** Liveness métier — pas de secrets, pas de dump SQL. */
    @GetMapping({"/api/system/health", "/api/v1/system/health"})
    public SystemStatusDto health() {
        return systemStatusService.publicHealth();
    }

    @GetMapping({"/api/system/status", "/api/v1/system/status"})
    @PreAuthorize("hasAuthority('" + PermissionCatalog.SETTINGS_READ + "')")
    public SystemStatusDto status() {
        return systemStatusService.snapshot();
    }
}
