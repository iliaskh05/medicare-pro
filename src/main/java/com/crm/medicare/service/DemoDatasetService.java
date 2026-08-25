package com.crm.medicare.service;

import com.crm.medicare.common.ApiException;
import com.crm.medicare.common.CentreZone;
import com.crm.medicare.data.MoroccanCatalogueDefinitions;
import com.crm.medicare.dto.AppointmentWriteRequest;
import com.crm.medicare.dto.DemoDatasetStatusDto;
import com.crm.medicare.dto.InvoiceCreateRequest;
import com.crm.medicare.dto.ReportWriteRequest;
import com.crm.medicare.dto.ResourceDto;
import com.crm.medicare.dto.WorklistCreateRequest;
import com.crm.medicare.dto.WorklistItemDto;
import com.crm.medicare.entity.CatalogueExamen;
import com.crm.medicare.entity.DemoDatasetMarker;
import com.crm.medicare.entity.MedecinReferent;
import com.crm.medicare.entity.ResourceRoom;
import com.crm.medicare.repository.AppointmentRepository;
import com.crm.medicare.repository.CatalogueExamenRepository;
import com.crm.medicare.repository.DemoDatasetMarkerRepository;
import com.crm.medicare.repository.DocumentExamenRepository;
import com.crm.medicare.repository.ExamenRepository;
import com.crm.medicare.repository.ImagingInstanceRepository;
import com.crm.medicare.repository.ImagingSeriesRepository;
import com.crm.medicare.repository.ImagingStudyRepository;
import com.crm.medicare.repository.InvoiceRepository;
import com.crm.medicare.repository.MedecinReferentRepository;
import com.crm.medicare.repository.PaiementExamenRepository;
import com.crm.medicare.repository.PatientRepository;
import com.crm.medicare.repository.ReportAmendmentRepository;
import com.crm.medicare.repository.ReportRepository;
import com.crm.medicare.repository.ReportValidationRepository;
import com.crm.medicare.repository.ReportVersionRepository;
import com.crm.medicare.repository.ResourceRoomRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Explicit demo dataset loader. Never runs on application startup — only via admin API.
 */
@Service
@RequiredArgsConstructor
public class DemoDatasetService {

    public static final String TYPE_DATASET = "DATASET";
    public static final String TYPE_CATALOGUE = "CATALOGUE";
    public static final String TYPE_RESOURCE = "RESOURCE";
    public static final String TYPE_MEDECIN = "MEDECIN_REFERENT";
    public static final String TYPE_PATIENT = "PATIENT";
    public static final String TYPE_EXAMEN = "EXAMEN";
    public static final String TYPE_APPOINTMENT = "APPOINTMENT";
    public static final String TYPE_INVOICE = "INVOICE";
    public static final String TYPE_REPORT = "REPORT";

    private static final String DATASET_ID = "LOADED";

    private final DemoDatasetMarkerRepository markerRepository;
    private final CatalogueService catalogueService;
    private final CatalogueExamenRepository catalogueExamenRepository;
    private final AppointmentService appointmentService;
    private final ResourceRoomRepository resourceRoomRepository;
    private final MedecinReferentRepository medecinReferentRepository;
    private final PatientRepository patientRepository;
    private final WorklistService worklistService;
    private final InvoiceBillingService invoiceBillingService;
    private final InvoiceRepository invoiceRepository;
    private final ReportService reportService;
    private final ReportRepository reportRepository;
    private final ReportVersionRepository reportVersionRepository;
    private final ReportValidationRepository reportValidationRepository;
    private final ReportAmendmentRepository reportAmendmentRepository;
    private final ExamenRepository examenRepository;
    private final AppointmentRepository appointmentRepository;
    private final PaiementExamenRepository paiementExamenRepository;
    private final DocumentExamenRepository documentExamenRepository;
    private final ImagingStudyRepository imagingStudyRepository;
    private final ImagingSeriesRepository imagingSeriesRepository;
    private final ImagingInstanceRepository imagingInstanceRepository;
    private final AuditService auditService;

    @PersistenceContext
    private EntityManager entityManager;

