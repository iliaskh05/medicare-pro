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
