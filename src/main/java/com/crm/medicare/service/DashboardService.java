package com.crm.medicare.service;

import com.crm.medicare.dashboard.DashboardMetrics;
import com.crm.medicare.dto.AlerteDto;
import com.crm.medicare.dto.DashboardKpisDto;
import com.crm.medicare.dto.DashboardStatsDto;
import com.crm.medicare.dto.SalleAttenteDto;
import com.crm.medicare.entity.EtatPatient;
import com.crm.medicare.entity.Examen;
import com.crm.medicare.entity.StatutCr;
import com.crm.medicare.entity.Utilisateur;
import com.crm.medicare.repository.ExamenRepository;
import com.crm.medicare.security.PermissionCatalog;
import com.crm.medicare.security.SecurityUtils;
import com.crm.medicare.workflow.EncounterStatus;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.EnumSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private static final ZoneId ZONE = ZoneId.of("Africa/Casablanca");

    private final ExamenRepository examenRepository;

    @Transactional(readOnly = true)
    public DashboardStatsDto getStats() {
        LocalDate today = LocalDate.now(ZONE);
        LocalDateTime debut = today.atStartOfDay();
        LocalDateTime fin = today.plusDays(1).atStartOfDay();

        long total = examenRepository.count();
        long aujourdhui =
                examenRepository.countByDateExamenGreaterThanEqualAndDateExamenLessThan(debut, fin);

        long enAttente = examenRepository.countByEtatPatient(EtatPatient.attendu);
        long enCours =
                examenRepository.countByEtatPatient(EtatPatient.retard)
                        + examenRepository.countByEtatPatient(EtatPatient.attente_longue);
        long termines = examenRepository.countByEtatPatient(EtatPatient.arrive);

        Map<String, Long> repartition = new LinkedHashMap<>();
        repartition.put("En attente", enAttente);
        repartition.put("En cours", enCours);
        repartition.put("Terminé", termines);

        return DashboardStatsDto.builder()
                .totalExamens(total)
                .examensAujourdhui(aujourdhui)
                .repartitionStatuts(repartition)
                .revenusEstimes(monthRecordedRevenue(today))
                .build();
    }

    @Transactional(readOnly = true)
    public DashboardKpisDto getKpis() {
        LocalDate today = LocalDate.now(ZONE);
        List<Examen> todayExams = examsOfDay(today);
        BigDecimal ca = canReadInvoice() ? monthRecordedRevenue(today) : BigDecimal.ZERO;
        return DashboardMetrics.kpis(todayExams, ca);
    }

    @Transactional(readOnly = true)
    public List<SalleAttenteDto> getSalleAttente() {
        return DashboardMetrics.waitingRoom(examsOfDay(LocalDate.now(ZONE)));
    }

    @Transactional(readOnly = true)
    public List<AlerteDto> getAlertes() {
        LocalDate today = LocalDate.now(ZONE);
        LocalDateTime start = today.atStartOfDay();
        List<Examen> todayExams = examsOfDay(today);
        List<Examen> overdue =
                examenRepository.findPendingReportsBefore(
                        start,
                        EnumSet.of(StatutCr.a_faire, StatutCr.en_redaction),
                        EnumSet.of(EncounterStatus.CANCELLED, EncounterStatus.NO_SHOW));
        return DashboardMetrics.operationalAlerts(todayExams, overdue, canReadInvoice());
    }

    private List<Examen> examsOfDay(LocalDate day) {
        LocalDateTime debut = day.atStartOfDay();
        LocalDateTime fin = day.plusDays(1).atStartOfDay();
        return examenRepository.findWithPatientByDateRange(debut, fin);
    }

    /**
     * Somme des {@code examens.montant} du mois civil, hors annulés.
     * Les lignes sans montant ne sont pas estimées.
     */
    private BigDecimal monthRecordedRevenue(LocalDate today) {
        LocalDateTime debut = today.withDayOfMonth(1).atStartOfDay();
        LocalDateTime fin = today.plusMonths(1).withDayOfMonth(1).atStartOfDay();
        BigDecimal sum =
                examenRepository.sumRecordedMontantBetween(
                        debut,
                        fin,
                        EnumSet.of(EncounterStatus.CANCELLED, EncounterStatus.NO_SHOW));
        return sum != null ? sum : BigDecimal.ZERO;
    }

    private static boolean canReadInvoice() {
        Utilisateur user = SecurityUtils.currentUserOrNull();
        if (user == null) {
            return false;
        }
        return PermissionCatalog.forRole(user.getRole()).contains(PermissionCatalog.INVOICE_READ);
    }
}
