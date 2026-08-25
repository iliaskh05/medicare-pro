package com.crm.medicare.dashboard;

import com.crm.medicare.dto.AlerteDto;
import com.crm.medicare.dto.DashboardKpisDto;
import com.crm.medicare.dto.SalleAttenteDto;
import com.crm.medicare.entity.EtatPatient;
import com.crm.medicare.entity.Examen;
import com.crm.medicare.entity.Paiement;
import com.crm.medicare.entity.StatutCr;
import com.crm.medicare.workflow.EncounterStatus;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.Set;

/**
 * Agrégats dashboard à partir d'examens déjà chargés. Pas de tarifs fictifs.
 */
public final class DashboardMetrics {

    public static final String STATUT_EN_ATTENTE = "En attente";
    public static final String STATUT_EN_COURS = "En cours";
    public static final String STATUT_PREPARATION = "Préparation";

    private static final DateTimeFormatter HEURE = DateTimeFormatter.ofPattern("HH:mm");
    private static final DateTimeFormatter TEMPS = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
    private static final int LIST_LIMIT = 20;

    private static final Set<EncounterStatus> CANCELLED =
            Set.of(EncounterStatus.CANCELLED, EncounterStatus.NO_SHOW);
    private static final Set<EncounterStatus> PERFORMED =
            Set.of(
                    EncounterStatus.COMPLETED,
                    EncounterStatus.REPORT_PENDING,
                    EncounterStatus.VALIDATED,
                    EncounterStatus.DISCHARGED);
    private static final Set<EncounterStatus> IN_FACILITY =
            Set.of(
                    EncounterStatus.ARRIVED,
                    EncounterStatus.WAITING,
                    EncounterStatus.PREPARING,
                    EncounterStatus.IN_PROGRESS);
    private static final Set<EtatPatient> IN_FACILITY_LEGACY =
            Set.of(EtatPatient.arrive, EtatPatient.retard, EtatPatient.attente_longue);
    private static final Set<StatutCr> REPORT_DONE = Set.of(StatutCr.signe, StatutCr.imprime);
    private static final Set<StatutCr> REPORT_PENDING = Set.of(StatutCr.a_faire, StatutCr.en_redaction);

    private DashboardMetrics() {}

    public static boolean isCancelled(Examen examen) {
        if (examen == null) {
            return true;
        }
        if (examen.getCancelledAt() != null) {
            return true;
        }
        return examen.getWorkflowStatus() != null && CANCELLED.contains(examen.getWorkflowStatus());
    }

    /**
     * Acte réalisé : CR signé/imprimé, ou workflow terminé (examen effectué).
     * {@code etat_patient=arrive} seul ne compte pas (patient arrivé, pas forcément scanné).
     */
    public static boolean isPerformed(Examen examen) {
        if (isCancelled(examen)) {
            return false;
        }
        if (examen.getStatutCr() != null && REPORT_DONE.contains(examen.getStatutCr())) {
            return true;
        }
        return examen.getWorkflowStatus() != null && PERFORMED.contains(examen.getWorkflowStatus());
    }

    public static boolean isInWaitingRoom(Examen examen) {
        if (isCancelled(examen) || isPerformed(examen)) {
            return false;
        }
        if (examen.getWorkflowStatus() != null && IN_FACILITY.contains(examen.getWorkflowStatus())) {
            return true;
        }
        return examen.getEtatPatient() != null && IN_FACILITY_LEGACY.contains(examen.getEtatPatient());
    }

    public static boolean hasStarted(Examen examen) {
        if (isCancelled(examen)) {
            return false;
        }
        if (isPerformed(examen) || isInWaitingRoom(examen)) {
            return true;
        }
        return false;
    }

    public static DashboardKpisDto kpis(
            List<Examen> todayExams, BigDecimal chiffreAffairesMensuel) {
        return kpis(todayExams, chiffreAffairesMensuel, null, null);
    }

    /**
     * @param tempsAttenteMoyenMinutes {@code null} si pas de données arrived_at
     * @param occupationOverride si non-null, remplace le calcul examens (ex. RDV/resources)
     */
    public static DashboardKpisDto kpis(
            List<Examen> todayExams,
            BigDecimal chiffreAffairesMensuel,
            Double tempsAttenteMoyenMinutes,
            Integer occupationOverride) {
        List<Examen> active = todayExams.stream().filter(e -> !isCancelled(e)).toList();
        long patients =
                active.stream()
                        .map(Examen::getPatient)
                        .filter(Objects::nonNull)
                        .map(p -> p.getId())
                        .filter(Objects::nonNull)
                        .distinct()
                        .count();
        long actes = active.stream().filter(DashboardMetrics::isPerformed).count();
        int occupation = 0;
        if (occupationOverride != null) {
            occupation = Math.max(0, Math.min(100, occupationOverride));
        } else if (!active.isEmpty()) {
            long started = active.stream().filter(DashboardMetrics::hasStarted).count();
            occupation = (int) Math.round(100.0 * started / active.size());
        }
        BigDecimal ca = chiffreAffairesMensuel != null ? chiffreAffairesMensuel : BigDecimal.ZERO;
        return DashboardKpisDto.builder()
                .patientsDuJour(patients)
                .actesRealises(actes)
                .chiffreAffaires(ca)
                .tauxOccupation(occupation)
                .tempsAttenteMoyenMinutes(tempsAttenteMoyenMinutes)
                .build();
    }

