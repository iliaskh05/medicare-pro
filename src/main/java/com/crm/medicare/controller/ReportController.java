package com.crm.medicare.controller;

import com.crm.medicare.dto.ReportAmendRequest;
import com.crm.medicare.dto.ReportDto;
import com.crm.medicare.dto.ReportVersionDto;
import com.crm.medicare.dto.ReportWriteRequest;
import com.crm.medicare.security.PermissionCatalog;
import com.crm.medicare.service.FactureService.FacturePdf;
import com.crm.medicare.service.ReportService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping({"/api/reports", "/api/comptes-rendus", "/api/v1/reports", "/api/v1/comptes-rendus"})
@RequiredArgsConstructor
public class ReportController {

    private final ReportService reportService;

    @GetMapping
    @PreAuthorize("hasAuthority('" + PermissionCatalog.REPORT_READ + "')")
    public List<ReportDto> list(
            @RequestParam(required = false) Long patientId,
            @RequestParam(required = false) String status) {
        return reportService.list(patientId, status);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('" + PermissionCatalog.REPORT_READ + "')")
    public ReportDto get(@PathVariable Long id) {
        return reportService.getById(id);
    }

    @PostMapping
    @PreAuthorize("hasAuthority('" + PermissionCatalog.REPORT_WRITE + "')")
    public ResponseEntity<ReportDto> create(@RequestBody ReportWriteRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(reportService.create(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('" + PermissionCatalog.REPORT_WRITE + "')")
    public ReportDto update(@PathVariable Long id, @RequestBody ReportWriteRequest request) {
        return reportService.update(id, request);
    }

    @PostMapping("/{id}/submit")
    @PreAuthorize("hasAuthority('" + PermissionCatalog.REPORT_WRITE + "')")
    public ReportDto submit(@PathVariable Long id) {
        return reportService.submit(id);
    }

    @PostMapping("/{id}/validate")
    @PreAuthorize("hasAuthority('" + PermissionCatalog.REPORT_VALIDATE + "')")
    public ReportDto validate(@PathVariable Long id) {
        return reportService.validate(id);
    }

    @PostMapping("/{id}/amend")
    @PreAuthorize("hasAuthority('" + PermissionCatalog.REPORT_AMEND + "')")
    public ReportDto amend(@PathVariable Long id, @RequestBody ReportAmendRequest request) {
        return reportService.amend(id, request);
    }

    @GetMapping("/{id}/versions")
    @PreAuthorize("hasAuthority('" + PermissionCatalog.REPORT_READ + "')")
    public List<ReportVersionDto> versions(@PathVariable Long id) {
        return reportService.listVersions(id);
    }

    @GetMapping("/{id}/pdf")
    @PreAuthorize("hasAuthority('" + PermissionCatalog.REPORT_READ + "')")
    public ResponseEntity<byte[]> pdf(@PathVariable Long id) {
        FacturePdf pdf = reportService.pdf(id);
        return ResponseEntity.ok()
                .header(
                        HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + pdf.filename() + "\"")
                .contentType(MediaType.APPLICATION_PDF)
                .contentLength(pdf.content().length)
                .body(pdf.content());
    }
}
