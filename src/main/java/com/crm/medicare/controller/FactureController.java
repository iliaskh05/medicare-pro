package com.crm.medicare.controller;

import com.crm.medicare.dto.ApiErrorResponse;
import com.crm.medicare.service.FactureService;
import com.crm.medicare.service.FactureService.FacturePdf;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/factures")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class FactureController {

    private final FactureService factureService;

    /**
     * Téléchargement PDF de la facture liée à un examen.
     *
     * <p>{@code GET /api/factures/examen/{id}} — authentification JWT requise.
     */
    @GetMapping("/examen/{id}")
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

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<ApiErrorResponse> handleStatus(ResponseStatusException ex) {
        String message = ex.getReason() != null ? ex.getReason() : ex.getMessage();
        return ResponseEntity.status(ex.getStatusCode())
                .body(new ApiErrorResponse(message, "facture_error"));
    }
}
