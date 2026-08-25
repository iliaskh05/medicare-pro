package com.crm.medicare.controller;

import com.crm.medicare.dto.CoverageQuoteDto;
import com.crm.medicare.dto.InsurancePlanWriteRequest;
import com.crm.medicare.dto.InsuranceProviderWriteRequest;
import com.crm.medicare.entity.InsurancePlan;
import com.crm.medicare.entity.InsuranceProvider;
import com.crm.medicare.security.PermissionCatalog;
import com.crm.medicare.service.InsuranceService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping({"/api/insurance", "/api/v1/insurance"})
@RequiredArgsConstructor
public class InsuranceController {

    private final InsuranceService insuranceService;

    @GetMapping("/providers")
    @PreAuthorize("hasAuthority('" + PermissionCatalog.PATIENT_READ + "')")
    public List<InsuranceProvider> listProviders(
            @RequestParam(defaultValue = "true") boolean actifs) {
        return insuranceService.listProviders(actifs);
    }

    @PostMapping("/providers")
    @PreAuthorize("hasAuthority('" + PermissionCatalog.USER_MANAGE + "')")
    public ResponseEntity<InsuranceProvider> createProvider(
            @RequestBody InsuranceProviderWriteRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(insuranceService.createProvider(request));
    }

    @PatchMapping("/providers/{id}")
    @PreAuthorize("hasAuthority('" + PermissionCatalog.USER_MANAGE + "')")
    public InsuranceProvider patchProvider(
            @PathVariable Long id, @RequestBody InsuranceProviderWriteRequest request) {
        return insuranceService.patchProvider(id, request);
    }

    @GetMapping("/plans")
    @PreAuthorize("hasAuthority('" + PermissionCatalog.PATIENT_READ + "')")
    public List<InsurancePlan> listPlans(
            @RequestParam(required = false) Long providerId,
            @RequestParam(defaultValue = "true") boolean actifs) {
        return insuranceService.listPlans(providerId, actifs);
    }

    @PostMapping("/plans")
    @PreAuthorize("hasAuthority('" + PermissionCatalog.USER_MANAGE + "')")
    public ResponseEntity<InsurancePlan> createPlan(@RequestBody InsurancePlanWriteRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(insuranceService.createPlan(request));
    }

    @PatchMapping("/plans/{id}")
    @PreAuthorize("hasAuthority('" + PermissionCatalog.USER_MANAGE + "')")
    public InsurancePlan patchPlan(
            @PathVariable Long id, @RequestBody InsurancePlanWriteRequest request) {
        return insuranceService.patchPlan(id, request);
    }

    @GetMapping("/coverage")
    @PreAuthorize("hasAuthority('" + PermissionCatalog.PATIENT_READ + "')")
    public CoverageQuoteDto coverage(
            @RequestParam Long patientId, @RequestParam(required = false) Long catalogueId) {
        return insuranceService.coverage(patientId, catalogueId);
    }
}
