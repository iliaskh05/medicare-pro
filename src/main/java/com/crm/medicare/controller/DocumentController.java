package com.crm.medicare.controller;

import com.crm.medicare.dto.DocumentItemDto;
import com.crm.medicare.entity.DocumentExamen;
import com.crm.medicare.security.PermissionCatalog;
import com.crm.medicare.service.AuditService;
import com.crm.medicare.service.DocumentStorageService;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping({"/api/documents", "/api/v1/documents"})
@RequiredArgsConstructor
public class DocumentController {

    private final DocumentStorageService documentStorageService;
    private final AuditService auditService;

    @GetMapping("/patient/{patientId}")
    @PreAuthorize("hasAuthority('" + PermissionCatalog.DOCUMENT_READ + "')")
    public List<DocumentItemDto> byPatient(@PathVariable Long patientId) {
        return documentStorageService.listForPatient(patientId);
    }

    @GetMapping("/examen/{examenId}")
    @PreAuthorize("hasAuthority('" + PermissionCatalog.DOCUMENT_READ + "')")
    public List<DocumentItemDto> byExamen(@PathVariable Long examenId) {
        return documentStorageService.listForExamen(examenId);
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize(
            "hasAnyAuthority('"
                    + PermissionCatalog.DOCUMENT_WRITE
                    + "','"
                    + PermissionCatalog.EXAM_UPDATE
                    + "','"
                    + PermissionCatalog.PATIENT_UPDATE
                    + "')")
    public DocumentItemDto upload(
            @RequestParam Long patientId,
            @RequestParam(required = false) Long examenId,
            @RequestParam(required = false) String type,
            @RequestParam("file") MultipartFile file) {
        DocumentItemDto saved = documentStorageService.store(patientId, examenId, type, file);
        auditService.record(
                "DOCUMENT_UPLOAD",
                "Document",
                String.valueOf(saved.getId()),
                Map.of(
                        "patientId",
                        String.valueOf(patientId),
                        "type",
                        saved.getType() != null ? saved.getType() : ""));
        return saved;
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('" + PermissionCatalog.DOCUMENT_WRITE + "')")
    public Map<String, Object> delete(@PathVariable Long id) {
        documentStorageService.delete(id);
        auditService.record("DOCUMENT_DELETE", "Document", String.valueOf(id), Map.of());
        return Map.of("ok", true, "id", id);
    }

    @GetMapping("/{id}/fichier")
    @PreAuthorize("hasAuthority('" + PermissionCatalog.DOCUMENT_DOWNLOAD + "')")
    public ResponseEntity<byte[]> download(@PathVariable Long id) {
        DocumentExamen doc = documentStorageService.load(id);
        byte[] bytes = documentStorageService.readBytes(doc);
        auditService.record(
                AuditService.DOCUMENT_DOWNLOAD,
                "Document",
                String.valueOf(id),
                Map.of(
                        "patientId",
                        doc.getPatient() != null ? String.valueOf(doc.getPatient().getId()) : "",
                        "type",
                        doc.getType() != null ? doc.getType() : ""));
        return ResponseEntity.ok()
                .header(
                        HttpHeaders.CONTENT_DISPOSITION,
                        "inline; filename=\"" + doc.getNomOriginal().replace("\"", "") + "\"")
                .contentType(MediaType.parseMediaType(doc.getContentType()))
                .contentLength(bytes.length)
                .body(bytes);
    }
}
