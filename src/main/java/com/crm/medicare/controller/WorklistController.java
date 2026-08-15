package com.crm.medicare.controller;

import com.crm.medicare.dto.ApiErrorResponse;
import com.crm.medicare.dto.WorklistCreateRequest;
import com.crm.medicare.dto.WorklistItemDto;
import com.crm.medicare.service.WorklistService;
import java.time.LocalDate;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/worklist")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class WorklistController {

    private final WorklistService worklistService;

    /**
     * Worklist du jour (ou de la date fournie).
     *
     * <p>Exemple : {@code GET /api/worklist?date=2026-08-15}
     */
    @GetMapping
    public List<WorklistItemDto> getWorklist(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
                    LocalDate date) {
        return worklistService.listByDate(date);
    }

    /**
     * Création patient + examen en une passe. Renvoie l'objet Worklist complet
     * (prêt à être inséré dans le tableau frontend).
     */
    @PostMapping
    public ResponseEntity<WorklistItemDto> createWorklist(@RequestBody WorklistCreateRequest request) {
        WorklistItemDto created = worklistService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<ApiErrorResponse> handleStatus(ResponseStatusException ex) {
        String message = ex.getReason() != null ? ex.getReason() : ex.getMessage();
        return ResponseEntity.status(ex.getStatusCode())
                .body(new ApiErrorResponse(message, "worklist_error"));
    }
}
