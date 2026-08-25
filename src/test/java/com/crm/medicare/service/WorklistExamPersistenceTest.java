package com.crm.medicare.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.crm.medicare.common.ApiException;
import com.crm.medicare.dto.WorklistCreateRequest;
import com.crm.medicare.dto.WorklistItemDto;
import com.crm.medicare.entity.MedecinReferent;
import com.crm.medicare.repository.MedecinReferentRepository;
import com.crm.medicare.repository.PatientRepository;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class WorklistExamPersistenceTest {

    @Autowired private WorklistService worklistService;
    @Autowired private PatientRepository patientRepository;
    @Autowired private MedecinReferentRepository medecinReferentRepository;
    @Autowired private com.crm.medicare.repository.CatalogueExamenRepository catalogueExamenRepository;

    @Test
    void createExamPersistsPatientNumeroDossierAndAppearsInWorklist() {
        MedecinReferent doctor = saveDoctor("Dr Test");
        WorklistCreateRequest request = validRequest("AA111111", doctor.getId(), "2026-08-17T09:30");

        WorklistItemDto created = worklistService.create(request);

        assertThat(created.getId()).isNotBlank();
        assertThat(created.getPatient()).contains("BENALI");
        assertThat(created.getEtatPatient()).isEqualTo("attendu");
        assertThat(patientRepository.findByCinIgnoreCaseAndDeletedAtIsNull("AA111111"))
                .isPresent()
                .get()
                .satisfies(p -> assertThat(p.getNumeroDossier()).startsWith("PAT-"));

        List<WorklistItemDto> rows = worklistService.listByDate(LocalDate.of(2026, 8, 17), null, null);
        assertThat(rows).extracting(WorklistItemDto::getId).contains(created.getId());
    }

    @Test
    void createExamReusesExistingPatientByCin() {
        MedecinReferent doctor = saveDoctor("Dr Exist");
        worklistService.create(validRequest("BB222222", doctor.getId(), "2026-08-17T10:00"));
        long patients = patientRepository.count();

        WorklistItemDto second =
                worklistService.create(validRequest("BB222222", doctor.getId(), "2026-08-17T11:00"));

        assertThat(second.getCin()).isEqualTo("BB222222");
        assertThat(patientRepository.count()).isEqualTo(patients);
    }

    @Test
    void unknownPrescripteurReturns400() {
        WorklistCreateRequest request = validRequest("CC333333", 9_999_999L, "2026-08-17T09:30");
        assertThatThrownBy(() -> worklistService.create(request))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(ex -> ((ResponseStatusException) ex).getStatusCode().value())
                .isEqualTo(400);
    }

    @Test
    void missingRequiredFieldsReturn400() {
        WorklistCreateRequest empty = new WorklistCreateRequest();
        assertThatThrownBy(() -> worklistService.create(empty))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(ex -> ((ResponseStatusException) ex).getStatusCode().value())
                .isEqualTo(400);
    }

    @Test
    void missingCinReturns400() {
        assertThatThrownBy(
                        () ->
                                worklistService.create(
                                        validRequest("  ", 1L, "2026-08-17T09:30")))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(ex -> ((ResponseStatusException) ex).getStatusCode().value())
                .isEqualTo(400);
    }

    @Test
    void invalidNaissanceReturns400() {
        MedecinReferent doctor = saveDoctor("Dr Date");
        WorklistCreateRequest request = validRequest("DD444444", doctor.getId(), "2026-08-17T09:30");
        request.setNaissance("17/08/2026");
        assertThatThrownBy(() -> worklistService.create(request)).isInstanceOf(ApiException.class);
    }

    @Test
    void worklistWithoutResultsReturnsEmptyListNotError() {
        List<WorklistItemDto> rows = worklistService.listByDate(LocalDate.of(2099, 1, 1), null, null);
        assertThat(rows).isEmpty();
    }

    @Test
    void worklistPaginationAndModaliteFilter() {
        MedecinReferent doctor = saveDoctor("Dr Page");
        worklistService.create(validRequest("PG111111", doctor.getId(), "2026-08-19T09:00"));
        WorklistCreateRequest irm = validRequest("PG222222", doctor.getId(), "2026-08-19T10:00");
        irm.setModalite("IRM");
        worklistService.create(irm);
        WorklistCreateRequest scanner = validRequest("PG333333", doctor.getId(), "2026-08-19T11:00");
        scanner.setModalite("Scanner");
        scanner.setTypeExamen("Scanner thorax");
        scanner.setSalle("Salle 1 — Scanner");
        worklistService.create(scanner);

        var page0 =
                worklistService.listByRange(
                        LocalDate.of(2026, 8, 19),
                        LocalDate.of(2026, 8, 19),
                        null,
                        null,
                        "IRM",
                        null,
                        null,
                        0,
                        1);
        assertThat(page0.total()).isEqualTo(2);
        assertThat(page0.items()).hasSize(1);
        assertThat(page0.items().get(0).getModalite()).isEqualTo("IRM");
        assertThat(page0.items().get(0).getHistorique()).isEmpty();

        var page1 =
                worklistService.listByRange(
                        LocalDate.of(2026, 8, 19),
                        LocalDate.of(2026, 8, 19),
                        null,
                        null,
                        "IRM",
                        null,
                        null,
                        1,
                        1);
        assertThat(page1.items()).hasSize(1);
        assertThat(page1.items().get(0).getId()).isNotEqualTo(page0.items().get(0).getId());
    }

    @Test
    void statusHistoryReturnsTransitions() {
        MedecinReferent doctor = saveDoctor("Dr Hist");
        WorklistItemDto created =
                worklistService.create(validRequest("HS111111", doctor.getId(), "2026-08-20T09:00"));
        worklistService.updateStatus(Long.valueOf(created.getId()), "arrive");

        var history = worklistService.statusHistory(Long.valueOf(created.getId()));
        assertThat(history).isNotEmpty();
        assertThat(history.get(history.size() - 1).getToStatus()).isNotBlank();
    }

    @Test
    void walkInSetsArrivedAndRecordsDeposit() {
        MedecinReferent doctor = saveDoctor("Dr Walkin");
        WorklistCreateRequest request = validRequest("EE555555", doctor.getId(), "2026-08-18T08:15");
        request.setPassageSansRdv(true);
        request.setAcompte(java.math.BigDecimal.ZERO);

        WorklistItemDto created = worklistService.create(request);

        assertThat(created.getEtatPatient()).isEqualTo("arrive");
        assertThat(created.getPassageSansRdv()).isTrue();
        assertThat(created.getAcompte()).isEqualByComparingTo("0");
        assertThat(created.getMontant()).isEqualByComparingTo("0");
        assertThat(created.getReste()).isEqualByComparingTo("0");
        assertThat(created.getPaiement()).isEqualTo("impaye");
    }

    @Test
    void cataloguePriceIsAppliedAndDepositCannotExceedTotal() {
        com.crm.medicare.entity.CatalogueExamen acte = new com.crm.medicare.entity.CatalogueExamen();
        acte.setNom("IRM cérébrale");
        acte.setModalite(com.crm.medicare.entity.Modalite.IRM);
        acte.setPrix(new java.math.BigDecimal("1200.00"));
        acte.setDureeMinutes(30);
        acte.setActif(true);
        acte = catalogueExamenRepository.save(acte);

        MedecinReferent doctor = saveDoctor("Dr Tarif");
        WorklistCreateRequest request = validRequest("FF666666", doctor.getId(), "2026-08-18T09:00");
        request.setCatalogueId(acte.getId());
        request.setTypeExamen(null);
        request.setModalite(null);
        request.setAcompte(new java.math.BigDecimal("300"));

        WorklistItemDto created = worklistService.create(request);
        assertThat(created.getDescription()).isEqualTo("IRM cérébrale");
        assertThat(created.getMontant()).isEqualByComparingTo("1200.00");
        assertThat(created.getAcompte()).isEqualByComparingTo("300");
        assertThat(created.getReste()).isEqualByComparingTo("900.00");
        assertThat(created.getPaiement()).isEqualTo("cote");

        com.crm.medicare.dto.PaiementCreateRequest overflow = new com.crm.medicare.dto.PaiementCreateRequest();
        overflow.setMontant(new java.math.BigDecimal("1000"));
        overflow.setMode("especes");
        assertThatThrownBy(() -> worklistService.recordPayment(Long.valueOf(created.getId()), overflow))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(ex -> ((ResponseStatusException) ex).getStatusCode().value())
                .isEqualTo(400);
    }

    private MedecinReferent saveDoctor(String nom) {
        MedecinReferent doctor = new MedecinReferent();
        doctor.setNom(nom);
        return medecinReferentRepository.save(doctor);
    }

    private static WorklistCreateRequest validRequest(String cin, Long doctorId, String dateHeure) {
        WorklistCreateRequest request = new WorklistCreateRequest();
        request.setNom("BENALI");
        request.setPrenom("Sara");
        request.setCin(cin);
        request.setNaissance("1990-01-15");
        request.setSexe("F");
        request.setTelephone("0612345678");
        request.setTypeExamen("IRM Lombaire");
        request.setModalite("IRM");
        request.setSalle("Salle 2 — IRM");
        request.setDateHeure(dateHeure);
        request.setPrescripteurId(String.valueOf(doctorId));
        request.setPrescripteurNom("Dr Test");
        return request;
    }
}
