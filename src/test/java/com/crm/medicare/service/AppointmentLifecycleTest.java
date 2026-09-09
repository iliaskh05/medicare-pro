package com.crm.medicare.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.crm.medicare.common.ApiException;
import com.crm.medicare.dto.AppointmentWriteRequest;
import com.crm.medicare.entity.CatalogueExamen;
import com.crm.medicare.entity.MedecinReferent;
import com.crm.medicare.entity.Modalite;
import com.crm.medicare.entity.Patient;
import com.crm.medicare.entity.ResourceRoom;
import com.crm.medicare.repository.CatalogueExamenRepository;
import com.crm.medicare.repository.MedecinReferentRepository;
import com.crm.medicare.repository.PatientRepository;
import com.crm.medicare.repository.ResourceRoomRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class AppointmentLifecycleTest {

    @Autowired private AppointmentService appointmentService;
    @Autowired private PatientRepository patientRepository;
    @Autowired private CatalogueExamenRepository catalogueExamenRepository;
    @Autowired private ResourceRoomRepository resourceRoomRepository;
    @Autowired private MedecinReferentRepository medecinReferentRepository;

    @Test
    void overlappingResourceIsRejected() {
        Fixture f = fixture("APT111111");
        AppointmentWriteRequest first = request(f, "2026-09-08T10:00");
        appointmentService.create(first);

        AppointmentWriteRequest clash = request(f, "2026-09-08T10:15");
        clash.setPatientId(secondPatient("APT111112").getId());
        assertThatThrownBy(() -> appointmentService.create(clash))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("occupée");
    }

    @Test
    void overlappingPatientIsRejected() {
        Fixture f = fixture("APT222221");
        appointmentService.create(request(f, "2026-09-08T11:00"));

        ResourceRoom other = new ResourceRoom();
        other.setCode("IRM-B");
        other.setLibelle("IRM B");
        other.setModalite(Modalite.IRM);
        other.setActif(true);
        other = resourceRoomRepository.save(other);

        AppointmentWriteRequest clash = request(f, "2026-09-08T11:00");
        clash.setResourceId(other.getId());
        assertThatThrownBy(() -> appointmentService.create(clash))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("déjà un rendez-vous");
    }

    @Test
    void checkInIsIdempotent() {
        Fixture f = fixture("APT333331");
        var created = appointmentService.create(request(f, "2026-09-08T14:00"));
        var first = appointmentService.checkIn(Long.valueOf(created.getId()));
        var second = appointmentService.checkIn(Long.valueOf(created.getId()));
        assertThat(first.getStatut()).isEqualTo("CHECKED_IN");
        assertThat(second.getExamenId()).isEqualTo(first.getExamenId());
    }

    private AppointmentWriteRequest request(Fixture f, String dateHeure) {
        AppointmentWriteRequest req = new AppointmentWriteRequest();
        req.setPatientId(f.patient.getId());
        req.setCatalogueId(f.catalogue.getId());
        req.setResourceId(f.resource.getId());
        req.setPrescripteurId(f.doctor.getId());
        req.setDateHeure(dateHeure);
        return req;
    }

    private Fixture fixture(String cin) {
        Patient patient = new Patient();
        patient.setNom("TEST");
        patient.setPrenom("Agenda");
        patient.setCin(cin);
        patient.setNumeroDossier("PAT-" + cin);
        patient = patientRepository.save(patient);

        CatalogueExamen catalogue = new CatalogueExamen();
        catalogue.setNom("IRM cérébrale");
        catalogue.setCode("IRM-CER-" + cin);
        catalogue.setModalite(Modalite.IRM);
        catalogue.setDureeMinutes(30);
        catalogue.setActif(true);
        catalogue = catalogueExamenRepository.save(catalogue);

        ResourceRoom resource = new ResourceRoom();
        resource.setCode("IRM-A-" + cin);
        resource.setLibelle("Salle IRM A");
        resource.setModalite(Modalite.IRM);
        resource.setActif(true);
        resource = resourceRoomRepository.save(resource);

        MedecinReferent doctor = new MedecinReferent();
        doctor.setNom("Dr Agenda " + cin);
        doctor = medecinReferentRepository.save(doctor);

        return new Fixture(patient, catalogue, resource, doctor);
    }

    private Patient secondPatient(String cin) {
        Patient patient = new Patient();
        patient.setNom("TEST");
        patient.setPrenom("Autre");
        patient.setCin(cin);
        patient.setNumeroDossier("PAT-" + cin);
        return patientRepository.save(patient);
    }

    private record Fixture(
            Patient patient, CatalogueExamen catalogue, ResourceRoom resource, MedecinReferent doctor) {}
}
