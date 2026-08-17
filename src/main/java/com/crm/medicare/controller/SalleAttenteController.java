package com.crm.medicare.controller;

import com.crm.medicare.dto.SalleAttenteDto;
import com.crm.medicare.security.PermissionCatalog;
import com.crm.medicare.service.DashboardService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping({"/api/salle-attente", "/api/v1/salle-attente"})
@RequiredArgsConstructor
public class SalleAttenteController {

    private final DashboardService dashboardService;

    @GetMapping
    @PreAuthorize("hasAuthority('" + PermissionCatalog.EXAM_READ + "')")
    public List<SalleAttenteDto> list() {
        return dashboardService.getSalleAttente();
    }
}
