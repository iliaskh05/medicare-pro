package com.crm.medicare.service;

import com.crm.medicare.dto.AuditDemoExampleDto;
import com.crm.medicare.dto.AuditDemoStatusDto;
import com.crm.medicare.entity.AnomalyOperation;
import com.crm.medicare.repository.AnomalyOperationRepository;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Jeu de démonstration pour le module Audit — 3 dossiers fictifs illustrant les scénarios ML
 * (remise élevée, dossier non récupéré, profil opérateur atypique).
 */
@Service
@RequiredArgsConstructor
public class AuditDemoService {

    static final String DEMO_PREFIX = "DEMO-AUDIT-";

    private static final ZoneId ZONE = ZoneId.of("Africa/Casablanca");

    private final AnomalyOperationRepository anomalyOperationRepository;

    @Transactional(readOnly = true)
    public AuditDemoStatusDto status() {
        List<AnomalyOperation> rows = anomalyOperationRepository.findByOperationIdStartingWith(DEMO_PREFIX);
        return AuditDemoStatusDto.builder()
                .loaded(!rows.isEmpty())
                .count(rows.size())
                .operationIds(rows.stream().map(AnomalyOperation::getOperationId).toList())
                .build();
    }

    @Transactional(readOnly = true)
    public List<AuditDemoExampleDto> examples() {
        return List.of(
                AuditDemoExampleDto.builder()
                        .id(DEMO_PREFIX + "001")
                        .title("Remise 50 % + dossier non récupéré")
                        .summary(
                                "Scanner facturé à 500 MAD au lieu de 1 000 MAD. Dossier jamais remis au patient. "
                                        + "Profil opérateur avec taux de non-récupération élevé.")
                        .expectedScore(72)
                        .niveau("élevé")
                        .signals(
                                List.of(
                                        "Remise de 50 %",
                                        "Dossier non récupéré",
                                        "Taux non-récupération opérateur élevé",
                                        "Écart au tarif catalogue"))
                        .patient("Fatima Alaoui")
                        .acte("Scanner thoracique")
                        .build(),
                AuditDemoExampleDto.builder()
                        .id(DEMO_PREFIX + "002")
                        .title("Remise exceptionnelle 60 %")
                        .summary(
                                "IRM Lombaire facturée 1 000 MAD (barème 2 500 MAD). Remise très au-dessus "
                                        + "de la moyenne du centre (z-score élevé).")
                        .expectedScore(78)
                        .niveau("élevé")
                        .signals(
                                List.of(
                                        "Remise de 60 %",
                                        "Remise très supérieure à la moyenne du centre",
                                        "Montant facturé éloigné du tarif catalogue"))
                        .patient("Youssef Bennani")
                        .acte("IRM Lombaire")
                        .build(),
                AuditDemoExampleDto.builder()
                        .id(DEMO_PREFIX + "003")
                        .title("Opérateur atypique (multi-signaux)")
                        .summary(
                                "Échographie avec remise 35 %, 4 modifications de facture et historique opérateur "
                                        + "marqué (65 % dossiers non récupérés, taux remboursement élevé).")
                        .expectedScore(88)
                        .niveau("critique")
                        .signals(
                                List.of(
                                        "Remise anormale pour cet opérateur",
                                        "4 modifications sur la facture",
                                        "Comportement opérateur atypique",
                                        "Isolation Forest — profil rare"))
                        .patient("Khadija Amrani")
                        .acte("Échographie abdominale")
                        .build());
    }

    @Transactional
    public AuditDemoStatusDto load() {
        reset();
        LocalDateTime now = LocalDateTime.now(ZONE);
        List<AnomalyOperation> rows = new ArrayList<>();
        rows.add(buildDemo001(now.minusDays(3)));
        rows.add(buildDemo002(now.minusDays(10)));
        rows.add(buildDemo003(now.minusDays(18)));
        anomalyOperationRepository.saveAll(rows);
        return status();
    }

    @Transactional
    public AuditDemoStatusDto reset() {
        anomalyOperationRepository.deleteByOperationIdStartingWith(DEMO_PREFIX);
        return status();
    }

