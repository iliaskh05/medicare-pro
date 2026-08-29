package com.crm.medicare.ml;

import com.crm.medicare.entity.Examen;
import com.crm.medicare.entity.Invoice;
import com.crm.medicare.ml.AnomalyFeatureBuilder.OperatorHistoricalStats;
import com.crm.medicare.repository.ExamenRepository;
import com.crm.medicare.repository.InvoiceRepository;
import com.crm.medicare.workflow.InvoiceStatus;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Statistiques opérateur calculées uniquement sur l'historique antérieur à l'opération
 * analysée (anti data-leakage).
 */
@Service
@RequiredArgsConstructor
public class OperatorHistoricalStatsService {

    private static final Set<String> NON_RETRIEVED = Set.of("non_remis", "a_preparer", "pret");

    private final InvoiceRepository invoiceRepository;
    private final ExamenRepository examenRepository;

    @Transactional(readOnly = true)
    public OperatorHistoricalStats compute(Invoice invoice, Examen examen) {
        LocalDateTime anchor = invoice.getCreatedAt() != null ? invoice.getCreatedAt() : LocalDateTime.now();
        Long operatorId = invoice.getCreatedById();

        List<Invoice> priorInvoices =
                invoiceRepository.findAllWithPatient().stream()
                        .filter(i -> i.getCreatedAt() != null && i.getCreatedAt().isBefore(anchor))
                        .filter(i -> i.getStatut() != InvoiceStatus.CANCELLED)
                        .toList();

        List<Invoice> operatorPrior =
                operatorId == null
                        ? List.of()
                        : priorInvoices.stream()
                                .filter(i -> operatorId.equals(i.getCreatedById()))
                                .toList();

        double opDiscountRate = rate(operatorPrior, this::discountPct);
        double opAvgDiscount = average(operatorPrior.stream().map(this::discountPct).toList());
        double opDiscountStd = std(operatorPrior.stream().map(this::discountPct).toList());

        double opNonRetrieval = operatorNonRetrievalRate(operatorId, anchor, operatorPrior.size());
        double opCancellation = rate(operatorPrior, i -> i.getStatut() == InvoiceStatus.CANCELLED ? 1.0 : 0.0);
        double opRefund =
                rate(
                        operatorPrior,
                        i -> i.getAmountRefunded() != null && i.getAmountRefunded().compareTo(BigDecimal.ZERO) > 0
                                ? 1.0
                                : 0.0);
        double opModification =
                rate(operatorPrior, i -> i.getVersion() != null && i.getVersion() > 1 ? 1.0 : 0.0);
        double opCash =
                rate(
                        operatorPrior,
                        i ->
                                i.getModePaiement() != null
                                        && i.getModePaiement().toLowerCase().contains("espe")
                                        ? 1.0
                                        : 0.0);

        double centerAvg = average(priorInvoices.stream().map(this::discountPct).toList());
        double centerStd = std(priorInvoices.stream().map(this::discountPct).toList());
        double centerNonRetrieval = centerNonRetrievalRate(anchor);
        double centerRefund =
                rate(
                        priorInvoices,
                        i -> i.getAmountRefunded() != null && i.getAmountRefunded().compareTo(BigDecimal.ZERO) > 0
                                ? 1.0
                                : 0.0);

        return new OperatorHistoricalStats(
                opAvgDiscount,
                opDiscountStd,
                opDiscountRate,
                opNonRetrieval,
                opCancellation,
                opRefund,
                opModification,
                opCash,
                centerAvg,
                centerStd,
                centerNonRetrieval,
                centerRefund);
    }

    private double operatorNonRetrievalRate(Long operatorId, LocalDateTime anchor, int invoiceCount) {
        if (operatorId == null || invoiceCount == 0) {
            return 0.05;
        }
        long total = 0;
        long nonRetrieved = 0;
        for (Examen e : examenRepository.findAll()) {
            if (e.getCreatedAt() == null || !e.getCreatedAt().isBefore(anchor)) {
                continue;
            }
            if (e.getCreatedBy() == null || !operatorId.equals(e.getCreatedBy().getId())) {
                continue;
            }
            total++;
            if (e.getDossierStatut() != null && NON_RETRIEVED.contains(e.getDossierStatut().toLowerCase())) {
                nonRetrieved++;
            }
        }
        return total == 0 ? 0.05 : (double) nonRetrieved / total;
    }

    private double centerNonRetrievalRate(LocalDateTime anchor) {
        long total = 0;
        long nonRetrieved = 0;
        for (Examen e : examenRepository.findAll()) {
            if (e.getCreatedAt() == null || !e.getCreatedAt().isBefore(anchor)) {
                continue;
            }
            total++;
            if (e.getDossierStatut() != null && NON_RETRIEVED.contains(e.getDossierStatut().toLowerCase())) {
                nonRetrieved++;
            }
        }
        return total == 0 ? 0.05 : (double) nonRetrieved / total;
    }

    private double discountPct(Invoice invoice) {
        BigDecimal remise = invoice.getRemise() != null ? invoice.getRemise() : BigDecimal.ZERO;
        BigDecimal base = invoice.getTotal() != null ? invoice.getTotal().add(remise) : remise;
        if (base.compareTo(BigDecimal.ZERO) <= 0) {
            return 0.0;
        }
        return remise.multiply(BigDecimal.valueOf(100)).divide(base, 2, RoundingMode.HALF_UP).doubleValue();
    }

    private static double rate(List<Invoice> rows, java.util.function.ToDoubleFunction<Invoice> fn) {
        if (rows.isEmpty()) {
            return 0.0;
        }
        return rows.stream().mapToDouble(fn).average().orElse(0.0);
    }

    private static double average(List<Double> values) {
        if (values.isEmpty()) {
            return 5.0;
        }
        return values.stream().mapToDouble(Double::doubleValue).average().orElse(5.0);
    }

    private static double std(List<Double> values) {
        if (values.size() < 2) {
            return 8.0;
        }
        double mean = average(values);
        double variance =
                values.stream().mapToDouble(v -> Math.pow(v - mean, 2)).average().orElse(0.0);
        return Math.max(1.0, Math.sqrt(variance));
    }
}