    @Transactional(readOnly = true)
    public DemoDatasetStatusDto status() {
        List<DemoDatasetMarker> markers = markerRepository.findAllByOrderByIdAsc();
        Map<String, Long> counts = new LinkedHashMap<>();
        for (DemoDatasetMarker m : markers) {
            counts.merge(m.getEntityType(), 1L, Long::sum);
        }
        boolean loaded =
                markers.stream()
                        .anyMatch(
                                m ->
                                        TYPE_DATASET.equals(m.getEntityType())
                                                && DATASET_ID.equals(m.getEntityId()));
        return DemoDatasetStatusDto.builder()
                .loaded(loaded)
                .countsByType(counts)
                .totalMarkers(markers.size())
                .build();
    }

    @Transactional
    public DemoDatasetStatusDto loadCatalogueBaseline() {
        int n = 0;
        for (MoroccanCatalogueDefinitions.Def def : MoroccanCatalogueDefinitions.all()) {
            CatalogueExamen row = catalogueService.upsertByCode(def.toWriteRequest(), true);
            mark(TYPE_CATALOGUE, row.getId());
            n++;
        }
        auditService.record(
                AuditService.SETTINGS_UPDATE,
                "DemoCatalogue",
                "baseline",
                Map.of("count", n));
        return status();
    }

