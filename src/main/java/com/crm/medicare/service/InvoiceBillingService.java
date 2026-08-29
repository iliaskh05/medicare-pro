package com.crm.medicare.service;

import com.crm.medicare.common.ApiException;
import com.crm.medicare.dto.InvoiceCreateRequest;
import com.crm.medicare.dto.InvoiceDto;
import com.crm.medicare.dto.InvoiceItemDto;
import com.crm.medicare.dto.InvoicePaymentRequest;
import com.crm.medicare.dto.InvoiceRefundRequest;
import com.crm.medicare.entity.Examen;
import com.crm.medicare.entity.Invoice;
import com.crm.medicare.entity.InvoiceItem;
import com.crm.medicare.entity.InvoicePayment;
import com.crm.medicare.entity.InvoiceRefund;
import com.crm.medicare.entity.Paiement;
import com.crm.medicare.entity.Patient;
import com.crm.medicare.entity.Utilisateur;
import com.crm.medicare.repository.ExamenRepository;
import com.crm.medicare.repository.InvoicePaymentRepository;
import com.crm.medicare.repository.InvoiceRepository;
import com.crm.medicare.repository.PatientRepository;
import com.crm.medicare.security.SecurityUtils;
import com.crm.medicare.workflow.InvoiceStatus;
import com.crm.medicare.workflow.WorkflowEngine;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class InvoiceBillingService {

    private static final ZoneId ZONE = ZoneId.of("Africa/Casablanca");

    private final InvoiceRepository invoiceRepository;
    private final InvoicePaymentRepository paymentRepository;
    private final PatientRepository patientRepository;
    private final ExamenRepository examenRepository;
    private final WorkflowEngine workflowEngine;
    private final AuditService auditService;
    private final AnomalyScoringService anomalyScoringService;

    @Transactional(readOnly = true)
    public List<InvoiceDto> list() {
        return invoiceRepository.findAllWithPatient().stream().map(this::toDto).toList();
    }

    @Transactional(readOnly = true)
    public InvoiceDto get(Long id) {
        return toDto(load(id));
    }

    @Transactional(readOnly = true)
    public InvoiceDto getByReference(String reference) {
        return toDto(
                invoiceRepository
                        .findByReferenceIgnoreCase(reference)
                        .orElseThrow(() -> ApiException.notFound("Facture introuvable")));
    }

    @Transactional(readOnly = true)
    public BigDecimal patientBalance(Long patientId) {
        return invoiceRepository.balanceForPatient(
                patientId,
                EnumSet.of(InvoiceStatus.CANCELLED, InvoiceStatus.DRAFT));
    }

    @Transactional
    public InvoiceDto create(InvoiceCreateRequest request) {
        if (request == null || request.getPatientId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "patientId obligatoire");
        }
        Patient patient =
                patientRepository
                        .findByIdAndDeletedAtIsNull(request.getPatientId())
                        .orElseThrow(() -> ApiException.notFound("Patient introuvable"));

        Examen examen = null;
        if (request.getExamenId() != null) {
            examen =
                    examenRepository
                            .findByIdWithPatient(request.getExamenId())
                            .orElseThrow(() -> ApiException.notFound("Examen introuvable"));
            if (examen.getPatient() == null || !examen.getPatient().getId().equals(patient.getId())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Examen non lié au patient");
            }
        }

        BigDecimal montant = resolveMontant(request, examen);
        BigDecimal remise = nz(request.getRemise());
        if (remise.compareTo(montant) > 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Remise supérieure au montant");
        }
        BigDecimal total = montant.subtract(remise).setScale(2, RoundingMode.HALF_UP);
        BigDecimal insuranceShare = BigDecimal.ZERO; // Phase 6 will fill coverage
        BigDecimal patientShare = total.subtract(insuranceShare).max(BigDecimal.ZERO);

        Invoice invoice = new Invoice();
        invoice.setReference(nextReference());
        invoice.setPatient(patient);
        invoice.setStatut(InvoiceStatus.ISSUED);
        invoice.setIssuedAt(LocalDateTime.now(ZONE));
        invoice.setTotal(total);
        invoice.setRemise(remise);
        invoice.setInsuranceShare(insuranceShare);
        invoice.setPatientShare(patientShare);
        invoice.setModePaiement(normalizeMode(request.getModePaiement()));
        invoice.setNotes(request.getNotes());
        Utilisateur actor = SecurityUtils.currentUserOrNull();
        if (actor != null) {
            invoice.setCreatedById(actor.getId());
            invoice.setCreatedByName(actor.getNomComplet());
        }

        InvoiceItem item = new InvoiceItem();
        item.setInvoice(invoice);
        item.setExamenId(examen != null ? examen.getId() : null);
        item.setCatalogueId(examen != null && examen.getCatalogue() != null ? examen.getCatalogue().getId() : null);
        item.setLabel(
                firstNonBlank(
                        request.getActe(),
                        examen != null ? examen.getDescription() : null,
                        "Acte d'imagerie"));
        item.setQuantity(BigDecimal.ONE);
        item.setUnitPrice(montant);
        item.setLineTotal(montant);
        invoice.getItems().add(item);

        Invoice saved = invoiceRepository.save(invoice);

        BigDecimal acompte = nz(request.getAcompte());
        if (acompte.compareTo(BigDecimal.ZERO) > 0) {
            InvoicePaymentRequest pay = new InvoicePaymentRequest();
            pay.setMontant(acompte.min(patientShare));
            pay.setMode(invoice.getModePaiement());
            pay.setIdempotencyKey(request.getIdempotencyKey());
            applyPayment(saved, pay, false);
            saved = invoiceRepository.save(saved);
            syncExamenPayment(examen, saved);
        } else if (examen != null && total.compareTo(BigDecimal.ZERO) == 0) {
            examen.setMontant(BigDecimal.ZERO);
            examen.setPaiement(Paiement.paye);
            examenRepository.save(examen);
        } else if (examen != null) {
            examen.setMontant(total);
            if (examen.getAcompte() == null) {
                examen.setAcompte(BigDecimal.ZERO);
            }
            examen.setPaiement(Paiement.impaye);
            examenRepository.save(examen);
        }

        auditService.record(
                AuditService.INVOICE_CREATE,
                "Invoice",
                String.valueOf(saved.getId()),
                Map.of("reference", saved.getReference(), "total", saved.getTotal().toPlainString()));
        anomalyScoringService.scoreInvoiceAsync(saved.getId());
        return toDto(saved);
    }

    @Transactional
    public InvoiceDto addPayment(Long id, InvoicePaymentRequest request) {
        Invoice invoice = load(id);
        applyPayment(invoice, request, true);
        Invoice saved = invoiceRepository.save(invoice);
        auditService.record(
                AuditService.PAYMENT_CREATE,
                "Invoice",
                String.valueOf(saved.getId()),
                Map.of(
                        "montant",
                        request.getMontant() != null ? request.getMontant().toPlainString() : "0",
                        "reference",
                        saved.getReference()));
        anomalyScoringService.scoreInvoiceAsync(saved.getId());
        return toDto(saved);
    }

    @Transactional
    public InvoiceDto settleByReference(String reference) {
        Invoice invoice =
                invoiceRepository
                        .findByReferenceIgnoreCase(reference)
                        .orElseThrow(() -> ApiException.notFound("Facture introuvable"));
        BigDecimal reste = invoice.reste();
        if (reste.compareTo(BigDecimal.ZERO) <= 0) {
            return toDto(invoice);
        }
        InvoicePaymentRequest pay = new InvoicePaymentRequest();
        pay.setMontant(reste);
        pay.setMode(invoice.getModePaiement() != null ? invoice.getModePaiement() : "especes");
        applyPayment(invoice, pay, true);
        return toDto(invoiceRepository.save(invoice));
    }

    @Transactional
    public InvoiceDto refund(Long id, InvoiceRefundRequest request) {
        if (request == null || request.getMontant() == null || request.getMontant().compareTo(BigDecimal.ZERO) <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "montant invalide");
        }
        if (isBlank(request.getReason())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "reason obligatoire");
        }
        Invoice invoice = load(id);
        if (invoice.getStatut() == InvoiceStatus.CANCELLED) {
            throw ApiException.conflict("invoice_cancelled", "Facture annulée");
        }
        BigDecimal netPaid = invoice.getAmountPaid().subtract(invoice.getAmountRefunded());
        if (request.getMontant().compareTo(netPaid) > 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Remboursement supérieur au net encaissé");
        }

        InvoiceStatus from = invoice.getStatut();
        InvoiceStatus to = workflowEngine.transitionInvoice(from, InvoiceStatus.REFUNDED);

        InvoiceRefund refund = new InvoiceRefund();
        refund.setInvoice(invoice);
        refund.setMontant(request.getMontant().setScale(2, RoundingMode.HALF_UP));
        refund.setReason(request.getReason().trim());
        Utilisateur actor = SecurityUtils.currentUserOrNull();
        if (actor != null) {
            refund.setCreatedById(actor.getId());
            refund.setCreatedByName(actor.getNomComplet());
        }
        invoice.getRefunds().add(refund);
        invoice.setAmountRefunded(invoice.getAmountRefunded().add(refund.getMontant()));
        invoice.setStatut(to);

        Invoice saved = invoiceRepository.save(invoice);
        auditService.record(
                AuditService.INVOICE_REFUND,
                "Invoice",
                String.valueOf(saved.getId()),
                Map.of("montant", refund.getMontant().toPlainString()));
        anomalyScoringService.scoreInvoiceAsync(saved.getId());
        return toDto(saved);
    }

    @Transactional
    public InvoiceDto cancel(Long id) {
        Invoice invoice = load(id);
        InvoiceStatus from = invoice.getStatut();
        if (from == InvoiceStatus.PAID || from == InvoiceStatus.PARTIALLY_PAID) {
            throw ApiException.conflict(
                    "invoice_cancel_blocked",
                    "Annuler impossible après encaissement — utiliser un remboursement");
        }
        InvoiceStatus to = workflowEngine.transitionInvoice(from, InvoiceStatus.CANCELLED);
        invoice.setStatut(to);
        invoice.setCancelledAt(LocalDateTime.now(ZONE));
        Invoice saved = invoiceRepository.save(invoice);
        auditService.record(
                AuditService.INVOICE_CANCEL,
                "Invoice",
                String.valueOf(saved.getId()),
                Map.of("reference", saved.getReference()));
        return toDto(saved);
    }

    private void applyPayment(Invoice invoice, InvoicePaymentRequest request, boolean persistAuditSync) {
        if (request == null || request.getMontant() == null || request.getMontant().compareTo(BigDecimal.ZERO) <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "montant invalide");
        }
        if (invoice.getStatut() == InvoiceStatus.CANCELLED || invoice.getStatut() == InvoiceStatus.REFUNDED) {
            throw ApiException.conflict("invoice_not_payable", "Facture non payable");
        }
        if (!isBlank(request.getIdempotencyKey())) {
            var existing = paymentRepository.findByIdempotencyKey(request.getIdempotencyKey().trim());
            if (existing.isPresent()) {
                return;
            }
        }

        BigDecimal montant = request.getMontant().setScale(2, RoundingMode.HALF_UP);
        BigDecimal reste = invoice.reste();
        if (montant.compareTo(reste) > 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Paiement supérieur au reste dû");
        }

        InvoicePayment payment = new InvoicePayment();
        payment.setInvoice(invoice);
        payment.setMontant(montant);
        payment.setMode(normalizeMode(request.getMode()));
        if (!isBlank(request.getIdempotencyKey())) {
            payment.setIdempotencyKey(request.getIdempotencyKey().trim());
        }
        Utilisateur actor = SecurityUtils.currentUserOrNull();
        if (actor != null) {
            payment.setCreatedById(actor.getId());
            payment.setCreatedByName(actor.getNomComplet());
        }
        invoice.getPayments().add(payment);
        invoice.setAmountPaid(invoice.getAmountPaid().add(montant));
        invoice.setModePaiement(payment.getMode());

        BigDecimal newReste = invoice.reste();
        InvoiceStatus target =
                newReste.compareTo(BigDecimal.ZERO) <= 0
                        ? InvoiceStatus.PAID
                        : InvoiceStatus.PARTIALLY_PAID;
        if (invoice.getStatut() != target) {
            invoice.setStatut(workflowEngine.transitionInvoice(invoice.getStatut(), target));
        }

        if (persistAuditSync && !invoice.getItems().isEmpty()) {
            Long examenId = invoice.getItems().get(0).getExamenId();
            if (examenId != null) {
                examenRepository.findById(examenId).ifPresent(ex -> syncExamenPayment(ex, invoice));
            }
        }
    }

    private void syncExamenPayment(Examen examen, Invoice invoice) {
        if (examen == null) {
            return;
        }
        examen.setMontant(invoice.getTotal());
        examen.setAcompte(invoice.getAmountPaid().subtract(invoice.getAmountRefunded()).max(BigDecimal.ZERO));
        if (invoice.getStatut() == InvoiceStatus.PAID) {
            examen.setPaiement(Paiement.paye);
        } else if (invoice.getAmountPaid().compareTo(BigDecimal.ZERO) > 0) {
            examen.setPaiement(Paiement.cote);
        } else {
            examen.setPaiement(Paiement.impaye);
        }
        examenRepository.save(examen);
    }

    private Invoice load(Long id) {
        return invoiceRepository
                .findByIdWithDetails(id)
                .orElseThrow(() -> ApiException.notFound("Facture introuvable"));
    }

    private String nextReference() {
        String prefix = "FAC-" + LocalDate.now(ZONE).getYear() + "-";
        long seq = invoiceRepository.countByReferenceStartingWith(prefix) + 1;
        return prefix + String.format("%06d", seq);
    }

    /**
     * Prix autoritatif : montant figé sur l'examen (snapshot catalogue à la création),
     * puis catalogue live uniquement si examen sans montant, puis montant client en dernier recours.
     */
    private BigDecimal resolveMontant(InvoiceCreateRequest request, Examen examen) {
        if (examen != null
                && examen.getMontant() != null
                && examen.getMontant().compareTo(BigDecimal.ZERO) > 0) {
            return examen.getMontant().setScale(2, RoundingMode.HALF_UP);
        }
        if (examen != null && examen.getCatalogue() != null && examen.getCatalogue().getPrix() != null) {
            return examen.getCatalogue().getPrix().setScale(2, RoundingMode.HALF_UP);
        }
        if (request.getMontant() != null) {
            if (request.getMontant().compareTo(BigDecimal.ZERO) < 0) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "montant invalide");
            }
            return request.getMontant().setScale(2, RoundingMode.HALF_UP);
        }
        return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
    }

    private InvoiceDto toDto(Invoice invoice) {
        Patient patient = invoice.getPatient();
        String label =
                invoice.getItems() == null || invoice.getItems().isEmpty()
                        ? ""
                        : invoice.getItems().get(0).getLabel();
        String uiStatut =
                switch (invoice.getStatut()) {
                    case PAID -> "Payé";
                    case CANCELLED -> "Annulé";
                    case REFUNDED -> "Annulé";
                    default -> "En attente de mutuelle";
                };
        String modeUi = uiMode(invoice.getModePaiement());
        return InvoiceDto.builder()
                .id(String.valueOf(invoice.getId()))
                .reference(invoice.getReference())
                .patientId(patient != null ? String.valueOf(patient.getId()) : null)
                .patient(patient != null ? patient.getNomComplet() : null)
                .patientName(patient != null ? patient.getNomComplet() : null)
                .examen(label)
                .acte(label)
                .statut(invoice.getStatut() != null ? invoice.getStatut().name() : null)
                .status(uiStatut)
                .total(invoice.getTotal())
                .amountPaid(invoice.getAmountPaid())
                .amountRefunded(invoice.getAmountRefunded())
                .reste(invoice.reste())
                .partMutuelle(invoice.getInsuranceShare())
                .resteACharge(invoice.getPatientShare().min(invoice.reste()))
                .insuranceShare(invoice.getInsuranceShare())
                .patientShare(invoice.getPatientShare())
                .remise(invoice.getRemise())
                .modePaiement(invoice.getModePaiement())
                .paiement(modeUi)
                .date(
                        invoice.getCreatedAt() != null
                                ? invoice.getCreatedAt().toLocalDate().toString()
                                : null)
                .createdAt(invoice.getCreatedAt())
                .items(
                        invoice.getItems() == null
                                ? List.of()
                                : invoice.getItems().stream()
                                        .map(
                                                it ->
                                                        InvoiceItemDto.builder()
                                                                .id(it.getId())
                                                                .examenId(it.getExamenId())
                                                                .catalogueId(it.getCatalogueId())
                                                                .label(it.getLabel())
                                                                .quantity(it.getQuantity())
                                                                .unitPrice(it.getUnitPrice())
                                                                .lineTotal(it.getLineTotal())
                                                                .build())
                                        .toList())
                .build();
    }

    private static String normalizeMode(String raw) {
        if (isBlank(raw)) {
            return "especes";
        }
        String v = raw.trim().toLowerCase();
        return switch (v) {
            case "espèces", "especes", "cash" -> "especes";
            case "carte", "carte bancaire", "cb" -> "carte";
            case "chèque", "cheque" -> "cheque";
            case "virement" -> "virement";
            default -> v;
        };
    }

    private static String uiMode(String mode) {
        return switch (normalizeMode(mode)) {
            case "carte" -> "Carte bancaire";
            case "cheque" -> "Chèque";
            case "virement" -> "Virement";
            default -> "Espèces";
        };
    }

    private static BigDecimal nz(BigDecimal v) {
        return v == null ? BigDecimal.ZERO : v;
    }

    private static boolean isBlank(String s) {
        return s == null || s.isBlank();
    }

    private static String firstNonBlank(String... values) {
        if (values == null) {
            return null;
        }
        for (String v : values) {
            if (!isBlank(v)) {
                return v.trim();
            }
        }
        return null;
    }
}
