package com.crm.medicare.controller;

import com.crm.medicare.dto.DashboardKpisDto;
import com.crm.medicare.dto.DashboardStatsDto;
import com.crm.medicare.security.PermissionCatalog;
import com.crm.medicare.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping({"/api/dashboard", "/api/v1/dashboard"})
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping("/stats")
    @PreAuthorize("hasAuthority('" + PermissionCatalog.EXAM_READ + "')")
    public DashboardStatsDto getStats() {
        return dashboardService.getStats();
    }

    @GetMapping("/kpis")
    @PreAuthorize("hasAuthority('" + PermissionCatalog.EXAM_READ + "')")
    public DashboardKpisDto getKpis() {
        return dashboardService.getKpis();
    }
}