    @Transactional
    public DemoDatasetStatusDto load(boolean force) {
        DemoDatasetStatusDto current = status();
        if (current.isLoaded() && !force) {
            throw ApiException.conflict(
                    "demo_loaded",
                    "Jeu de démo déjà chargé — utilisez force=true pour recharger");
        }
        if (current.getTotalMarkers() > 0 && (force || current.isLoaded())) {
            reset();
        }

        loadCatalogueBaseline();

        ensureResource("MRI-01", "Salle IRM 1", "IRM");
        ensureResource("CT-01", "Salle Scanner 1", "Scanner");
        ensureResource("XR-01", "Salle Radiologie 1", "Radiologie");
        ensureResource("ECHO-01", "Salle Échographie 1", "Échographie");
        ensureResource("MAMMO-01", "Salle Mammographie 1", "Mammographie");

        MedecinReferent ref1 =
                ensureReferent(
                        "DEMO-REF-001",
                        "Dr. Sara Benali",
                        "Médecine générale",
                        "0611111101",
                        "sara.benali@demo.local",
                        "Casablanca");
        MedecinReferent ref2 =
                ensureReferent(
                        "DEMO-REF-002",
                        "Dr. Omar Tazi",
                        "Orthopédie",
                        "0611111102",
                        "omar.tazi@demo.local",
                        "Rabat");
        MedecinReferent ref3 =
                ensureReferent(
                        "DEMO-REF-003",
                        "Dr. Leila Chraibi",
                        "Gynécologie",
                        "0611111103",
                        "leila.chraibi@demo.local",
                        "Témara");

        CatalogueExamen irm = requireCatalogue("MRI-CEREBRALE");
        CatalogueExamen scanner = requireCatalogue("CT-THORAX");
        CatalogueExamen xr = requireCatalogue("XR-THORAX-FACE");

        ResourceRoom mri = requireResource("MRI-01");
        ResourceRoom ct = requireResource("CT-01");
        ResourceRoom xrRoom = requireResource("XR-01");

        LocalDateTime base = LocalDateTime.now(CentreZone.ZONE).withMinute(0).withSecond(0).withNano(0);

        // P1 — paid full path + validated report
        WorklistItemDto exam1 =
                createExam(
                        "Alaoui",
                        "Fatima Zahra",
                        "DEMO-CIN-001",
                        "F",
                        "1988-03-12",
                        "0612000001",
                        irm,
                        mri,
                        ref1,
                        base.plusHours(1),
                        true);
        Long patient1 = Long.valueOf(exam1.getPatientId());
        mark(TYPE_PATIENT, patient1);
        mark(TYPE_EXAMEN, Long.valueOf(exam1.getId()));

        InvoiceCreateRequest inv1 = new InvoiceCreateRequest();
        inv1.setPatientId(patient1);
        inv1.setExamenId(Long.valueOf(exam1.getId()));
        inv1.setModePaiement("especes");
        inv1.setAcompte(irm.getPrix());
        inv1.setNotes("Demo P1 — paiement intégral");
        var invoice1 = invoiceBillingService.create(inv1);
        mark(TYPE_INVOICE, Long.valueOf(invoice1.getId()));

        ReportWriteRequest reportReq = new ReportWriteRequest();
        reportReq.setExamenId(Long.valueOf(exam1.getId()));
        reportReq.setIndication("Céphalées chroniques");
        reportReq.setTechnique("IRM cérébrale sans injection");
        reportReq.setResultats("Pas d'anomalie significative du parenchyme cérébral.");
        reportReq.setConclusion("IRM cérébrale normale.");
        reportReq.setBody("Compte rendu démo P1 — normal.");
        var report = reportService.create(reportReq);
        reportService.validate(Long.valueOf(report.getId()));
        mark(TYPE_REPORT, Long.valueOf(report.getId()));

        AppointmentWriteRequest appt = new AppointmentWriteRequest();
        appt.setPatientId(patient1);
        appt.setCatalogueId(irm.getId());
        appt.setResourceId(mri.getId());
        appt.setPrescripteurId(ref1.getId());
        appt.setDateHeure(formatDateHeure(base.plusDays(7).withHour(10)));
        appt.setMotif("Contrôle IRM démo");
        var appointment = appointmentService.create(appt);
        mark(TYPE_APPOINTMENT, Long.valueOf(appointment.getId()));

        // P2 — partial payment (DEMO-PAT-002)
        WorklistItemDto exam2 =
                createExam(
                        "Benjelloun",
                        "Youssef",
                        "DEMO-CIN-002",
                        "M",
                        "1975-11-04",
                        "0612000002",
                        scanner,
                        ct,
                        ref2,
                        base.plusHours(2),
                        true);
        Long patient2 = Long.valueOf(exam2.getPatientId());
        mark(TYPE_PATIENT, patient2);
        mark(TYPE_EXAMEN, Long.valueOf(exam2.getId()));

        InvoiceCreateRequest inv2 = new InvoiceCreateRequest();
        inv2.setPatientId(patient2);
        inv2.setExamenId(Long.valueOf(exam2.getId()));
        inv2.setModePaiement("carte");
        BigDecimal half =
                scanner.getPrix().divide(BigDecimal.valueOf(2), 2, java.math.RoundingMode.HALF_UP);
        inv2.setAcompte(half);
        inv2.setNotes("Demo P2 — acompte partiel");
        var invoice2 = invoiceBillingService.create(inv2);
        mark(TYPE_INVOICE, Long.valueOf(invoice2.getId()));

        // P3 — unpaid (DEMO-PAT-003)
        WorklistItemDto exam3 =
                createExam(
                        "El Amrani",
                        "Khadija",
                        "DEMO-CIN-003",
                        "F",
                        "1992-07-21",
                        "0612000003",
                        xr,
                        xrRoom,
                        ref3,
                        base.plusHours(3),
                        false);
        Long patient3 = Long.valueOf(exam3.getPatientId());
        mark(TYPE_PATIENT, patient3);
        mark(TYPE_EXAMEN, Long.valueOf(exam3.getId()));

        InvoiceCreateRequest inv3 = new InvoiceCreateRequest();
        inv3.setPatientId(patient3);
        inv3.setExamenId(Long.valueOf(exam3.getId()));
        inv3.setModePaiement("especes");
        inv3.setNotes("Demo P3 — impayé");
        var invoice3 = invoiceBillingService.create(inv3);
        mark(TYPE_INVOICE, Long.valueOf(invoice3.getId()));

        mark(TYPE_DATASET, DATASET_ID);
        auditService.record(
                AuditService.SETTINGS_UPDATE,
                "DemoDataset",
                DATASET_ID,
                Map.of("force", force, "patients", 3));
        return status();
    }

