package com.crm.medicare.controller;

import com.crm.medicare.dto.CatalogueExamenWriteRequest;
import com.crm.medicare.entity.CatalogueExamen;
import com.crm.medicare.security.PermissionCatalog;
import com.crm.medicare.service.CatalogueService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping({"/api/catalogue/examens", "/api/v1/catalogue/examens"})
@RequiredArgsConstructor
public class CatalogueController {

    private final CatalogueService catalogueService;

    @GetMapping
    @PreAuthorize("hasAuthority('" + PermissionCatalog.EXAM_READ + "')")
    public List<CatalogueExamen> list(@RequestParam(defaultValue = "true") boolean actifs) {
        return catalogueService.list(actifs);
    }

    @PostMapping
    @PreAuthorize("hasAuthority('" + PermissionCatalog.USER_MANAGE + "')")
    public ResponseEntity<CatalogueExamen> create(@RequestBody CatalogueExamenWriteRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(catalogueService.create(request));
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasAuthority('" + PermissionCatalog.USER_MANAGE + "')")
    public CatalogueExamen update(
            @PathVariable Long id, @RequestBody CatalogueExamenWriteRequest request) {
        return catalogueService.update(id, request);
    }
}
