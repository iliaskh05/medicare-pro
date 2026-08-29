package com.crm.medicare.service;

import com.crm.medicare.entity.AnomalyOperation;
import com.crm.medicare.entity.Examen;
import com.crm.medicare.entity.Invoice;
import com.crm.medicare.entity.InvoiceItem;
import com.crm.medicare.ml.AnomalyFeatureBuilder;
import com.crm.medicare.ml.FraudMlClient;
import com.crm.medicare.ml.OperatorHistoricalStatsService;
import com.crm.medicare.repository.AnomalyOperationRepository;
import com.crm.medicare.repository.ExamenRepository;
import com.crm.medicare.repository.InvoiceRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AnomalyScoringService {

    private static final Logger log = LoggerFactory.getLogger(AnomalyScoringService.class);

    private final FraudMlClient fraudMlClient;
    private final AnomalyFeatureBuilder featureBuilder;
    private final OperatorHistoricalStatsService statsService;
    private final InvoiceRepository invoiceRepository;
    private final ExamenRepository examenRepository;
    private final AnomalyOperationRepository anomalyOperationRepository;
    private final ObjectMapper objectMapper;

    @Async
    public void scoreInvoiceAsync(Long invoiceId) {
        try {
            scoreInvoice(invoiceId);
        } catch (Exception ex) {
            log.warn("Scoring async facture {} échoué: {}", invoiceId, ex.getMessage());
        }
    }

    @Transactional
    public Optional<AnomalyOperation> scoreInvoice(Long invoiceId) {
        if (!fraudMlClient.isEnabled()) {
            log.debug("ML désactivé — scoring ignoré pour facture {}", invoiceId);
            return Optional.empty();
        }
        Invoice invoice =
                invoiceRepository
                        .findByIdWithDetails(invoiceId)
                        .orElseThrow(() -> new IllegalArgumentException("Facture introuvable: " + invoiceId));
        // Lazy collections — initialisées dans la transaction courante
        if (invoice.getPayments() != null) {
            invoice.getPayments().size();
        }
        if (invoice.getRefunds() != null) {
            invoice.getRefunds().size();
        }

        Examen examen = resolveExamen(invoice);
        var stats = statsService.compute(invoice, examen);
        Map<String, Object> payload = featureBuilder.build(invoice, examen, stats);

        JsonNode result;
        try {
            result = fraudMlClient.score(payload);
        } catch (Exception ex) {
            log.warn("ML injoignable pour {}: {}", invoice.getReference(), ex.getMessage());
            return Optional.empty();
        }

        AnomalyOperation row = anomalyOperationRepository.findByInvoiceId(invoiceId).orElseGet(AnomalyOperation::new);
        row.setOperationId(invoice.getReference());
        row.setInvoiceId(invoice.getId());
        row.setExamenId(examen != null ? examen.getId() : null);
        row.setPatientId(invoice.getPatient() != null ? invoice.getPatient().getId() : null);
        row.setOperatorId(invoice.getCreatedById());
        row.setAnomalyScore(result.path("score").asInt(result.path("anomaly_score").asInt(0)));
        row.setNiveau(text(result, "niveau", "faible"));
        row.setClusterId(result.path("cluster_id").isNull() ? null : result.path("cluster_id").asInt());
        row.setClusterDistance(decimal(result, "cluster_distance"));
        row.setIsolationAnomaly(result.path("isolation_anomaly").asBoolean(false));
        row.setIsolationScore(decimal(result, "isolation_score"));
        row.setTriggeredRules(readStringList(result.get("triggered_rules")));
        row.setReasons(readStringList(result.get("reasons")));
        row.setModelVersion(text(result, "model_version", null));
        row.setDecision("pending");
        row.setCataloguePrice(
                payload.get("catalogue_price") != null
                        ? BigDecimal.valueOf(((Number) payload.get("catalogue_price")).doubleValue())
                        : null);
        row.setBilledAmount(
                payload.get("billed_amount") != null
                        ? BigDecimal.valueOf(((Number) payload.get("billed_amount")).doubleValue())
                        : null);
        row.setDiscountAmount(
                payload.get("discount_amount") != null
                        ? BigDecimal.valueOf(((Number) payload.get("discount_amount")).doubleValue())
                        : null);
        if (result.has("features") && result.get("features").isObject()) {
            row.setFeatures(objectMapper.convertValue(result.get("features"), Map.class));
        }

        AnomalyOperation saved = anomalyOperationRepository.save(row);
        log.info(
                "Anomalie scorée ref={} score={} niveau={} model={}",
                saved.getOperationId(),
                saved.getAnomalyScore(),
                saved.getNiveau(),
                saved.getModelVersion());
        return Optional.of(saved);
    }

    @Transactional
    public int rescoreRecentInvoices(int days) {
        if (!fraudMlClient.isEnabled()) {
            return 0;
        }
        java.time.LocalDateTime since = java.time.LocalDateTime.now().minusDays(days);
        int count = 0;
        for (Invoice invoice : invoiceRepository.findAllWithPatient()) {
            if (invoice.getCreatedAt() == null || invoice.getCreatedAt().isBefore(since)) {
                continue;
            }
            if (scoreInvoice(invoice.getId()).isPresent()) {
                count++;
            }
        }
        return count;
    }

    private Examen resolveExamen(Invoice invoice) {
        for (InvoiceItem item : invoice.getItems()) {
            if (item.getExamenId() != null) {
                return examenRepository.findByIdWithPatient(item.getExamenId()).orElse(null);
            }
        }
        return null;
    }

    private static String text(JsonNode node, String field, String fallback) {
        JsonNode value = node.get(field);
        return value == null || value.isNull() ? fallback : value.asText(fallback);
    }

    private static BigDecimal decimal(JsonNode node, String field) {
        JsonNode value = node.get(field);
        if (value == null || value.isNull()) {
            return null;
        }
        return BigDecimal.valueOf(value.asDouble());
    }

    private static List<String> readStringList(JsonNode node) {
        List<String> out = new ArrayList<>();
        if (node == null || !node.isArray()) {
            return out;
        }
        Iterator<JsonNode> it = node.elements();
        while (it.hasNext()) {
            out.add(it.next().asText());
        }
        return out;
    }
}
