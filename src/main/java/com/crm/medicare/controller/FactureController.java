package com.crm.medicare.controller;

import com.crm.medicare.security.PermissionCatalog;
import com.crm.medicare.service.FactureService;
import com.crm.medicare.service.FactureService.FacturePdf;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping({"/api/factures", "/api/v1/factures"})
@RequiredArgsConstructor
public class FactureController {

    private final FactureService factureService;

    @GetMapping("/examen/{id}")
    @PreAuthorize("hasAuthority('" + PermissionCatalog.INVOICE_READ + "')")
    public ResponseEntity<byte[]> downloadFactureExamen(@PathVariable Long id) {
        FacturePdf facture = factureService.genererFacturePdf(id);

        return ResponseEntity.ok()
                .header(
                        HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + facture.filename() + "\"")
                .contentType(MediaType.APPLICATION_PDF)
                .contentLength(facture.content().length)
                .body(facture.content());
    }
}
