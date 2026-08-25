package com.crm.medicare.service;

import com.crm.medicare.common.ApiException;
import com.crm.medicare.dto.AppointmentCancelRequest;
import com.crm.medicare.dto.AppointmentDto;
import com.crm.medicare.dto.AppointmentRescheduleRequest;
import com.crm.medicare.dto.AppointmentWriteRequest;
import com.crm.medicare.dto.ResourceDto;
import com.crm.medicare.dto.WorklistCreateRequest;
import com.crm.medicare.dto.WorklistItemDto;
import com.crm.medicare.entity.Appointment;
import com.crm.medicare.entity.AppointmentStatus;
import com.crm.medicare.entity.AppointmentStatusHistory;
import com.crm.medicare.entity.CatalogueExamen;
import com.crm.medicare.entity.Examen;
import com.crm.medicare.entity.MedecinReferent;
import com.crm.medicare.entity.Modalite;
import com.crm.medicare.entity.Patient;
import com.crm.medicare.entity.ResourceRoom;
import com.crm.medicare.repository.AppointmentRepository;
import com.crm.medicare.repository.CatalogueExamenRepository;
import com.crm.medicare.repository.ExamenRepository;
import com.crm.medicare.repository.MedecinReferentRepository;
import com.crm.medicare.repository.PatientRepository;
import com.crm.medicare.repository.ResourceRoomRepository;
import com.crm.medicare.security.SecurityUtils;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.EnumSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AppointmentService {

    private static final ZoneId ZONE = ZoneId.of("Africa/Casablanca");
    private static final DateTimeFormatter DT =
            DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm[:ss]");
    private static final Set<AppointmentStatus> BLOCKING =
            EnumSet.of(
                    AppointmentStatus.SCHEDULED,
                    AppointmentStatus.CONFIRMED,
                    AppointmentStatus.RESCHEDULED,
                    AppointmentStatus.CHECKED_IN);
    private static final Set<AppointmentStatus> EXCLUDED_FROM_OVERLAP =
            EnumSet.of(AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW);

    private final AppointmentRepository appointmentRepository;
    private final ResourceRoomRepository resourceRoomRepository;
    private final PatientRepository patientRepository;
    private final CatalogueExamenRepository catalogueExamenRepository;
    private final MedecinReferentRepository medecinReferentRepository;
    private final ExamenRepository examenRepository;
    private final WorklistService worklistService;
    private final AuditService auditService;

    @Transactional(readOnly = true)
    public List<ResourceDto> listResources(boolean includeInactive) {
        List<ResourceRoom> rows =
                includeInactive
                        ? resourceRoomRepository.findAll()
                        : resourceRoomRepository.findByActifTrueOrderByLibelleAsc();
        return rows.stream().map(this::toResourceDto).toList();
    }

    @Transactional
    public ResourceDto createResource(String code, String libelle, String modalite) {
        if (code == null || code.isBlank() || libelle == null || libelle.isBlank()) {
            throw ApiException.badRequest("code et libelle sont obligatoires");
        }
        if (resourceRoomRepository.findByCodeIgnoreCase(code.trim()).isPresent()) {
            throw ApiException.conflict("resource_duplicate", "Une ressource avec ce code existe déjà");
        }
        ResourceRoom room = new ResourceRoom();
        room.setCode(code.trim().toUpperCase(Locale.ROOT));
        room.setLibelle(libelle.trim());
        if (modalite != null && !modalite.isBlank()) {
            room.setModalite(parseModalite(modalite));
        }
        room.setActif(true);
        return toResourceDto(resourceRoomRepository.save(room));
    }

    @Transactional(readOnly = true)
    public List<AppointmentDto> list(
            LocalDate from,
            LocalDate to,
            String statut,
            Long resourceId,
            Long medecinId,
            String modalite) {
        LocalDate start = from != null ? from : LocalDate.now(ZONE);
        LocalDate end = to != null ? to : start;
        if (end.isBefore(start)) {
            throw ApiException.badRequest("La date de fin doit être postérieure ou égale au début");
        }
        AppointmentStatus status = parseStatusOrNull(statut);
        Modalite modaliteEnum = parseModalite(modalite);
        return appointmentRepository
                .findInRange(
                        start.atStartOfDay(),
                        end.plusDays(1).atStartOfDay(),
                        status,
                        resourceId,
                        medecinId,
                        modaliteEnum)
                .stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public AppointmentDto getById(Long id) {
        return toDto(load(id));
    }

    @Transactional
    public AppointmentDto create(AppointmentWriteRequest request) {
        if (request == null || request.getPatientId() == null) {
            throw ApiException.badRequest("patientId est obligatoire");
        }
        if (request.getDateHeure() == null || request.getDateHeure().isBlank()) {
            throw ApiException.badRequest("dateHeure est obligatoire");
        }

        Patient patient =
                patientRepository
                        .findByIdAndDeletedAtIsNull(request.getPatientId())
                        .orElseThrow(() -> ApiException.notFound("Patient introuvable"));
        CatalogueExamen catalogue = resolveCatalogue(request.getCatalogueId());
        ResourceRoom resource = resolveResource(request.getResourceId(), request.getSalle());
        MedecinReferent prescripteur = resolvePrescripteur(request.getPrescripteurId());

        Modalite modalite =
                catalogue != null
                        ? catalogue.getModalite()
                        : (resource != null && resource.getModalite() != null
                                ? resource.getModalite()
                                : parseModalite(request.getModalite()));
        if (modalite == null) {
            throw ApiException.badRequest("modalite est obligatoire (ou catalogue / ressource)");
        }

        int duree = resolveDuree(request.getDureeMinutes(), catalogue);
        LocalDateTime startsAt = parseDateHeure(request.getDateHeure());
        LocalDateTime endsAt = startsAt.plusMinutes(duree);

        if (resource != null) {
            assertNoOverlap(resource.getId(), startsAt, endsAt, null);
        }

        Appointment appt = new Appointment();
        appt.setPatient(patient);
        appt.setCatalogue(catalogue);
        appt.setResource(resource);
        appt.setPrescripteur(prescripteur);
        appt.setStartsAt(startsAt);
        appt.setEndsAt(endsAt);
        appt.setDureeMinutes(duree);
        appt.setModalite(modalite);
        appt.setPriorite(
                blankToNull(request.getPriorite()) != null
                        ? request.getPriorite().trim().toUpperCase(Locale.ROOT)
                        : "ROUTINE");
        appt.setMotif(blankToNull(request.getMotif()));
        appt.setNotes(blankToNull(request.getNotes()));
        appt.setStatut(AppointmentStatus.SCHEDULED);
        appt.setCreatedBy(SecurityUtils.currentUserOrNull());
        appendHistory(appt, null, AppointmentStatus.SCHEDULED, "Création");

        Appointment saved = appointmentRepository.save(appt);
        auditService.record(
                AuditService.APPOINTMENT_CREATE,
                "Appointment",
                String.valueOf(saved.getId()),
                Map.of(
                        "patientId", patient.getId(),
                        "startsAt", startsAt.toString(),
                        "statut", saved.getStatut().name()));
        return toDto(saved);
    }

    @Transactional
    public AppointmentDto patch(Long id, AppointmentWriteRequest request) {
        Appointment appt = load(id);
        if (appt.getStatut() == AppointmentStatus.CANCELLED
                || appt.getStatut() == AppointmentStatus.CHECKED_IN
                || appt.getStatut() == AppointmentStatus.NO_SHOW) {
            throw ApiException.conflict(
                    "appointment_locked", "Ce rendez-vous ne peut plus être modifié dans cet état");
        }
        AppointmentStatus before = appt.getStatut();

        if (request.getCatalogueId() != null) {
            appt.setCatalogue(resolveCatalogue(request.getCatalogueId()));
            if (appt.getCatalogue() != null) {
                appt.setModalite(appt.getCatalogue().getModalite());
            }
        }
        if (request.getResourceId() != null || blankToNull(request.getSalle()) != null) {
            appt.setResource(resolveResource(request.getResourceId(), request.getSalle()));
        }
        if (request.getPrescripteurId() != null) {
            appt.setPrescripteur(resolvePrescripteur(request.getPrescripteurId()));
        }
        if (request.getPriorite() != null && !request.getPriorite().isBlank()) {
            appt.setPriorite(request.getPriorite().trim().toUpperCase(Locale.ROOT));
        }
        if (request.getMotif() != null) {
            appt.setMotif(blankToNull(request.getMotif()));
        }
        if (request.getNotes() != null) {
            appt.setNotes(blankToNull(request.getNotes()));
        }
        if (request.getModalite() != null && !request.getModalite().isBlank()) {
            appt.setModalite(parseModalite(request.getModalite()));
        }

        boolean timeChanged = false;
        if (request.getDateHeure() != null && !request.getDateHeure().isBlank()) {
            appt.setStartsAt(parseDateHeure(request.getDateHeure()));
            timeChanged = true;
        }
        if (request.getDureeMinutes() != null && request.getDureeMinutes() > 0) {
            appt.setDureeMinutes(request.getDureeMinutes());
            timeChanged = true;
        }
        if (timeChanged) {
            appt.setEndsAt(appt.getStartsAt().plusMinutes(appt.getDureeMinutes()));
        }

        if (appt.getResource() != null) {
            assertNoOverlap(
                    appt.getResource().getId(), appt.getStartsAt(), appt.getEndsAt(), appt.getId());
        }

        Appointment saved = appointmentRepository.save(appt);
        auditService.record(
                AuditService.APPOINTMENT_UPDATE,
                "Appointment",
                String.valueOf(saved.getId()),
                Map.of("statut", saved.getStatut().name()),
                Map.of("statut", before.name()),
                Map.of("statut", saved.getStatut().name()));
        return toDto(saved);
    }

    @Transactional
    public AppointmentDto confirm(Long id) {
        return transition(id, AppointmentStatus.CONFIRMED, "Confirmation", AuditService.APPOINTMENT_UPDATE);
    }

    @Transactional
    public AppointmentDto cancel(Long id, AppointmentCancelRequest request) {
        Appointment appt = load(id);
        if (appt.getStatut() == AppointmentStatus.CANCELLED) {
            return toDto(appt);
        }
        if (appt.getStatut() == AppointmentStatus.CHECKED_IN) {
            throw ApiException.conflict(
                    "appointment_checked_in", "Impossible d'annuler un rendez-vous déjà enregistré (check-in)");
        }
        AppointmentStatus from = appt.getStatut();
        appt.setStatut(AppointmentStatus.CANCELLED);
        appt.setCancelledReason(
                request != null && blankToNull(request.getReason()) != null
                        ? request.getReason().trim()
                        : null);
        appendHistory(appt, from, AppointmentStatus.CANCELLED, appt.getCancelledReason());
        Appointment saved = appointmentRepository.save(appt);
        auditService.record(
                AuditService.APPOINTMENT_CANCEL,
                "Appointment",
                String.valueOf(saved.getId()),
                Map.of("reason", saved.getCancelledReason() != null ? saved.getCancelledReason() : ""));
        return toDto(saved);
    }

    @Transactional
    public AppointmentDto reschedule(Long id, AppointmentRescheduleRequest request) {
        if (request == null || request.getDateHeure() == null || request.getDateHeure().isBlank()) {
            throw ApiException.badRequest("dateHeure est obligatoire pour reporter");
        }
        Appointment appt = load(id);
        if (appt.getStatut() == AppointmentStatus.CANCELLED
                || appt.getStatut() == AppointmentStatus.CHECKED_IN
                || appt.getStatut() == AppointmentStatus.NO_SHOW) {
            throw ApiException.conflict("appointment_locked", "Ce rendez-vous ne peut pas être reporté");
        }
        AppointmentStatus from = appt.getStatut();
        LocalDateTime startsAt = parseDateHeure(request.getDateHeure());
        int duree =
                request.getDureeMinutes() != null && request.getDureeMinutes() > 0
                        ? request.getDureeMinutes()
                        : appt.getDureeMinutes();
        LocalDateTime endsAt = startsAt.plusMinutes(duree);
        if (request.getResourceId() != null) {
            appt.setResource(
                    resourceRoomRepository
                            .findById(request.getResourceId())
                            .orElseThrow(() -> ApiException.notFound("Ressource introuvable")));
        }
        if (appt.getResource() != null) {
            assertNoOverlap(appt.getResource().getId(), startsAt, endsAt, appt.getId());
        }
        appt.setStartsAt(startsAt);
        appt.setEndsAt(endsAt);
        appt.setDureeMinutes(duree);
        appt.setStatut(AppointmentStatus.RESCHEDULED);
        appendHistory(
                appt,
                from,
                AppointmentStatus.RESCHEDULED,
                blankToNull(request.getNote()) != null ? request.getNote() : "Report");
        Appointment saved = appointmentRepository.save(appt);
        auditService.record(
                AuditService.APPOINTMENT_UPDATE,
                "Appointment",
                String.valueOf(saved.getId()),
                Map.of("action", "reschedule", "startsAt", startsAt.toString()));
        return toDto(saved);
    }

    @Transactional
    public AppointmentDto noShow(Long id) {
        return transition(id, AppointmentStatus.NO_SHOW, "No-show", AuditService.APPOINTMENT_UPDATE);
    }

    /**
     * Check-in : crée l'examen worklist (ARRIVED) et lie le rendez-vous.
     */
    @Transactional
    public AppointmentDto checkIn(Long id) {
        Appointment appt = load(id);
        if (appt.getStatut() == AppointmentStatus.CANCELLED
                || appt.getStatut() == AppointmentStatus.NO_SHOW) {
            throw ApiException.conflict("appointment_inactive", "Rendez-vous inactif");
        }
        if (appt.getStatut() == AppointmentStatus.CHECKED_IN && appt.getExamen() != null) {
            return toDto(appt);
        }

        WorklistCreateRequest create = new WorklistCreateRequest();
        create.setPatientId(appt.getPatient().getId());
        if (appt.getCatalogue() != null) {
            create.setCatalogueId(appt.getCatalogue().getId());
            create.setTypeExamen(appt.getCatalogue().getNom());
        } else {
            create.setTypeExamen(appt.getMotif() != null ? appt.getMotif() : "Examen");
            create.setModalite(appt.getModalite().name());
        }
        create.setDateHeure(appt.getStartsAt().format(DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm")));
        create.setPassageSansRdv(false);
        create.setPriorite(appt.getPriorite());
        if (appt.getResource() != null) {
            create.setSalle(appt.getResource().getLibelle());
        }
        if (appt.getPrescripteur() != null) {
            create.setPrescripteurId(String.valueOf(appt.getPrescripteur().getId()));
            create.setPrescripteurNom(appt.getPrescripteur().getNom());
        }

        WorklistItemDto examDto = worklistService.create(create);
        Long examenId = Long.valueOf(examDto.getId());
        Examen examen =
                examenRepository
                        .findById(examenId)
                        .orElseThrow(() -> ApiException.notFound("Examen créé introuvable"));

        AppointmentStatus from = appt.getStatut();
        appt.setExamen(examen);
        appt.setStatut(AppointmentStatus.CHECKED_IN);
        appendHistory(appt, from, AppointmentStatus.CHECKED_IN, "Check-in");
        Appointment saved = appointmentRepository.save(appt);

        auditService.record(
                AuditService.CHECKIN,
                "Appointment",
                String.valueOf(saved.getId()),
                Map.of("examenId", examenId));
        return toDto(saved);
    }

    private AppointmentDto transition(
            Long id, AppointmentStatus to, String note, String auditAction) {
        Appointment appt = load(id);
        if (appt.getStatut() == to) {
            return toDto(appt);
        }
        if (appt.getStatut() == AppointmentStatus.CANCELLED
                || appt.getStatut() == AppointmentStatus.CHECKED_IN) {
            throw ApiException.conflict(
                    "invalid_transition",
                    "Transition impossible de " + appt.getStatut() + " vers " + to);
        }
        if (to == AppointmentStatus.NO_SHOW
                && (appt.getStatut() != AppointmentStatus.SCHEDULED
                        && appt.getStatut() != AppointmentStatus.CONFIRMED
                        && appt.getStatut() != AppointmentStatus.RESCHEDULED)) {
            throw ApiException.conflict(
                    "invalid_transition", "No-show uniquement depuis un rendez-vous planifié/confirmé");
        }
        AppointmentStatus from = appt.getStatut();
        appt.setStatut(to);
        appendHistory(appt, from, to, note);
        Appointment saved = appointmentRepository.save(appt);
        auditService.record(
                auditAction,
                "Appointment",
                String.valueOf(saved.getId()),
                Map.of("from", from.name(), "to", to.name()));
        return toDto(saved);
    }

    private void assertNoOverlap(
            Long resourceId, LocalDateTime startsAt, LocalDateTime endsAt, Long excludeId) {
        List<Appointment> overlaps =
                appointmentRepository.findOverlaps(
                        resourceId, startsAt, endsAt, excludeId, EXCLUDED_FROM_OVERLAP);
        if (!overlaps.isEmpty()) {
            Appointment other = overlaps.get(0);
            throw ApiException.conflict(
                    "slot_conflict",
                    "Créneau déjà réservé sur cette ressource ("
                            + other.getStartsAt()
                            + " – "
                            + other.getEndsAt()
                            + ")");
        }
    }

    private void appendHistory(
            Appointment appt, AppointmentStatus from, AppointmentStatus to, String note) {
        AppointmentStatusHistory h =
                AppointmentStatusHistory.builder()
                        .appointment(appt)
                        .fromStatut(from)
                        .toStatut(to)
                        .actor(SecurityUtils.currentUserOrNull())
                        .note(note)
                        .createdAt(LocalDateTime.now(ZONE))
                        .build();
        appt.getStatusHistory().add(h);
    }

    private Appointment load(Long id) {
        return appointmentRepository
                .findByIdWithDetails(id)
                .orElseThrow(() -> ApiException.notFound("Rendez-vous introuvable"));
    }

    private CatalogueExamen resolveCatalogue(Long id) {
        if (id == null) {
            return null;
        }
        return catalogueExamenRepository
                .findById(id)
                .orElseThrow(() -> ApiException.notFound("Acte catalogue introuvable"));
    }

    private ResourceRoom resolveResource(Long resourceId, String salle) {
        if (resourceId != null) {
            return resourceRoomRepository
                    .findById(resourceId)
                    .orElseThrow(() -> ApiException.notFound("Ressource introuvable"));
        }
        if (salle == null || salle.isBlank()) {
            return null;
        }
        return resourceRoomRepository
                .findByCodeIgnoreCase(salle.trim())
                .or(() -> {
                    // match by libelle soft: create ephemeral? No — return null, store salle as note later
                    return java.util.Optional.empty();
                })
                .orElseGet(
                        () ->
                                resourceRoomRepository.findByActifTrueOrderByLibelleAsc().stream()
                                        .filter(r -> r.getLibelle().equalsIgnoreCase(salle.trim()))
                                        .findFirst()
                                        .orElse(null));
    }

    private MedecinReferent resolvePrescripteur(Long id) {
        if (id == null) {
            return null;
        }
        return medecinReferentRepository
                .findById(id)
                .orElseThrow(() -> ApiException.badRequest("Prescripteur introuvable"));
    }

    private int resolveDuree(Integer requested, CatalogueExamen catalogue) {
        if (requested != null && requested > 0) {
            return requested;
        }
        if (catalogue != null && catalogue.getDureeMinutes() != null && catalogue.getDureeMinutes() > 0) {
            return catalogue.getDureeMinutes();
        }
        return 30;
    }

    private LocalDateTime parseDateHeure(String raw) {
        try {
            String v = raw.trim();
            if (v.length() == 16) {
                v = v + ":00";
            }
            return LocalDateTime.parse(v, DT);
        } catch (DateTimeParseException ex) {
            throw ApiException.badRequest("dateHeure invalide (attendu YYYY-MM-ddTHH:mm)");
        }
    }

    private Modalite parseModalite(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        try {
            return Modalite.valueOf(raw.trim());
        } catch (IllegalArgumentException ex) {
            for (Modalite m : Modalite.values()) {
                if (m.name().equalsIgnoreCase(raw.trim())) {
                    return m;
                }
            }
            throw ApiException.badRequest("modalite invalide: " + raw);
        }
    }

    private AppointmentStatus parseStatusOrNull(String raw) {
        if (raw == null || raw.isBlank() || "tous".equalsIgnoreCase(raw)) {
            return null;
        }
        try {
            return AppointmentStatus.valueOf(raw.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            throw ApiException.badRequest("statut invalide: " + raw);
        }
    }

    private AppointmentDto toDto(Appointment a) {
        return AppointmentDto.builder()
                .id(String.valueOf(a.getId()))
                .patientId(a.getPatient() != null ? String.valueOf(a.getPatient().getId()) : null)
                .patient(a.getPatient() != null ? a.getPatient().getNomComplet() : null)
                .catalogueId(a.getCatalogue() != null ? String.valueOf(a.getCatalogue().getId()) : null)
                .examenLibelle(
                        a.getCatalogue() != null
                                ? a.getCatalogue().getNom()
                                : a.getMotif())
                .resourceId(a.getResource() != null ? String.valueOf(a.getResource().getId()) : null)
                .resourceCode(a.getResource() != null ? a.getResource().getCode() : null)
                .resourceLibelle(a.getResource() != null ? a.getResource().getLibelle() : null)
                .salle(a.getResource() != null ? a.getResource().getLibelle() : null)
                .modalite(a.getModalite() != null ? a.getModalite().name() : null)
                .prescripteurId(
                        a.getPrescripteur() != null ? String.valueOf(a.getPrescripteur().getId()) : null)
                .prescripteur(a.getPrescripteur() != null ? a.getPrescripteur().getNom() : null)
                .examenId(a.getExamen() != null ? String.valueOf(a.getExamen().getId()) : null)
                .statut(a.getStatut() != null ? a.getStatut().name() : null)
                .priorite(a.getPriorite())
                .dureeMinutes(a.getDureeMinutes())
                .motif(a.getMotif())
                .notes(a.getNotes())
                .startsAt(a.getStartsAt())
                .endsAt(a.getEndsAt())
                .build();
    }

    private ResourceDto toResourceDto(ResourceRoom r) {
        return ResourceDto.builder()
                .id(String.valueOf(r.getId()))
                .code(r.getCode())
                .libelle(r.getLibelle())
                .modalite(r.getModalite() != null ? r.getModalite().name() : null)
                .actif(r.isActif())
                .build();
    }

    private static String blankToNull(String v) {
        if (v == null) {
            return null;
        }
        String t = v.trim();
        return t.isEmpty() ? null : t;
    }
}