    @Transactional
    public DemoDatasetStatusDto reset() {
        List<DemoDatasetMarker> markers = markerRepository.findAllByOrderByIdAsc();
        Map<String, List<Long>> byType = new LinkedHashMap<>();
        for (DemoDatasetMarker m : markers) {
            if (TYPE_DATASET.equals(m.getEntityType())) {
                continue;
            }
            try {
                long id = Long.parseLong(m.getEntityId());
                byType.computeIfAbsent(m.getEntityType(), k -> new ArrayList<>()).add(id);
            } catch (NumberFormatException ignored) {
                // non-numeric sentinel ids
            }
        }

        deleteReports(ids(byType, TYPE_REPORT));
        deleteInvoices(ids(byType, TYPE_INVOICE));
        deleteAppointments(ids(byType, TYPE_APPOINTMENT));

        List<Long> examenIds = ids(byType, TYPE_EXAMEN);
        clearExamenDependents(examenIds);
        deleteExamens(examenIds);
        deletePatients(ids(byType, TYPE_PATIENT));
        deleteMedecins(ids(byType, TYPE_MEDECIN));
        deleteResources(ids(byType, TYPE_RESOURCE));
        deleteCatalogues(ids(byType, TYPE_CATALOGUE));

        markerRepository.deleteAllInBatch();
        entityManager.flush();
        entityManager.clear();

        auditService.record(
                AuditService.SETTINGS_UPDATE, "DemoDataset", "RESET", Map.of("cleared", markers.size()));
        return status();
    }

    private WorklistItemDto createExam(
            String nom,
            String prenom,
            String cin,
            String sexe,
            String naissance,
            String telephone,
            CatalogueExamen catalogue,
            ResourceRoom resource,
            MedecinReferent ref,
            LocalDateTime when,
            boolean walkIn) {
        WorklistCreateRequest req = new WorklistCreateRequest();
        req.setNom(nom);
        req.setPrenom(prenom);
        req.setCin(cin);
        req.setSexe(sexe);
        req.setNaissance(naissance);
        req.setTelephone(telephone);
        req.setCatalogueId(catalogue.getId());
        req.setTypeExamen(catalogue.getNom());
        req.setModalite(catalogue.getModalite().name());
        req.setResourceId(resource.getId());
        req.setSalle(resource.getLibelle());
        req.setPrescripteurId(String.valueOf(ref.getId()));
        req.setPrescripteurNom(ref.getNom());
        req.setDateHeure(formatDateHeure(when));
        req.setPassageSansRdv(walkIn);
        return worklistService.create(req);
    }