    /**
     * Moyenne (début examen − arrived_at) en minutes pour les examens avec arrived_at.
     * Retourne {@code null} si aucun échantillon.
     */
    public static Double averageWaitMinutes(List<Examen> exams) {
        if (exams == null || exams.isEmpty()) {
            return null;
        }
        List<Long> waits = new ArrayList<>();
        for (Examen e : exams) {
            if (isCancelled(e) || e.getArrivedAt() == null || e.getDateExamen() == null) {
                continue;
            }
            long minutes =
                    java.time.Duration.between(e.getArrivedAt(), e.getDateExamen()).toMinutes();
            if (minutes < 0) {
                // arrivé après l'heure prévue : attente = 0 jusqu'à démarrage réel inconnu
                minutes = 0;
            }
            waits.add(minutes);
        }
        if (waits.isEmpty()) {
            return null;
        }
        double avg = waits.stream().mapToLong(Long::longValue).average().orElse(0);
        return Math.round(avg * 10.0) / 10.0;
    }

    public static List<SalleAttenteDto> waitingRoom(List<Examen> todayExams) {
        return todayExams.stream()
                .filter(DashboardMetrics::isInWaitingRoom)
                .sorted(Comparator.comparing(Examen::getDateExamen, Comparator.nullsLast(Comparator.naturalOrder())))
                .limit(LIST_LIMIT)
                .map(DashboardMetrics::toWaitingRow)
                .toList();
    }

    public static List<AlerteDto> operationalAlerts(
            List<Examen> todayExams, List<Examen> overdueReports, boolean includeUnpaid) {
        List<AlerteDto> alerts = new ArrayList<>();
        for (Examen examen : todayExams) {
            if (isCancelled(examen)) {
                continue;
            }
            if (examen.getEtatPatient() == EtatPatient.attente_longue) {
                alerts.add(
                        alert(
                                "WAIT-" + examen.getId(),
                                "Attente trop longue",
                                patientName(examen) + " — " + examLabel(examen),
                                "critique",
                                examen.getDateExamen()));
            } else if (examen.getEtatPatient() == EtatPatient.retard) {
                alerts.add(
                        alert(
                                "LATE-" + examen.getId(),
                                "Patient en retard",
                                patientName(examen) + " — " + examLabel(examen),
                                "eleve",
                                examen.getDateExamen()));
            }
            if (includeUnpaid
                    && examen.getPaiement() == Paiement.impaye
                    && (isPerformed(examen) || isInWaitingRoom(examen))) {
                String montant =
                        examen.getMontant() != null
                                ? examen.getMontant().toPlainString() + " MAD"
                                : "montant non renseigné";
                alerts.add(
                        alert(
                                "PAY-" + examen.getId(),
                                "Examen impayé",
                                patientName(examen) + " — " + montant,
                                "eleve",
                                examen.getDateExamen()));
            }
        }
        for (Examen examen : overdueReports) {
            if (isCancelled(examen)) {
                continue;
            }
            if (examen.getStatutCr() == null || !REPORT_PENDING.contains(examen.getStatutCr())) {
                continue;
            }
            alerts.add(
                    alert(
                            "CR-" + examen.getId(),
                            "Compte-rendu en retard",
                            patientName(examen) + " — " + examLabel(examen),
                            "moyen",
                            examen.getDateExamen()));
        }
        return alerts.stream()
                .sorted(Comparator.comparingInt((AlerteDto a) -> niveauRank(a.getNiveau())))
                .limit(LIST_LIMIT)
                .toList();
    }

    public static String waitingStatut(Examen examen) {
        if (examen.getWorkflowStatus() == EncounterStatus.PREPARING) {
            return STATUT_PREPARATION;
        }
        if (examen.getWorkflowStatus() == EncounterStatus.IN_PROGRESS) {
            return STATUT_EN_COURS;
        }
        return STATUT_EN_ATTENTE;
    }

    private static SalleAttenteDto toWaitingRow(Examen examen) {
        LocalDateTime when = examen.getDateExamen();
        return SalleAttenteDto.builder()
                .heure(when != null ? when.format(HEURE) : "—")
                .patient(patientName(examen))
                .examen(examLabel(examen))
                .medecin(doctorName(examen))
                .statut(waitingStatut(examen))
                .build();
    }

    private static AlerteDto alert(
            String id, String titre, String detail, String niveau, LocalDateTime when) {
        return AlerteDto.builder()
                .id(id)
                .titre(titre)
                .detail(detail)
                .niveau(niveau)
                .temps(when != null ? when.format(TEMPS) : "")
                .build();
    }

    private static int niveauRank(String niveau) {
        return switch (niveau) {
            case "critique" -> 0;
            case "eleve" -> 1;
            default -> 2;
        };
    }

    private static String patientName(Examen examen) {
        if (examen.getPatient() != null && examen.getPatient().getNomComplet() != null) {
            return examen.getPatient().getNomComplet();
        }
        return "Patient";
    }

    private static String examLabel(Examen examen) {
        if (examen.getDescription() != null && !examen.getDescription().isBlank()) {
            return examen.getDescription();
        }
        if (examen.getModalite() != null) {
            return examen.getModalite().name();
        }
        return "Examen";
    }

    private static String doctorName(Examen examen) {
        if (examen.getMedecin() != null && !examen.getMedecin().isBlank()) {
            return examen.getMedecin();
        }
        if (examen.getAssignedRadiologue() != null
                && examen.getAssignedRadiologue().getNomComplet() != null) {
            return examen.getAssignedRadiologue().getNomComplet();
        }
        if (examen.getPrescripteurNom() != null && !examen.getPrescripteurNom().isBlank()) {
            return examen.getPrescripteurNom();
        }
        if (examen.getPrescripteur() != null && examen.getPrescripteur().getNom() != null) {
            return examen.getPrescripteur().getNom();
        }
        return "—";
    }
}