    private static AnomalyOperation buildDemo001(LocalDateTime createdAt) {
        Map<String, Object> features = demoFeatures(
                "Fatima Alaoui",
                "DEMO-CIN-101",
                "Scanner thoracique",
                "Scanner",
                "Dr. Benjelloun",
                "CNOPS");
        return AnomalyOperation.builder()
                .operationId(DEMO_PREFIX + "001")
                .anomalyScore(72)
                .niveau("élevé")
                .clusterId(2)
                .clusterDistance(new BigDecimal("1.8420"))
                .isolationAnomaly(true)
                .isolationScore(new BigDecimal("68.50"))
                .triggeredRules(
                        List.of(
                                "RULE_HIGH_DISCOUNT",
                                "RULE_HIGH_NON_RETRIEVAL_RATE",
                                "RULE_PRICE_DEVIATION",
                                "RULE_OPERATOR_NON_RETRIEVAL_OUTLIER"))
                .reasons(
                        List.of(
                                "Remise de 50 %",
                                "Taux de dossiers non récupérés inhabituellement élevé",
                                "Montant facturé éloigné du tarif catalogue",
                                "Comportement opérateur atypique (non-récupération)"))
                .features(features)
                .modelVersion("fraud-demo")
                .decision("pending")
                .cataloguePrice(new BigDecimal("1000.00"))
                .billedAmount(new BigDecimal("500.00"))
                .discountAmount(new BigDecimal("500.00"))
                .createdAt(createdAt)
                .build();
    }

    private static AnomalyOperation buildDemo002(LocalDateTime createdAt) {
        Map<String, Object> features = demoFeatures(
                "Youssef Bennani",
                "DEMO-CIN-102",
                "IRM Lombaire",
                "IRM",
                "Dr. Tazi",
                "CNSS");
        return AnomalyOperation.builder()
                .operationId(DEMO_PREFIX + "002")
                .anomalyScore(78)
                .niveau("élevé")
                .clusterId(4)
                .clusterDistance(new BigDecimal("2.1050"))
                .isolationAnomaly(true)
                .isolationScore(new BigDecimal("71.20"))
                .triggeredRules(
                        List.of("RULE_HIGH_DISCOUNT", "RULE_DISCOUNT_OUTLIER", "RULE_PRICE_DEVIATION"))
                .reasons(
                        List.of(
                                "Remise de 60 %",
                                "Remise très supérieure à la moyenne du centre",
                                "Montant facturé éloigné du tarif catalogue"))
                .features(features)
                .modelVersion("fraud-demo")
                .decision("pending")
                .cataloguePrice(new BigDecimal("2500.00"))
                .billedAmount(new BigDecimal("1000.00"))
                .discountAmount(new BigDecimal("1500.00"))
                .createdAt(createdAt)
                .build();
    }

    private static AnomalyOperation buildDemo003(LocalDateTime createdAt) {
        Map<String, Object> features = demoFeatures(
                "Khadija Amrani",
                "DEMO-CIN-103",
                "Échographie abdominale",
                "Échographie",
                "Dr. Alaoui",
                "SAHAM");
        return AnomalyOperation.builder()
                .operationId(DEMO_PREFIX + "003")
                .anomalyScore(88)
                .niveau("critique")
                .clusterId(1)
                .clusterDistance(new BigDecimal("2.8900"))
                .isolationAnomaly(true)
                .isolationScore(new BigDecimal("82.40"))
                .triggeredRules(
                        List.of(
                                "RULE_OPERATOR_DISCOUNT_OUTLIER",
                                "RULE_EXCESSIVE_MODIFICATIONS",
                                "RULE_HIGH_NON_RETRIEVAL_RATE",
                                "RULE_EXCESSIVE_REFUNDS"))
                .reasons(
                        List.of(
                                "Remise anormale pour cet opérateur",
                                "4 modification(s) sur la facture",
                                "Taux de dossiers non récupérés inhabituellement élevé",
                                "Comportement éloigné du cluster habituel (Isolation Forest)"))
                .features(features)
                .modelVersion("fraud-demo")
                .decision("pending")
                .cataloguePrice(new BigDecimal("450.00"))
                .billedAmount(new BigDecimal("292.50"))
                .discountAmount(new BigDecimal("157.50"))
                .createdAt(createdAt)
                .build();
    }

    private static Map<String, Object> demoFeatures(
            String patient,
            String cin,
            String acte,
            String typeExamen,
            String prescripteur,
            String mutuelle) {
        Map<String, Object> features = new LinkedHashMap<>();
        features.put("demo", true);
        features.put("patient", patient);
        features.put("cin", cin);
        features.put("acte", acte);
        features.put("typeExamen", typeExamen);
        features.put("prescripteur", prescripteur);
        features.put("mutuelle", mutuelle);
        return features;
    }

    /** Lit les métadonnées d'affichage stockées dans {@code features} pour les dossiers DEMO. */
    static String demoFeature(AnomalyOperation op, String key, String fallback) {
        Map<String, Object> features = op.getFeatures();
        if (features == null) {
            return fallback;
        }
        Object value = features.get(key);
        return value != null && !String.valueOf(value).isBlank() ? String.valueOf(value) : fallback;
    }

    static boolean isDemo(AnomalyOperation op) {
        return op.getOperationId() != null && op.getOperationId().startsWith(DEMO_PREFIX);
    }
}
