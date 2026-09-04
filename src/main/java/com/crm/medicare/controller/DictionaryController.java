package com.crm.medicare.controller;

import com.crm.medicare.security.PermissionCatalog;
import com.crm.medicare.service.DictionaryService;
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
@RequestMapping({"/api/dictionaries", "/api/v1/dictionaries"})
@RequiredArgsConstructor
public class DictionaryController {

    private final DictionaryService dictionaryService;

    @GetMapping("/zones")
    @PreAuthorize("hasAuthority('" + PermissionCatalog.SETTINGS_READ + "')")
    public List<Map<String, Object>> zones(@RequestParam(defaultValue = "true") boolean activeOnly) {
        return dictionaryService.listZones(activeOnly);
    }

    @PostMapping("/zones")
    @PreAuthorize("hasAuthority('" + PermissionCatalog.SETTINGS_WRITE + "')")
    public Map<String, Object> createZone(@RequestBody Map<String, Object> body) {
        return dictionaryService.createZone(body);
    }

    @PatchMapping("/zones/{id}")
    @PreAuthorize("hasAuthority('" + PermissionCatalog.SETTINGS_WRITE + "')")
    public Map<String, Object> patchZone(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        return dictionaryService.patchZone(id, body);
    }

    @GetMapping("/pathology-families")
    @PreAuthorize("hasAuthority('" + PermissionCatalog.SETTINGS_READ + "')")
    public List<Map<String, Object>> families(@RequestParam(defaultValue = "true") boolean activeOnly) {
        return dictionaryService.listFamilies(activeOnly);
    }

    @PostMapping("/pathology-families")
    @PreAuthorize("hasAuthority('" + PermissionCatalog.SETTINGS_WRITE + "')")
    public Map<String, Object> createFamily(@RequestBody Map<String, Object> body) {
        return dictionaryService.createFamily(body);
    }

    @PatchMapping("/pathology-families/{id}")
    @PreAuthorize("hasAuthority('" + PermissionCatalog.SETTINGS_WRITE + "')")
    public Map<String, Object> patchFamily(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        return dictionaryService.patchFamily(id, body);
    }

    @GetMapping("/pathologies")
    @PreAuthorize("hasAuthority('" + PermissionCatalog.SETTINGS_READ + "')")
    public List<Map<String, Object>> pathologies(
            @RequestParam(required = false) Long familyId, @RequestParam(required = false) String q) {
        return dictionaryService.listPathologies(familyId, q);
    }

    @PostMapping("/pathologies")
    @PreAuthorize("hasAuthority('" + PermissionCatalog.SETTINGS_WRITE + "')")
    public Map<String, Object> createPathology(@RequestBody Map<String, Object> body) {
        return dictionaryService.createPathology(body);
    }

    @PatchMapping("/pathologies/{id}")
    @PreAuthorize("hasAuthority('" + PermissionCatalog.SETTINGS_WRITE + "')")
    public Map<String, Object> patchPathology(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        return dictionaryService.patchPathology(id, body);
    }
}
