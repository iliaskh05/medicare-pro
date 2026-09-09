package com.crm.medicare.service;

import com.crm.medicare.entity.ElectronicInvoiceStatus;
import com.crm.medicare.entity.Invoice;
import com.crm.medicare.entity.InvoiceElectronicEvent;
import com.crm.medicare.repository.InvoiceRepository;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.HexFormat;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Abstraction de facturation électronique. Aucune API DGI n'est invoquée :
 * on journalise le cycle local et on calcule un hash d'intégrité interne.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ElectronicInvoiceService {

    private static final ZoneId ZONE = ZoneId.of("Africa/Casablanca");

    private final InvoiceRepository invoiceRepository;

    @Transactional
    public void markIssued(Invoice invoice) {
        if (invoice == null) {
            return;
        }
        invoice.setElectronicStatus(ElectronicInvoiceStatus.ISSUED);
        invoice.setElectronicHash(integrityHash(invoice));
        append(invoice, ElectronicInvoiceStatus.ISSUED, "Émission locale — non transmise à un téléservice fiscal.");
        invoiceRepository.save(invoice);
    }

    @Transactional
    public void markCancelled(Invoice invoice) {
        if (invoice == null) {
            return;
        }
        invoice.setElectronicStatus(ElectronicInvoiceStatus.CANCELLED);
        append(invoice, ElectronicInvoiceStatus.CANCELLED, "Annulation locale.");
        invoiceRepository.save(invoice);
    }

    private void append(Invoice invoice, ElectronicInvoiceStatus status, String detail) {
        InvoiceElectronicEvent event = new InvoiceElectronicEvent();
        event.setInvoice(invoice);
        event.setStatus(status.name());
        event.setDetail(detail);
        event.setCreatedAt(LocalDateTime.now(ZONE));
        invoice.getElectronicEvents().add(event);
    }

    static String integrityHash(Invoice invoice) {
        try {
            String payload =
                    String.join(
                            "|",
                            nullToEmpty(invoice.getReference()),
                            invoice.getPatient() != null ? String.valueOf(invoice.getPatient().getId()) : "",
                            invoice.getTotal() != null ? invoice.getTotal().toPlainString() : "0",
                            invoice.getIssuedAt() != null ? invoice.getIssuedAt().toString() : "");
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(payload.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (Exception ex) {
            log.warn("Hash facture impossible: {}", ex.getMessage());
            return null;
        }
    }

    private static String nullToEmpty(String v) {
        return v == null ? "" : v;
    }
}
