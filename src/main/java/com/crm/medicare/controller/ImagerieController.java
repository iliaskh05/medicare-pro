package com.crm.medicare.controller;

import com.crm.medicare.dto.ImagerieStudyDto;
import com.crm.medicare.security.PermissionCatalog;
import com.crm.medicare.service.ImagerieService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping({"/api/imagerie", "/api/v1/imagerie"})
@RequiredArgsConstructor
public class ImagerieController {

    private final ImagerieService imagerieService;

    @GetMapping("/examen/{id}")
    @PreAuthorize("hasAuthority('" + PermissionCatalog.EXAM_READ + "')")
    public ImagerieStudyDto getImagerieExamen(@PathVariable Long id) {
        return imagerieService.getStudyForExamen(id);
    }
}
