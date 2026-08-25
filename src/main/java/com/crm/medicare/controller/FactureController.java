package com.crm.medicare.controller;

import com.crm.medicare.dto.InvoiceCreateRequest;
import com.crm.medicare.dto.InvoiceDto;
import com.crm.medicare.dto.InvoicePaymentRequest;
import com.crm.medicare.dto.InvoiceRefundRequest;
import com.crm.medicare.security.PermissionCatalog;
import com.crm.medicare.service.FactureService;
import com.crm.medicare.service.FactureService.FacturePdf;
import com.crm.medicare.service.InvoiceBillingService;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping({"/api/factures", "/api/v1/factures"})
@RequiredArgsConstructor
public class FactureController {

    private final FactureService factureService;
    private final InvoiceBillingService invoiceBillingService;

    @GetMapping
    @PreAuthorize("hasAuthority('" + PermissionCatalog.INVOICE_READ + "')")
    public List<InvoiceDto> list() {
        return invoiceBillingService.list();
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('" + PermissionCatalog.INVOICE_READ + "')")
    public InvoiceDto getOne(@PathVariable Long id) {
        return invoiceBillingService.get(id);
    }

    @PostMapping
    @PreAuthorize("hasAuthority('" + PermissionCatalog.INVOICE_CREATE + "')")
    public ResponseEntity<Map<String, Object>> create(@RequestBody InvoiceCreateRequest request) {
        InvoiceDto created = invoiceBillingService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(
                        Map.of(
                                "id", created.getId(),
                                "reference", created.getReference(),
                                "facture", created));
    }

    @PostMapping("/{id}/paiements")
    @PreAuthorize("hasAuthority('" + PermissionCatalog.PAYMENT_CREATE + "')")
    public InvoiceDto addPayment(@PathVariable Long id, @RequestBody InvoicePaymentRequest request) {
        return invoiceBillingService.addPayment(id, request);
    }

    @PostMapping("/{id}/refund")
    @PreAuthorize("hasAuthority('" + PermissionCatalog.PAYMENT_CREATE + "')")
    public InvoiceDto refund(@PathVariable Long id, @RequestBody InvoiceRefundRequest request) {
        return invoiceBillingService.refund(id, request);
    }

    @PostMapping("/{id}/cancel")
    @PreAuthorize("hasAuthority('" + PermissionCatalog.INVOICE_CREATE + "')")
    public InvoiceDto cancel(@PathVariable Long id) {
        return invoiceBillingService.cancel(id);
    }

    @PatchMapping("/{reference}/reglement")
    @PreAuthorize("hasAuthority('" + PermissionCatalog.PAYMENT_CREATE + "')")
    public InvoiceDto settle(@PathVariable String reference) {
        return invoiceBillingService.settleByReference(reference);
    }

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
