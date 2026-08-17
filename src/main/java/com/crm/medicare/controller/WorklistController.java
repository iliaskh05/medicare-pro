package com.crm.medicare.controller;

import com.crm.medicare.dto.WorklistCreateRequest;
import com.crm.medicare.dto.WorklistItemDto;
import com.crm.medicare.dto.WorklistPatchRequest;
import com.crm.medicare.dto.WorklistStatusUpdateRequest;
import com.crm.medicare.security.PermissionCatalog;
import com.crm.medicare.service.WorklistService;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping({"/api/worklist", "/api/v1/worklist"})
@RequiredArgsConstructor
public class WorklistController {

    private final WorklistService worklistService;

    @GetMapping
    @PreAuthorize("hasAuthority('" + PermissionCatalog.EXAM_READ + "')")
    public List<WorklistItemDto> getWorklist(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String status) {
        return worklistService.listByDate(date, search, status);
    }

    @PostMapping
    @PreAuthorize("hasAuthority('" + PermissionCatalog.EXAM_CREATE + "')")
    public ResponseEntity<WorklistItemDto> createWorklist(@RequestBody WorklistCreateRequest request) {
        WorklistItemDto created = worklistService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAuthority('" + PermissionCatalog.EXAM_UPDATE + "')")
    public WorklistItemDto updateStatus(
            @PathVariable Long id, @RequestBody WorklistStatusUpdateRequest request) {
        String statut = request != null ? request.getNouveauStatut() : null;
        return worklistService.updateStatus(id, statut);
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasAuthority('" + PermissionCatalog.EXAM_UPDATE + "')")
    public WorklistItemDto patch(@PathVariable Long id, @RequestBody WorklistPatchRequest request) {
        String etat =
                request == null
                        ? null
                        : (request.getEtatPatient() != null ? request.getEtatPatient() : request.getNouveauStatut());
        String statutCr = request != null ? request.getStatutCr() : null;
        String paiement = request != null ? request.getPaiement() : null;
        return worklistService.patch(id, etat, statutCr, paiement);
    }

    @PutMapping("/{id}/compte-rendu")
    @PreAuthorize("hasAnyAuthority('" + PermissionCatalog.REPORT_WRITE + "','" + PermissionCatalog.EXAM_UPDATE + "')")
    public WorklistItemDto saveCompteRendu(
            @PathVariable Long id, @RequestBody Map<String, String> body) {
        String texte = body != null ? body.get("texte") : null;
        return worklistService.saveCompteRendu(id, texte);
    }

    @PatchMapping("/{id}/assign")
    @PreAuthorize("hasAuthority('" + PermissionCatalog.WORKLIST_ASSIGN + "')")
    public WorklistItemDto assign(@PathVariable Long id, @RequestBody Map<String, Long> body) {
        Long radiologueId = body != null ? body.get("radiologueId") : null;
        return worklistService.assign(id, radiologueId);
    }
}
