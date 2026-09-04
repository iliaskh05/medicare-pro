package com.crm.medicare.controller;

import com.crm.medicare.security.PermissionCatalog;
import com.crm.medicare.service.ReportTemplateService;
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
@RequestMapping({"/api/report-templates", "/api/v1/report-templates"})
@RequiredArgsConstructor
public class ReportTemplateController {

    private final ReportTemplateService reportTemplateService;

    @GetMapping
    @PreAuthorize("hasAuthority('" + PermissionCatalog.REPORT_READ + "')")
    public List<Map<String, Object>> list(
            @RequestParam(required = false) String modalite,
            @RequestParam(defaultValue = "true") boolean activeOnly) {
        return reportTemplateService.list(modalite, activeOnly);
    }

    @PostMapping
    @PreAuthorize("hasAuthority('" + PermissionCatalog.SETTINGS_WRITE + "')")
    public Map<String, Object> create(@RequestBody Map<String, Object> body) {
        return reportTemplateService.create(body);
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasAuthority('" + PermissionCatalog.SETTINGS_WRITE + "')")
    public Map<String, Object> patch(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        return reportTemplateService.patch(id, body);
    }
}
