package com.crm.medicare.controller;

import com.crm.medicare.common.PageResponse;
import com.crm.medicare.dto.Patient360Dtos;
import com.crm.medicare.dto.PatientDuplicateMatch;
import com.crm.medicare.dto.PatientResponse;
import com.crm.medicare.dto.PatientWriteRequest;
import com.crm.medicare.security.PermissionCatalog;
import com.crm.medicare.service.PatientService;
import jakarta.validation.Valid;
import java.time.LocalDate;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
public class PatientController {

    private final PatientService patientService;

    /**
     * Sans query : tableau {@code PatientDto[]} (contrat consommé par {@code fetchPatients}).
     * Avec {@code search}, {@code mutuelle} ou {@code page} : page Spring (contrat P0 attendu).
     */
    @GetMapping("/api/patients")
    @PreAuthorize("hasAuthority('" + PermissionCatalog.PATIENT_READ + "')")
    public Object list(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String mutuelle,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size,
            @RequestParam(required = false) String sort) {
        if (search != null || mutuelle != null || page != null) {
            return patientService.search(
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    mutuelle,
                    search,
                    page == null ? 0 : page,
                    size == null ? 20 : size,
                    sort == null ? "nomComplet,asc" : sort);
        }
        return patientService.listAll();
    }

    @GetMapping("/api/v1/patients")
    @PreAuthorize("hasAuthority('" + PermissionCatalog.PATIENT_READ + "')")
    public PageResponse<PatientResponse> search(
            @RequestParam(required = false) String cin,
            @RequestParam(required = false) String telephone,
            @RequestParam(required = false) String nom,
            @RequestParam(required = false) String prenom,
            @RequestParam(required = false) String numeroDossier,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateNaissance,
            @RequestParam(required = false) String numAffiliation,
            @RequestParam(required = false) String mutuelle,
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String sort) {
        return patientService.search(
                cin,
                telephone,
                nom,
                prenom,
                numeroDossier,
                dateNaissance,
                numAffiliation,
                mutuelle,
                q,
                page,
                size,
                sort);
    }

    @GetMapping({"/api/patients/duplicates", "/api/v1/patients/duplicates"})
    @PreAuthorize("hasAuthority('" + PermissionCatalog.PATIENT_READ + "')")
    public List<PatientDuplicateMatch> duplicates(
            @RequestParam(required = false) String nom,
            @RequestParam(required = false) String cin,
            @RequestParam(required = false) String telephone,
            @RequestParam(required = false) String naissance) {
        return patientService.findDuplicates(nom, cin, telephone, naissance);
    }

    @GetMapping({"/api/patients/{id}", "/api/v1/patients/{id}"})
    @PreAuthorize("hasAuthority('" + PermissionCatalog.PATIENT_READ + "')")
    public PatientResponse get(@PathVariable Long id) {
        return patientService.getById(id);
    }

    @PostMapping({"/api/patients", "/api/v1/patients"})
    @PreAuthorize("hasAuthority('" + PermissionCatalog.PATIENT_CREATE + "')")
    public ResponseEntity<PatientResponse> create(@Valid @RequestBody PatientWriteRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(patientService.create(request));
    }

    @PutMapping({"/api/patients/{id}", "/api/v1/patients/{id}"})
    @PreAuthorize("hasAuthority('" + PermissionCatalog.PATIENT_UPDATE + "')")
    public PatientResponse update(@PathVariable Long id, @Valid @RequestBody PatientWriteRequest request) {
        return patientService.update(id, request);
    }

    @GetMapping({"/api/patients/{id}/historique", "/api/v1/patients/{id}/historique"})
    @PreAuthorize("hasAuthority('" + PermissionCatalog.PATIENT_READ + "')")
    public List<Patient360Dtos.HistoryItem> history(@PathVariable Long id) {
        return patientService.history(id);
    }

    @GetMapping({"/api/patients/{id}/imagerie", "/api/v1/patients/{id}/imagerie"})
    @PreAuthorize("hasAuthority('" + PermissionCatalog.PATIENT_READ + "')")
    public List<Patient360Dtos.ImagingItem> imaging(@PathVariable Long id) {
        return patientService.imaging(id);
    }

    @GetMapping({"/api/patients/{id}/ordonnances", "/api/v1/patients/{id}/ordonnances"})
    @PreAuthorize("hasAuthority('" + PermissionCatalog.PATIENT_READ + "')")
    public List<Patient360Dtos.PrescriptionItem> prescriptions(@PathVariable Long id) {
        return patientService.prescriptions(id);
    }

    @GetMapping({"/api/patients/{id}/factures", "/api/v1/patients/{id}/factures"})
    @PreAuthorize("hasAuthority('" + PermissionCatalog.PATIENT_READ + "')")
    public List<Patient360Dtos.BillingItem> billing(@PathVariable Long id) {
        return patientService.billing(id);
    }

    @GetMapping({"/api/patients/{id}/dossier-financier", "/api/v1/patients/{id}/dossier-financier"})
    @PreAuthorize("hasAuthority('" + PermissionCatalog.INVOICE_READ + "')")
    public Patient360Dtos.FinancialStatus financial(@PathVariable Long id) {
        return patientService.financialStatus(id);
    }
}