    private static String formatDateHeure(LocalDateTime when) {
        return when.format(DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm"));
    }

    private void ensureResource(String code, String libelle, String modalite) {
        var existing = resourceRoomRepository.findByCodeIgnoreCase(code);
        if (existing.isPresent()) {
            ResourceRoom room = existing.get();
            room.setLibelle(libelle);
            room.setActif(true);
            resourceRoomRepository.save(room);
            mark(TYPE_RESOURCE, room.getId());
            return;
        }
        ResourceDto created = appointmentService.createResource(code, libelle, modalite);
        mark(TYPE_RESOURCE, Long.valueOf(created.getId()));
    }

    private MedecinReferent ensureReferent(
            String code, String nom, String specialite, String tel, String email, String ville) {
        MedecinReferent ref =
                medecinReferentRepository.findAll().stream()
                        .filter(r -> code.equalsIgnoreCase(r.getIdMedecinExcel()))
                        .findFirst()
                        .orElseGet(MedecinReferent::new);
        ref.setIdMedecinExcel(code);
        ref.setNom(nom);
        ref.setSpecialite(specialite);
        ref.setTelephone(tel);
        ref.setEmail(email);
        ref.setVille(ville);
        ref.setActif(true);
        ref = medecinReferentRepository.save(ref);
        mark(TYPE_MEDECIN, ref.getId());
        return ref;
    }

    private CatalogueExamen requireCatalogue(String code) {
        return catalogueExamenRepository
                .findByCodeIgnoreCase(code)
                .orElseThrow(() -> ApiException.notFound("Catalogue manquant: " + code));
    }

    private ResourceRoom requireResource(String code) {
        return resourceRoomRepository
                .findByCodeIgnoreCase(code)
                .orElseThrow(() -> ApiException.notFound("Ressource manquante: " + code));
    }

    private void mark(String type, Object id) {
        String entityId = String.valueOf(id);
        boolean exists =
                markerRepository.findByEntityTypeOrderByIdAsc(type).stream()
                        .anyMatch(m -> entityId.equals(m.getEntityId()));
        if (exists) {
            return;
        }
        DemoDatasetMarker marker = new DemoDatasetMarker();
        marker.setEntityType(type);
        marker.setEntityId(entityId);
        markerRepository.save(marker);
    }

    private static List<Long> ids(Map<String, List<Long>> byType, String type) {
        return byType.getOrDefault(type, List.of());
    }

    private void deleteReports(List<Long> reportIds) {
        for (Long id : reportIds) {
            reportAmendmentRepository.findByReportIdOrderByCreatedAtAsc(id)
                    .forEach(reportAmendmentRepository::delete);
            reportValidationRepository.findByReportIdOrderByValidatedAtAsc(id)
                    .forEach(reportValidationRepository::delete);
            reportVersionRepository.findByReportIdOrderByVersionNumberAsc(id)
                    .forEach(reportVersionRepository::delete);
            reportRepository.findById(id).ifPresent(reportRepository::delete);
        }
    }

    private void deleteInvoices(List<Long> invoiceIds) {
        for (Long id : invoiceIds) {
            invoiceRepository.findById(id).ifPresent(invoiceRepository::delete);
        }
    }

    private void deleteAppointments(List<Long> appointmentIds) {
        for (Long id : appointmentIds) {
            appointmentRepository.findById(id).ifPresent(appointmentRepository::delete);
        }
    }

    private void clearExamenDependents(List<Long> examenIds) {
        if (examenIds.isEmpty()) {
            return;
        }
        entityManager
                .createQuery("UPDATE Appointment a SET a.examen = null WHERE a.examen.id IN :ids")
                .setParameter("ids", examenIds)
                .executeUpdate();
        for (Long examenId : examenIds) {
            paiementExamenRepository.findByExamenIdOrderByCreatedAtAsc(examenId)
                    .forEach(paiementExamenRepository::delete);
            documentExamenRepository.findByExamenIdOrderByCreatedAtDesc(examenId)
                    .forEach(documentExamenRepository::delete);
            imagingStudyRepository
                    .findFirstByExamenId(examenId)
                    .ifPresent(
                            study -> {
                                imagingSeriesRepository
                                        .findByStudyIdOrderBySeriesNumberAscIdAsc(study.getId())
                                        .forEach(
                                                series -> {
                                                    imagingInstanceRepository
                                                            .findBySeriesIdOrderByInstanceNumberAscIdAsc(
                                                                    series.getId())
                                                            .forEach(imagingInstanceRepository::delete);
                                                    imagingSeriesRepository.delete(series);
                                                });
                                imagingStudyRepository.delete(study);
                            });
            // orphan reports not marked
            reportRepository
                    .findByExamenId(examenId)
                    .ifPresent(
                            r -> {
                                deleteReports(List.of(r.getId()));
                            });
        }
    }

    private void deleteExamens(List<Long> examenIds) {
        for (Long id : examenIds) {
            examenRepository.findById(id).ifPresent(examenRepository::delete);
        }
    }

    private void deletePatients(List<Long> patientIds) {
        for (Long id : patientIds) {
            patientRepository.findById(id).ifPresent(patientRepository::delete);
        }
    }

    private void deleteMedecins(List<Long> medecinIds) {
        for (Long id : medecinIds) {
            medecinReferentRepository.findById(id).ifPresent(medecinReferentRepository::delete);
        }
    }

    private void deleteResources(List<Long> resourceIds) {
        for (Long id : resourceIds) {
            resourceRoomRepository.findById(id).ifPresent(resourceRoomRepository::delete);
        }
    }

    private void deleteCatalogues(List<Long> catalogueIds) {
        for (Long id : catalogueIds) {
            catalogueExamenRepository.findById(id).ifPresent(catalogueExamenRepository::delete);
        }
    }
}
