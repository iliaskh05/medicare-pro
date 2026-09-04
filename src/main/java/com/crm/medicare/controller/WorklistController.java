package com.crm.medicare.controller;

import com.crm.medicare.dto.PaiementCreateRequest;
import com.crm.medicare.dto.PaiementItemDto;
import com.crm.medicare.dto.StatusHistoryItemDto;
import com.crm.medicare.dto.WorklistCreateRequest;
import com.crm.medicare.dto.WorklistItemDto;
import com.crm.medicare.dto.WorklistPatchRequest;
import com.crm.medicare.dto.WorklistStatusUpdateRequest;
import com.crm.medicare.security.PermissionCatalog;
import com.crm.medicare.service.FactureService;
import com.crm.medicare.service.FactureService.FacturePdf;
import com.crm.medicare.service.WorklistService;
import com.crm.medicare.service.WorklistService.WorklistListResult;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
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
    private final FactureService factureService;

    @GetMapping
    @PreAuthorize("hasAuthority('" + PermissionCatalog.EXAM_READ + "')")
    public ResponseEntity<List<WorklistItemDto>> getWorklist(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Long patientId,
            @RequestParam(required = false) String modalite,
            @RequestParam(required = false) String priorite,
            @RequestParam(required = false) Long radiologueId,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size) {
        if (patientId != null) {
            return ResponseEntity.ok(worklistService.listByPatient(patientId));
        }
        LocalDate rangeFrom = from != null ? from : date;
        LocalDate rangeTo = to != null ? to : date;
        WorklistListResult result =
                worklistService.listByRange(
                        rangeFrom,
                        rangeTo,
                        search,
                        status,
                        modalite,
                        priorite,
                        radiologueId,
                        page,
                        size);
        ResponseEntity.BodyBuilder builder = ResponseEntity.ok();
        if (result.page() != null) {
            builder
                    .header("X-Total-Count", String.valueOf(result.total()))
                    .header("X-Page", String.valueOf(result.page()))
                    .header("X-Size", String.valueOf(result.size()));
        }
        return builder.body(result.items());
    }

    @GetMapping("/dossiers")
    @PreAuthorize("hasAuthority('" + PermissionCatalog.EXAM_READ + "')")
    public List<WorklistItemDto> dossiers(@RequestParam(required = false) String statut) {
        return worklistService.listDossiers(statut);
    }

    @GetMapping("/impayes")
    @PreAuthorize("hasAuthority('" + PermissionCatalog.INVOICE_READ + "')")
    public List<WorklistItemDto> impayes() {
        return worklistService.listImpayes();
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('" + PermissionCatalog.EXAM_READ + "')")
    public WorklistItemDto getOne(@PathVariable Long id) {
        return worklistService.getById(id);
    }

    @GetMapping("/{id}/status-history")
    @PreAuthorize("hasAuthority('" + PermissionCatalog.EXAM_READ + "')")
    public List<StatusHistoryItemDto> statusHistory(@PathVariable Long id) {
        return worklistService.statusHistory(id);
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
        return worklistService.patch(id, request);
    }

    @PutMapping("/{id}/compte-rendu")
    @PreAuthorize("hasAnyAuthority('" + PermissionCatalog.REPORT_WRITE + "','" + PermissionCatalog.EXAM_UPDATE + "')")
    public WorklistItemDto saveCompteRendu(
            @PathVariable Long id, @RequestBody Map<String, String> body) {
        if (body != null
                && (body.get("indication") != null
                        || body.get("technique") != null
                        || body.get("resultats") != null
                        || body.get("conclusion") != null)) {
            WorklistPatchRequest patch = new WorklistPatchRequest();
            patch.setIndication(body.get("indication"));
            patch.setTechnique(body.get("technique"));
            patch.setResultats(body.get("resultats"));
            patch.setConclusion(body.get("conclusion"));
            worklistService.patch(id, patch);
        }
        String texte = body != null ? body.get("texte") : null;
        if (texte != null) {
            return worklistService.saveCompteRendu(id, texte);
        }
        return worklistService.getById(id);
    }

    @GetMapping("/{id}/compte-rendu.pdf")
    @PreAuthorize("hasAnyAuthority('" + PermissionCatalog.REPORT_READ + "','" + PermissionCatalog.EXAM_READ + "')")
    public ResponseEntity<byte[]> compteRenduPdf(@PathVariable Long id) {
        FacturePdf pdf = factureService.genererCompteRenduPdf(id);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + pdf.filename() + "\"")
                .contentType(MediaType.APPLICATION_PDF)
                .contentLength(pdf.content().length)
                .body(pdf.content());
    }

    @GetMapping("/{id}/paiements")
    @PreAuthorize("hasAuthority('" + PermissionCatalog.INVOICE_READ + "')")
    public List<PaiementItemDto> paiements(@PathVariable Long id) {
        return worklistService.listPayments(id);
    }

    @PostMapping("/{id}/paiements")
    @PreAuthorize("hasAnyAuthority('" + PermissionCatalog.PAYMENT_CREATE + "','" + PermissionCatalog.EXAM_UPDATE + "')")
    public WorklistItemDto addPaiement(@PathVariable Long id, @RequestBody PaiementCreateRequest request) {
        return worklistService.recordPayment(id, request);
    }

    @PatchMapping("/{id}/assign")
    @PreAuthorize("hasAuthority('" + PermissionCatalog.WORKLIST_ASSIGN + "')")
    public WorklistItemDto assign(@PathVariable Long id, @RequestBody Map<String, Long> body) {
        Long radiologueId = body != null ? body.get("radiologueId") : null;
        return worklistService.assign(id, radiologueId);
    }

    @PostMapping("/{id}/complementaire")
    @PreAuthorize("hasAuthority('" + PermissionCatalog.EXAM_CREATE + "')")
    public ResponseEntity<WorklistItemDto> complementary(
            @PathVariable Long id, @RequestBody WorklistCreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(worklistService.createComplementary(id, request));
    }
}
