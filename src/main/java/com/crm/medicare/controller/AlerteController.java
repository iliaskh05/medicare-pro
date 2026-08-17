package com.crm.medicare.controller;

import com.crm.medicare.dto.AlerteDto;
import com.crm.medicare.security.PermissionCatalog;
import com.crm.medicare.service.DashboardService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping({"/api/alertes", "/api/v1/alertes"})
@RequiredArgsConstructor
public class AlerteController {

    private final DashboardService dashboardService;

    @GetMapping
    @PreAuthorize("hasAuthority('" + PermissionCatalog.EXAM_READ + "')")
    public List<AlerteDto> list() {
        return dashboardService.getAlertes();
    }
}
