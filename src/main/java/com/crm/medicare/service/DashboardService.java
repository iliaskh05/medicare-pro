package com.crm.medicare.service;

import com.crm.medicare.dashboard.DashboardMetrics;
import com.crm.medicare.dto.AlerteDto;
import com.crm.medicare.dto.DashboardKpisDto;
import com.crm.medicare.dto.DashboardStatsDto;
import com.crm.medicare.dto.SalleAttenteDto;
import com.crm.medicare.entity.AppointmentStatus;
import com.crm.medicare.entity.EtatPatient;
import com.crm.medicare.entity.Examen;
import com.crm.medicare.entity.StatutCr;
import com.crm.medicare.entity.Utilisateur;
import com.crm.medicare.repository.AppointmentRepository;
import com.crm.medicare.repository.ExamenRepository;
import com.crm.medicare.repository.InvoiceRepository;
import com.crm.medicare.repository.ResourceRoomRepository;
import com.crm.medicare.security.PermissionCatalog;
import com.crm.medicare.security.SecurityUtils;
import com.crm.medicare.workflow.EncounterStatus;
import com.crm.medicare.workflow.InvoiceStatus;
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
    /** Capacité journalière approximative : minutes ouvrables × salles actives. */
    private static final int OPEN_MINUTES_PER_RESOURCE = 8 * 60;

    private final ExamenRepository examenRepository;
    private final InvoiceRepository invoiceRepository;
    private final AppointmentRepository appointmentRepository;
    private final ResourceRoomRepository resourceRoomRepository;

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
        Double wait = DashboardMetrics.averageWaitMinutes(todayExams);
        Integer occupationOverride = resourceOccupationPercent(today);
        return DashboardMetrics.kpis(todayExams, ca, wait, occupationOverride);
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
     * CA mensuel : somme {@code amount_paid} des factures ISSUED / PARTIALLY_PAID / PAID.
     * Si aucune facture dans la période → 0 (jamais inventé).
     */
    private BigDecimal monthRecordedRevenue(LocalDate today) {
        LocalDateTime debut = today.withDayOfMonth(1).atStartOfDay();
        LocalDateTime fin = today.plusMonths(1).withDayOfMonth(1).atStartOfDay();
        BigDecimal fromInvoices =
                invoiceRepository.sumAmountPaidBetween(
                        debut,
                        fin,
                        EnumSet.of(
                                InvoiceStatus.ISSUED,
                                InvoiceStatus.PARTIALLY_PAID,
                                InvoiceStatus.PAID));
        if (fromInvoices != null && fromInvoices.compareTo(BigDecimal.ZERO) > 0) {
            return fromInvoices;
        }
        // fallback examens.montant uniquement si aucune encaissement facture
        if (fromInvoices != null && invoiceRepository.count() == 0) {
            BigDecimal sum =
                    examenRepository.sumRecordedMontantBetween(
                            debut,
                            fin,
                            EnumSet.of(EncounterStatus.CANCELLED, EncounterStatus.NO_SHOW));
            return sum != null ? sum : BigDecimal.ZERO;
        }
        return fromInvoices != null ? fromInvoices : BigDecimal.ZERO;
    }

    /**
     * Occupation machines : minutes RDV bookées / (salles actives × journée).
     * {@code null} si pas de resources → fallback métrique examens.
     */
    private Integer resourceOccupationPercent(LocalDate day) {
        long activeResources = resourceRoomRepository.findByActifTrueOrderByLibelleAsc().size();
        if (activeResources <= 0) {
            return null;
        }
        LocalDateTime debut = day.atStartOfDay();
        LocalDateTime fin = day.plusDays(1).atStartOfDay();
        EnumSet<AppointmentStatus> excluded =
                EnumSet.of(AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW);
        long booked = appointmentRepository.sumBookedMinutesInRange(debut, fin, excluded);
        if (booked <= 0
                && appointmentRepository.countInRangeExcluding(debut, fin, excluded) == 0) {
            return null;
        }
        long capacity = activeResources * (long) OPEN_MINUTES_PER_RESOURCE;
        if (capacity <= 0) {
            return 0;
        }
        return (int) Math.min(100, Math.round(100.0 * booked / capacity));
    }

    private static boolean canReadInvoice() {
        Utilisateur user = SecurityUtils.currentUserOrNull();
        if (user == null) {
            return false;
        }
        return PermissionCatalog.forRole(user.getRole()).contains(PermissionCatalog.INVOICE_READ);
    }
}
