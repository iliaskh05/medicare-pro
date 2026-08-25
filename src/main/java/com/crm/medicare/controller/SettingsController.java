package com.crm.medicare.controller;

import com.crm.medicare.dto.AppSettingsDto;
import com.crm.medicare.security.PermissionCatalog;
import com.crm.medicare.service.AppSettingsService;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping({"/api/settings", "/api/v1/settings"})
@RequiredArgsConstructor
public class SettingsController {

    private final AppSettingsService appSettingsService;

    @GetMapping
    @PreAuthorize("hasAuthority('" + PermissionCatalog.SETTINGS_READ + "')")
    public AppSettingsDto get(@RequestParam(required = false) String prefix) {
        return appSettingsService.getByPrefix(prefix);
    }

    @PutMapping
    @PreAuthorize("hasAuthority('" + PermissionCatalog.SETTINGS_WRITE + "')")
    public AppSettingsDto put(@RequestBody Map<String, String> body) {
        return appSettingsService.upsert(body);
    }
}
