package com.crm.medicare.controller;

import com.crm.medicare.dto.ImagingInstanceDto;
import com.crm.medicare.dto.ImagingSeriesDto;
import com.crm.medicare.dto.ImagingStudyDto;
import com.crm.medicare.security.PermissionCatalog;
import com.crm.medicare.service.ImagingService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping({"/api/imaging", "/api/v1/imaging"})
@RequiredArgsConstructor
public class ImagingController {

    private final ImagingService imagingService;

    @GetMapping("/studies")
    @PreAuthorize("hasAuthority('" + PermissionCatalog.EXAM_READ + "')")
    public List<ImagingStudyDto> studies(@RequestParam Long patientId) {
        return imagingService.listStudies(patientId);
    }

    @GetMapping("/studies/{id}/series")
    @PreAuthorize("hasAuthority('" + PermissionCatalog.EXAM_READ + "')")
    public List<ImagingSeriesDto> series(@PathVariable Long id) {
        return imagingService.listSeries(id);
    }

    @GetMapping("/series/{id}/instances")
    @PreAuthorize("hasAuthority('" + PermissionCatalog.EXAM_READ + "')")
    public List<ImagingInstanceDto> instances(@PathVariable Long id) {
        return imagingService.listInstances(id);
    }
}
