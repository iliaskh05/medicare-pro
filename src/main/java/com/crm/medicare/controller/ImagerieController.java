package com.crm.medicare.controller;

import com.crm.medicare.dto.ApiErrorResponse;
import com.crm.medicare.dto.ImagerieStudyDto;
import com.crm.medicare.service.ImagerieService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/**
 * Simulateur PACS — métadonnées DICOM factices pour la visionneuse RadioCRM.
 *
 * <p>{@code GET /api/imagerie/examen/{id}} — JWT requis.
 */
@RestController
@RequestMapping("/api/imagerie")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class ImagerieController {

    private final ImagerieService imagerieService;

    @GetMapping("/examen/{id}")
    public ImagerieStudyDto getImagerieExamen(@PathVariable Long id) {
        return imagerieService.getStudyForExamen(id);
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<ApiErrorResponse> handleStatus(ResponseStatusException ex) {
        String message = ex.getReason() != null ? ex.getReason() : ex.getMessage();
        return ResponseEntity.status(ex.getStatusCode())
                .body(new ApiErrorResponse(message, "imagerie_error"));
    }
}
