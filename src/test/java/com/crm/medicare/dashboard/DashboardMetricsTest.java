package com.crm.medicare.dashboard;

import static org.assertj.core.api.Assertions.assertThat;

import com.crm.medicare.dto.AlerteDto;
import com.crm.medicare.dto.DashboardKpisDto;
import com.crm.medicare.dto.SalleAttenteDto;
import com.crm.medicare.entity.EtatPatient;
import com.crm.medicare.entity.Examen;
import com.crm.medicare.entity.Modalite;
import com.crm.medicare.entity.Paiement;
import com.crm.medicare.entity.Patient;
import com.crm.medicare.entity.StatutCr;
import com.crm.medicare.workflow.EncounterStatus;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.Test;

class DashboardMetricsTest {

    @Test
    void patientsDuJourCountsDistinctNonCancelledPatients() {
        Examen a = exam(1L, 10L, EtatPatient.attendu, EncounterStatus.SCHEDULED, StatutCr.a_faire);
        Examen b = exam(2L, 10L, EtatPatient.arrive, EncounterStatus.ARRIVED, StatutCr.a_faire);
        Examen c = exam(3L, 11L, EtatPatient.attendu, EncounterStatus.SCHEDULED, StatutCr.a_faire);
        c.setCancelledAt(LocalDateTime.now());
        c.setWorkflowStatus(EncounterStatus.CANCELLED);

        DashboardKpisDto kpis = DashboardMetrics.kpis(List.of(a, b, c), BigDecimal.ZERO);

        assertThat(kpis.getPatientsDuJour()).isEqualTo(1);
        assertThat(kpis.getActesRealises()).isZero();
    }

    @Test
    void actesRealisesRequiresCompletedWorkflowOrSignedReport() {
        Examen arrived = exam(1L, 1L, EtatPatient.arrive, EncounterStatus.ARRIVED, StatutCr.a_faire);
        Examen signed = exam(2L, 2L, EtatPatient.arrive, EncounterStatus.ARRIVED, StatutCr.signe);
        Examen done = exam(3L, 3L, EtatPatient.arrive, EncounterStatus.COMPLETED, StatutCr.a_faire);

        DashboardKpisDto kpis = DashboardMetrics.kpis(List.of(arrived, signed, done), BigDecimal.ZERO);

        assertThat(kpis.getActesRealises()).isEqualTo(2);
    }

    @Test
    void chiffreAffairesUsesProvidedRecordedSumNeverInvented() {
        DashboardKpisDto kpis = DashboardMetrics.kpis(List.of(), new BigDecimal("1250.50"));
        assertThat(kpis.getChiffreAffaires()).isEqualByComparingTo("1250.50");

        DashboardKpisDto empty = DashboardMetrics.kpis(List.of(), null);
        assertThat(empty.getChiffreAffaires()).isEqualByComparingTo("0");
    }

    @Test
    void tauxOccupationIsShareOfTodaysExamsAlreadyStarted() {
        Examen waiting = exam(1L, 1L, EtatPatient.attendu, EncounterStatus.SCHEDULED, StatutCr.a_faire);
        Examen inRoom = exam(2L, 2L, EtatPatient.arrive, EncounterStatus.ARRIVED, StatutCr.a_faire);

        DashboardKpisDto kpis = DashboardMetrics.kpis(List.of(waiting, inRoom), BigDecimal.ZERO);

        assertThat(kpis.getTauxOccupation()).isEqualTo(50);
    }

    @Test
    void tauxOccupationIsZeroWhenNoExamToday() {
        assertThat(DashboardMetrics.kpis(List.of(), BigDecimal.ZERO).getTauxOccupation()).isZero();
    }

    @Test
    void waitingRoomMapsLegacyArriveAndOmitsScheduled() {
        Examen scheduled = exam(1L, 1L, EtatPatient.attendu, EncounterStatus.SCHEDULED, StatutCr.a_faire);
        Examen arrived = exam(2L, 2L, EtatPatient.arrive, EncounterStatus.ARRIVED, StatutCr.a_faire);
        arrived.setDescription("IRM Lombaire");
        arrived.setMedecin("Dr Test");
        arrived.setDateExamen(LocalDateTime.of(2026, 8, 17, 9, 30));
        Examen preparing = exam(3L, 3L, EtatPatient.arrive, EncounterStatus.PREPARING, StatutCr.a_faire);
        preparing.setDateExamen(LocalDateTime.of(2026, 8, 17, 10, 0));

        List<SalleAttenteDto> rows = DashboardMetrics.waitingRoom(List.of(scheduled, arrived, preparing));

        assertThat(rows).hasSize(2);
        assertThat(rows.get(0).getHeure()).isEqualTo("09:30");
        assertThat(rows.get(0).getStatut()).isEqualTo("En attente");
        assertThat(rows.get(0).getExamen()).isEqualTo("IRM Lombaire");
        assertThat(rows.get(1).getStatut()).isEqualTo("Préparation");
    }

    @Test
    void alertsUseOperationalSignalsAndSkipUnpaidWhenNotAllowed() {
        Examen longWait = exam(5L, 5L, EtatPatient.attente_longue, EncounterStatus.WAITING, StatutCr.a_faire);
        longWait.setPaiement(Paiement.impaye);
        longWait.setMontant(new BigDecimal("900"));
        Examen overdue = exam(8L, 8L, EtatPatient.arrive, EncounterStatus.COMPLETED, StatutCr.a_faire);
        overdue.setDateExamen(LocalDateTime.of(2026, 8, 1, 11, 0));

        List<AlerteDto> withoutPay =
                DashboardMetrics.operationalAlerts(List.of(longWait), List.of(overdue), false);
        assertThat(withoutPay).extracting(AlerteDto::getId).containsExactly("WAIT-5", "CR-8");
        assertThat(withoutPay.get(0).getNiveau()).isEqualTo("critique");

        List<AlerteDto> withPay =
                DashboardMetrics.operationalAlerts(List.of(longWait), List.of(), true);
        assertThat(withPay).extracting(AlerteDto::getId).contains("WAIT-5", "PAY-5");
    }

    @Test
    void emptyListsWhenNothingMatches() {
        Examen scheduled = exam(1L, 1L, EtatPatient.attendu, EncounterStatus.SCHEDULED, StatutCr.a_faire);
        assertThat(DashboardMetrics.waitingRoom(List.of(scheduled))).isEmpty();
        assertThat(DashboardMetrics.operationalAlerts(List.of(scheduled), List.of(), true)).isEmpty();
    }

    private static Examen exam(
            Long id, Long patientId, EtatPatient etat, EncounterStatus workflow, StatutCr cr) {
        Patient patient = new Patient();
        patient.setId(patientId);
        patient.setNomComplet("Patient " + patientId);
        Examen examen = new Examen();
        examen.setId(id);
        examen.setPatient(patient);
        examen.setEtatPatient(etat);
        examen.setWorkflowStatus(workflow);
        examen.setStatutCr(cr);
        examen.setModalite(Modalite.IRM);
        examen.setPaiement(Paiement.cote);
        examen.setDateExamen(LocalDateTime.of(2026, 8, 17, 8, 0));
        return examen;
    }
}
