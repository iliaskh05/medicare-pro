package com.crm.medicare.ml;

import com.crm.medicare.entity.CatalogueExamen;
import com.crm.medicare.entity.Examen;
import com.crm.medicare.entity.Invoice;
import com.crm.medicare.entity.InvoiceItem;
import com.crm.medicare.entity.InvoicePayment;
import com.crm.medicare.entity.Patient;
import com.crm.medicare.repository.DocumentExamenRepository;
import com.crm.medicare.repository.ExamenRepository;
import com.crm.medicare.repository.InvoiceRepository;
import com.crm.medicare.workflow.InvoiceStatus;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class AnomalyFeatureBuilder {

    private static final ZoneId ZONE = ZoneId.of("Africa/Casablanca");
    private static final DateTimeFormatter ISO = DateTimeFormatter.ISO_LOCAL_DATE_TIME;
    private static final Set<String> NON_RETRIEVED = Set.of("non_remis", "a_preparer", "pret");

    private final ExamenRepository examenRepository;
    private final DocumentExamenRepository documentExamenRepository;
    private final InvoiceRepository invoiceRepository;

    public Map<String, Object> build(Invoice invoice, Examen examen, OperatorHistoricalStats stats) {
        Patient patient = invoice.getPatient();
        InvoiceItem item = invoice.getItems().isEmpty() ? null : invoice.getItems().get(0);

        BigDecimal cataloguePrice = resolveCataloguePrice(examen, item);
        BigDecimal billed = nz(invoice.getTotal()).add(nz(invoice.getRemise()));
        BigDecimal remise = nz(invoice.getRemise());
        double discountPct =
                cataloguePrice.compareTo(BigDecimal.ZERO) > 0
                        ? remise
                                .multiply(BigDecimal.valueOf(100))
                                .divide(cataloguePrice, 2, RoundingMode.HALF_UP)
                                .doubleValue()
                        : 0.0;

        LocalDateTime examAt = examen != null ? examen.getDateExamen() : invoice.getIssuedAt();
        LocalDateTime invoiceAt = invoice.getIssuedAt() != null ? invoice.getIssuedAt() : invoice.getCreatedAt();
        LocalDateTime paymentAt = firstPaymentAt(invoice);

        boolean dossierNotRetrieved =
                examen != null
                        && examen.getDossierStatut() != null
                        && NON_RETRIEVED.contains(examen.getDossierStatut().toLowerCase());

        int documentCount =
                examen != null
                        ? documentExamenRepository.findByExamenIdOrderByCreatedAtDesc(examen.getId()).size()
                        : 0;

        Map<String, Object> payload = new HashMap<>();
        payload.put("operation_id", invoice.getReference());
        payload.put("invoice_id", invoice.getId());
        if (patient != null) {
            payload.put("patient_id", patient.getId());
            payload.put("patient_age", patientAge(patient));
            payload.put("patient_gender", patient.getSexe());
            payload.put("patient_insurance", patient.getMutuelle());
        }
        if (examen != null) {
            payload.put("exam_id", examen.getId());
            payload.put("exam_type", examen.getDescription());
            payload.put("modality", examen.getModalite() != null ? examen.getModalite().name() : null);
            payload.put("exam_status", examen.getWorkflowStatus() != null ? examen.getWorkflowStatus().name() : null);
            payload.put("priority", examen.getPriorite());
            payload.put("deposit_amount", nz(examen.getAcompte()).doubleValue());
            payload.put("dossier_status", examen.getDossierStatut());
            payload.put("dossier_not_retrieved", dossierNotRetrieved);
            if (examen.getDossierRemisAt() != null) {
                payload.put("dossier_retrieved_at", format(examen.getDossierRemisAt()));
            }
            payload.put("dossier_retrieved_by", examen.getDossierRemisPar());
            if (examen.getPrescripteur() != null) {
                payload.put("prescripteur", examen.getPrescripteur().getNom());
            } else if (examen.getPrescripteurNom() != null) {
                payload.put("prescripteur", examen.getPrescripteurNom());
            }
        }
        payload.put("operator_id", invoice.getCreatedById());
        payload.put("catalogue_price", cataloguePrice.doubleValue());
        payload.put("billed_amount", billed.doubleValue());
        payload.put("invoice_total", nz(invoice.getTotal()).doubleValue());
        payload.put("insurance_share", nz(invoice.getInsuranceShare()).doubleValue());
        payload.put("patient_share", nz(invoice.getPatientShare()).doubleValue());
        payload.put("amount_paid", nz(invoice.getAmountPaid()).doubleValue());
        payload.put("amount_refunded", nz(invoice.getAmountRefunded()).doubleValue());
        payload.put("discount_amount", remise.doubleValue());
        payload.put("discount_percentage", discountPct);
        payload.put("payment_method", invoice.getModePaiement());
        payload.put("payment_count", invoice.getPayments() != null ? invoice.getPayments().size() : 0);
        payload.put("document_count", documentCount);
        payload.put("document_uploaded", documentCount > 0);
        payload.put("invoice_modification_count", Math.max(0, invoice.getVersion() != null ? invoice.getVersion().intValue() - 1 : 0));
        payload.put("invoice_cancellation_count", invoice.getStatut() == InvoiceStatus.CANCELLED ? 1 : 0);
        payload.put("refund_count", invoice.getRefunds() != null ? invoice.getRefunds().size() : 0);

        if (patient != null && examAt != null) {
            LocalDateTime since30 = examAt.minusDays(30);
            LocalDateTime since90 = examAt.minusDays(90);
            long exams30 =
                    examenRepository.findByPatientIdOrderByDateExamenDesc(patient.getId()).stream()
                            .filter(e -> !e.getDateExamen().isBefore(since30) && !e.getDateExamen().isAfter(examAt))
                            .count();
            long exams90 =
                    examenRepository.findByPatientIdOrderByDateExamenDesc(patient.getId()).stream()
                            .filter(e -> !e.getDateExamen().isBefore(since90) && !e.getDateExamen().isAfter(examAt))
                            .count();
            payload.put("patient_exam_count_30d", exams30);
            payload.put("patient_exam_count_90d", exams90);
        }

        if (stats != null) {
            payload.put("operator_average_discount", stats.averageDiscountPct());
            payload.put("operator_discount_std", stats.discountStd());
            payload.put("operator_discount_rate", stats.discountRate());
            payload.put("operator_non_retrieval_rate", stats.nonRetrievalRate());
            payload.put("operator_cancellation_rate", stats.cancellationRate());
            payload.put("operator_refund_rate", stats.refundRate());
            payload.put("operator_modification_rate", stats.modificationRate());
            payload.put("operator_cash_payment_rate", stats.cashPaymentRate());
        }

        Map<String, Object> centerStats = new HashMap<>();
        centerStats.put("average_discount_pct", stats != null ? stats.centerAverageDiscountPct() : 5.0);
        centerStats.put("discount_std", stats != null ? stats.centerDiscountStd() : 8.0);
        centerStats.put("non_retrieval_rate", stats != null ? stats.centerNonRetrievalRate() : 0.05);
        centerStats.put("non_retrieval_std", 0.05);
        centerStats.put("refund_rate", stats != null ? stats.centerRefundRate() : 0.03);
        payload.put("center_stats", centerStats);

        if (examAt != null) {
            payload.put("exam_at", format(examAt));
        }
        if (invoiceAt != null) {
            payload.put("invoice_at", format(invoiceAt));
        }
        if (paymentAt != null) {
            payload.put("payment_at", format(paymentAt));
        }
        if (examAt != null && invoiceAt != null) {
            payload.put("exam_to_invoice_minutes", minutesBetween(examAt, invoiceAt));
        }
        if (examAt != null && paymentAt != null) {
            payload.put("exam_to_payment_minutes", minutesBetween(examAt, paymentAt));
        }
        if (invoiceAt != null && paymentAt != null) {
            payload.put("invoice_to_payment_minutes", minutesBetween(invoiceAt, paymentAt));
        }

        return payload;
    }

    private BigDecimal resolveCataloguePrice(Examen examen, InvoiceItem item) {
        if (examen != null && examen.getCatalogue() != null) {
            CatalogueExamen cat = examen.getCatalogue();
            if (cat.getPrix() != null && cat.getPrix().compareTo(BigDecimal.ZERO) > 0) {
                return cat.getPrix();
            }
        }
        if (item != null && item.getUnitPrice() != null && item.getUnitPrice().compareTo(BigDecimal.ZERO) > 0) {
            return item.getUnitPrice();
        }
        return BigDecimal.ZERO;
    }

    private static LocalDateTime firstPaymentAt(Invoice invoice) {
        List<InvoicePayment> payments = invoice.getPayments();
        if (payments == null || payments.isEmpty()) {
            return null;
        }
        return payments.stream()
                .map(InvoicePayment::getCreatedAt)
                .filter(d -> d != null)
                .min(LocalDateTime::compareTo)
                .orElse(null);
    }

    private static Integer patientAge(Patient patient) {
        if (patient.getDateNaissance() == null) {
            return null;
        }
        return (int) ChronoUnit.YEARS.between(patient.getDateNaissance(), LocalDateTime.now(ZONE).toLocalDate());
    }

    private static BigDecimal nz(BigDecimal value) {
        return value != null ? value : BigDecimal.ZERO;
    }

    private static String format(LocalDateTime dt) {
        return dt.atZone(ZONE).toLocalDateTime().format(ISO);
    }

    private static double minutesBetween(LocalDateTime start, LocalDateTime end) {
        return ChronoUnit.MINUTES.between(start, end);
    }

    public record OperatorHistoricalStats(
            double averageDiscountPct,
            double discountStd,
            double discountRate,
            double nonRetrievalRate,
            double cancellationRate,
            double refundRate,
            double modificationRate,
            double cashPaymentRate,
            double centerAverageDiscountPct,
            double centerDiscountStd,
            double centerNonRetrievalRate,
            double centerRefundRate) {}
}
