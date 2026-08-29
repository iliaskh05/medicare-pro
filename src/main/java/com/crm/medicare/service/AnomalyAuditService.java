package com.crm.medicare.service;

import com.crm.medicare.common.ApiException;
import com.crm.medicare.dto.AnomalieCaisseCompatDto;
import com.crm.medicare.dto.AnomalieDto;
import com.crm.medicare.dto.AuditKpisDto;
import com.crm.medicare.dto.TendanceAnomalieDto;
import com.crm.medicare.entity.AnomalyOperation;
import com.crm.medicare.entity.Examen;
import com.crm.medicare.entity.Invoice;
import com.crm.medicare.entity.Patient;
import com.crm.medicare.repository.AnomalyOperationRepository;
import com.crm.medicare.repository.ExamenRepository;
import com.crm.medicare.repository.InvoiceRepository;
import com.crm.medicare.security.SecurityUtils;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.temporal.WeekFields;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AnomalyAuditService {

    private static final ZoneId ZONE = ZoneId.of("Africa/Casablanca");
    private static final int DEFAULT_MIN_SCORE = 30;

    private final AnomalyOperationRepository anomalyOperationRepository;
    private final InvoiceRepository invoiceRepository;
    private final ExamenRepository examenRepository;

    @Transactional(readOnly = true)
    public List<AnomalieDto> listAnomalies() {
        LocalDateTime since = LocalDateTime.now(ZONE).minusDays(90);
        return anomalyOperationRepository.findRecentSince(since).stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<AnomalieDto> listPatientAnomalies(Long patientId) {
        return anomalyOperationRepository.findByPatientIdOrderByCreatedAtDesc(patientId).stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public AuditKpisDto kpis() {
        LocalDateTime now = LocalDateTime.now(ZONE);
        LocalDateTime since30 = now.minusDays(30);
        LocalDateTime prev30Start = now.minusDays(60);
        long current = anomalyOperationRepository.countByCreatedAtGreaterThanEqual(since30);
        long previous =
                anomalyOperationRepository.countByCreatedAtGreaterThanEqual(prev30Start) - current;
        double delta = previous > 0 ? ((current - previous) * 100.0 / previous) : 0.0;

        long pending = anomalyOperationRepository.countByDecisionAndCreatedAtGreaterThanEqual("pending", since30);
        double avgScore = anomalyOperationRepository.averageScoreSince(since30);
        double conformite = Math.max(0.0, Math.min(100.0, 100.0 - avgScore));

        BigDecimal montantEnJeu =
                anomalyOperationRepository.findAlertsSince(since30, DEFAULT_MIN_SCORE).stream()
                        .map(a -> nz(a.getBilledAmount()).subtract(nz(a.getCataloguePrice())))
                        .filter(v -> v.compareTo(BigDecimal.ZERO) > 0)
                        .reduce(BigDecimal.ZERO, BigDecimal::add);

        return AuditKpisDto.builder()
                .dossiersAnalyses(current)
                .dossiersAnalysesDelta(Math.round(delta * 10.0) / 10.0)
                .tauxConformite(Math.round(conformite * 10.0) / 10.0)
                .tauxConformiteDelta(0.0)
                .montantEnJeu(montantEnJeu)
                .build();
    }

    @Transactional(readOnly = true)
    public List<TendanceAnomalieDto> tendance() {
        LocalDateTime since = LocalDateTime.now(ZONE).minusWeeks(8);
        Map<String, long[]> buckets = new LinkedHashMap<>();
        WeekFields wf = WeekFields.of(Locale.FRANCE);
        DateTimeFormatter label = DateTimeFormatter.ofPattern("dd MMM", Locale.FRANCE);

        for (AnomalyOperation op : anomalyOperationRepository.findRecentSince(since)) {
            if (op.getCreatedAt() == null) {
                continue;
            }
            var week = op.getCreatedAt().toLocalDate().get(wf.weekOfWeekBasedYear());
            int year = op.getCreatedAt().toLocalDate().get(wf.weekBasedYear());
            String key = "S" + week + " " + year;
            buckets.computeIfAbsent(key, k -> new long[2]);
            buckets.get(key)[0]++;
            if ("confirmed".equals(op.getDecision())) {
                buckets.get(key)[1]++;
            }
        }

        List<TendanceAnomalieDto> out = new ArrayList<>();
        for (Map.Entry<String, long[]> e : buckets.entrySet()) {
            out.add(
                    TendanceAnomalieDto.builder()
                            .semaine(e.getKey())
                            .anomalies(e.getValue()[0])
                            .confirmees(e.getValue()[1])
                            .build());
        }
        if (out.isEmpty()) {
            out.add(TendanceAnomalieDto.builder().semaine("—").anomalies(0).confirmees(0).build());
        }
        return out;
    }

    @Transactional(readOnly = true)
    public AnomalieCaisseCompatDto caisseCompat() {
        LocalDateTime since = LocalDateTime.now(ZONE).minusDays(30);
        List<AnomalyOperation> alerts =
                anomalyOperationRepository.findAlertsSince(since, DEFAULT_MIN_SCORE);
        long critiques = alerts.stream().filter(a -> a.getAnomalyScore() >= 85).count();
        long moyennes = alerts.stream().filter(a -> a.getAnomalyScore() >= 50 && a.getAnomalyScore() < 85).count();
        long faibles = alerts.stream().filter(a -> a.getAnomalyScore() < 50).count();
        double avg = alerts.stream().mapToInt(AnomalyOperation::getAnomalyScore).average().orElse(0.0);

        AnomalyOperation top = alerts.isEmpty() ? null : alerts.get(0);
        double remise = top != null && top.getDiscountAmount() != null && top.getCataloguePrice() != null
                && top.getCataloguePrice().compareTo(BigDecimal.ZERO) > 0
                ? top.getDiscountAmount()
                        .multiply(BigDecimal.valueOf(100))
                        .divide(top.getCataloguePrice(), 2, java.math.RoundingMode.HALF_UP)
                        .doubleValue()
                : 0.0;

        return AnomalieCaisseCompatDto.builder()
                .totalAnomalies(alerts.size())
                .scoreRisqueMoyen(Math.round(avg * 10.0) / 10.0)
                .alertesCritiques(critiques)
                .alertesMoyennes(moyennes)
                .alertesFaibles(faibles)
                .delaiReglementMinutes(0)
                .tauxRemise(remise)
                .annulationPostActe("Aucune")
                .seuilDelaiMinutes(45)
                .seuilRemise(10)
                .guichet("Accueil")
                .scoreRisque(top != null ? top.getAnomalyScore() : 0)
                .message(
                        top != null && top.getReasons() != null && !top.getReasons().isEmpty()
                                ? top.getReasons().get(0)
                                : "Analyse ML — en attente de données")
                .generatedAt(LocalDateTime.now(ZONE).toString())
                .build();
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> urgences() {
        return anomalyOperationRepository.findAlertsSince(LocalDateTime.now(ZONE).minusDays(7), 70).stream()
                .limit(10)
                .map(
                        a -> {
                            Map<String, Object> row = new LinkedHashMap<>();
                            row.put("id", a.getOperationId());
                            row.put("patient", patientName(a));
                            row.put("anomalie", a.getReasons() != null && !a.getReasons().isEmpty()
                                    ? a.getReasons().get(0)
                                    : "Score " + a.getAnomalyScore());
                            row.put("score", a.getAnomalyScore());
                            row.put("niveau", a.getNiveau());
                            return row;
                        })
                .collect(Collectors.toList());
    }

    @Transactional
    public void updateDecision(String operationId, String statut) {
        if (!"confirmed".equals(statut) && !"dismissed".equals(statut)) {
            throw ApiException.badRequest("statut invalide");
        }
        AnomalyOperation op =
                anomalyOperationRepository
                        .findByOperationId(operationId)
                        .orElseThrow(() -> ApiException.notFound("Anomalie introuvable"));
        op.setDecision(statut);
        op.setReviewedAt(LocalDateTime.now(ZONE));
        var user = SecurityUtils.currentUserOrNull();
        if (user != null) {
            op.setReviewedById(user.getId());
        }
        anomalyOperationRepository.save(op);
    }

    private AnomalieDto toDto(AnomalyOperation op) {
        if (AuditDemoService.isDemo(op)) {
            return demoToDto(op);
        }
        Invoice invoice = op.getInvoiceId() != null ? invoiceRepository.findById(op.getInvoiceId()).orElse(null) : null;
        Examen examen = op.getExamenId() != null ? examenRepository.findByIdWithPatient(op.getExamenId()).orElse(null) : null;
        Patient patient = examen != null ? examen.getPatient() : (invoice != null ? invoice.getPatient() : null);

        String acte = examen != null ? firstNonBlank(examen.getDescription(), "Examen") : "Facturation";
        String typeExamen = mapModality(examen);
        String prescripteur = "—";
        if (examen != null) {
            if (examen.getPrescripteur() != null) {
                prescripteur = examen.getPrescripteur().getNom();
            } else if (examen.getPrescripteurNom() != null) {
                prescripteur = examen.getPrescripteurNom();
            }
        }

        List<String> motifs = mapMotifs(op);
        String cluster =
                op.getClusterId() != null
                        ? "Cluster " + op.getClusterId()
                        : "Non assigné";

        return AnomalieDto.builder()
                .id(op.getOperationId())
                .patient(patient != null ? patient.getNomComplet() : "—")
                .cin(patient != null && patient.getCin() != null ? patient.getCin() : "—")
                .acte(acte)
                .typeExamen(typeExamen)
                .date(op.getCreatedAt())
                .montant(nz(op.getBilledAmount()))
                .bareme(nz(op.getCataloguePrice()))
                .score(op.getAnomalyScore())
                .motifs(motifs)
                .cluster(cluster)
                .prescripteur(prescripteur)
                .mutuelle(patient != null && patient.getMutuelle() != null ? patient.getMutuelle() : "—")
                .statut(op.getDecision())
                .build();
    }

    private static AnomalieDto demoToDto(AnomalyOperation op) {
        String cluster =
                op.getClusterId() != null ? "Cluster " + op.getClusterId() : "Non assigné";
        return AnomalieDto.builder()
                .id(op.getOperationId())
                .patient(AuditDemoService.demoFeature(op, "patient", "Patient démo"))
                .cin(AuditDemoService.demoFeature(op, "cin", "DEMO"))
                .acte(AuditDemoService.demoFeature(op, "acte", "Examen démo"))
                .typeExamen(AuditDemoService.demoFeature(op, "typeExamen", "Radiologie"))
                .date(op.getCreatedAt())
                .montant(nz(op.getBilledAmount()))
                .bareme(nz(op.getCataloguePrice()))
                .score(op.getAnomalyScore())
                .motifs(mapMotifs(op))
                .cluster(cluster)
                .prescripteur(AuditDemoService.demoFeature(op, "prescripteur", "—"))
                .mutuelle(AuditDemoService.demoFeature(op, "mutuelle", "—"))
                .statut(op.getDecision())
                .build();
    }

    private static List<String> mapMotifs(AnomalyOperation op) {
        if (op.getReasons() != null && !op.getReasons().isEmpty()) {
            return op.getReasons();
        }
        if (op.getTriggeredRules() != null && !op.getTriggeredRules().isEmpty()) {
            return op.getTriggeredRules();
        }
        return List.of("Revue de routine");
    }

    private static String mapModality(Examen examen) {
        if (examen == null || examen.getModalite() == null) {
            return "Radiologie";
        }
        return switch (examen.getModalite()) {
            case IRM -> "IRM";
            case Scanner -> "Scanner";
            case Échographie -> "Échographie";
            case Mammographie -> "Mammographie";
            default -> "Radiologie";
        };
    }

    private static String patientName(AnomalyOperation op) {
        return op.getOperationId();
    }

    private static BigDecimal nz(BigDecimal v) {
        return v != null ? v : BigDecimal.ZERO;
    }

    private static String firstNonBlank(String... values) {
        for (String v : values) {
            if (v != null && !v.isBlank()) {
                return v;
            }
        }
        return "—";
    }
}
