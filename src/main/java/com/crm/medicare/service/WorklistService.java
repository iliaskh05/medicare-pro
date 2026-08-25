package com.crm.medicare.service;

import com.crm.medicare.common.ApiException;
import com.crm.medicare.dto.HistoriqueItemDto;
import com.crm.medicare.dto.PaiementCreateRequest;
import com.crm.medicare.dto.PaiementItemDto;
import com.crm.medicare.dto.StatusHistoryItemDto;
import com.crm.medicare.dto.WorklistCreateRequest;
import com.crm.medicare.dto.WorklistItemDto;
import com.crm.medicare.dto.WorklistPatchRequest;
import com.crm.medicare.entity.CatalogueExamen;
import com.crm.medicare.entity.EtatPatient;
import com.crm.medicare.entity.ExamStatusHistory;
import com.crm.medicare.entity.Examen;
import com.crm.medicare.entity.HistoriqueExamen;
import com.crm.medicare.entity.MedecinReferent;
import com.crm.medicare.entity.Modalite;
import com.crm.medicare.entity.Paiement;
import com.crm.medicare.entity.PaiementExamen;
import com.crm.medicare.entity.Patient;
import com.crm.medicare.entity.ResourceRoom;
import com.crm.medicare.entity.StatutCr;
import com.crm.medicare.entity.Utilisateur;
import com.crm.medicare.repository.CatalogueExamenRepository;
import com.crm.medicare.repository.ExamenRepository;
import com.crm.medicare.repository.MedecinReferentRepository;
import com.crm.medicare.repository.PaiementExamenRepository;
import com.crm.medicare.repository.PatientRepository;
import com.crm.medicare.repository.ResourceRoomRepository;
import com.crm.medicare.repository.UtilisateurRepository;
import com.crm.medicare.security.SecurityUtils;
import com.crm.medicare.workflow.EncounterStatus;
import com.crm.medicare.workflow.WorkflowEngine;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.Period;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class WorklistService {

    private static final ZoneId ZONE = ZoneId.of("Africa/Casablanca");
    private static final DateTimeFormatter DATE_TIME_SECONDS =
            DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss");
    private static final DateTimeFormatter DATE_TIME_MINUTES =
            DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm");

    private final ExamenRepository examenRepository;
    private final MedecinReferentRepository medecinReferentRepository;
    private final PatientService patientService;
    private final PatientRepository patientRepository;
    private final CatalogueExamenRepository catalogueExamenRepository;
    private final PaiementExamenRepository paiementExamenRepository;
    private final WorkflowEngine workflowEngine;
    private final AuditService auditService;
    private final UtilisateurRepository utilisateurRepository;
    private final ReportService reportService;
    private final ResourceRoomRepository resourceRoomRepository;

    public record WorklistListResult(
            List<WorklistItemDto> items, long total, Integer page, Integer size) {}

    @Transactional(readOnly = true)
    public List<WorklistItemDto> listByDate(LocalDate date, String search, String status) {
        return listByRange(date, date, search, status, null, null, null, null, null).items();
    }

    @Transactional(readOnly = true)
    public List<WorklistItemDto> listByRange(LocalDate from, LocalDate to, String search, String status) {
        return listByRange(from, to, search, status, null, null, null, null, null).items();
    }

    @Transactional(readOnly = true)
    public WorklistListResult listByRange(
            LocalDate from,
            LocalDate to,
            String search,
            String status,
            String modalite,
            String priorite,
            Long radiologueId,
            Integer page,
            Integer size) {
        LocalDate debutJour = from != null ? from : LocalDate.now(ZONE);
        LocalDate finJour = to != null ? to : debutJour;
        if (finJour.isBefore(debutJour)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Plage de dates invalide");
        }
        LocalDateTime debut = debutJour.atStartOfDay();
        LocalDateTime fin = finJour.plusDays(1).atStartOfDay();

        String searchPattern =
                isBlank(search) ? null : "%" + search.trim().toLowerCase(Locale.ROOT) + "%";
        EtatPatient etatFilter = parseStatusFilter(status);
        Modalite modaliteFilter = parseModaliteFilter(modalite);
        String prioriteFilter =
                isBlank(priorite) ? null : priorite.trim().toLowerCase(Locale.ROOT);

        if (page != null) {
            int pageIndex = Math.max(page, 0);
            int pageSize = size == null || size < 1 ? 50 : Math.min(size, 200);
            Page<Long> idPage =
                    examenRepository.searchWorklistIds(
                            debut,
                            fin,
                            searchPattern,
                            etatFilter,
                            modaliteFilter,
                            prioriteFilter,
                            radiologueId,
                            PageRequest.of(pageIndex, pageSize));
            List<Long> ids = idPage.getContent();
            if (ids.isEmpty()) {
                return new WorklistListResult(List.of(), idPage.getTotalElements(), pageIndex, pageSize);
            }
            Map<Long, Examen> byId =
                    examenRepository.findAllByIdWithDetails(ids).stream()
                            .collect(Collectors.toMap(Examen::getId, Function.identity(), (a, b) -> a, HashMap::new));
            List<WorklistItemDto> items =
                    ids.stream()
                            .map(byId::get)
                            .filter(e -> e != null)
                            .map(e -> toDto(e, false))
                            .toList();
            return new WorklistListResult(items, idPage.getTotalElements(), pageIndex, pageSize);
        }

        List<WorklistItemDto> items =
                examenRepository
                        .searchWorklist(
                                debut,
                                fin,
                                searchPattern,
                                etatFilter,
                                modaliteFilter,
                                prioriteFilter,
                                radiologueId)
                        .stream()
                        .map(e -> toDto(e, false))
                        .toList();
        return new WorklistListResult(items, items.size(), null, null);
    }

    @Transactional(readOnly = true)
    public WorklistItemDto getById(Long id) {
        Examen examen =
                examenRepository
                        .findByIdWithHistorique(id)
                        .or(() -> examenRepository.findByIdWithPatient(id))
                        .or(() -> examenRepository.findById(id))
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Examen introuvable"));
        return toDto(examen, true);
    }

    @Transactional(readOnly = true)
    public List<StatusHistoryItemDto> statusHistory(Long id) {
        Examen examen = load(id);
        return examen.getStatusHistory().stream()
                .sorted(Comparator.comparing(ExamStatusHistory::getCreatedAt))
                .map(
                        h ->
                                StatusHistoryItemDto.builder()
                                        .fromStatus(h.getFromStatus())
                                        .toStatus(h.getToStatus())
                                        .actor(h.getActorName())
                                        .note(null)
                                        .at(h.getCreatedAt())
                                        .build())
                .toList();
    }

    @Transactional(readOnly = true)
    public List<WorklistItemDto> listByPatient(Long patientId) {
        return examenRepository.findByPatientIdOrderByDateExamenDesc(patientId).stream()
                .map(e -> toDto(e, false))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<WorklistItemDto> listDossiers(String statut) {
        List<String> statuts;
        if (statut == null || statut.isBlank() || "a_remettre".equalsIgnoreCase(statut.trim())) {
            statuts = List.of("a_preparer", "pret", "non_remis");
        } else {
            statuts = List.of(statut.trim());
        }
        return examenRepository.findDossiersByStatuts(statuts).stream().map(e -> toDto(e, false)).toList();
    }

    @Transactional(readOnly = true)
    public List<WorklistItemDto> listImpayes() {
        return examenRepository
                .findImpayes(Set.of(Paiement.impaye, Paiement.cote))
                .stream()
                .map(e -> toDto(e, false))
                .toList();
    }

    @Transactional
    public WorklistItemDto updateStatus(Long id, String nouveauStatut) {
        Examen examen =
                examenRepository
                        .findById(id)
                        .orElseThrow(
                                () ->
                                        new ResponseStatusException(
                                                HttpStatus.NOT_FOUND, "Examen introuvable"));

        EtatPatient etat = parseStatusFilter(nouveauStatut);
        if (etat == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "nouveauStatut invalide (attendu: attendu, arrive, retard, attente_longue)");
        }

        EncounterStatus from =
                examen.getWorkflowStatus() != null
                        ? examen.getWorkflowStatus()
                        : workflowEngine.fromEtatPatient(examen.getEtatPatient());
        EncounterStatus to = workflowEngine.fromEtatPatient(etat);
        workflowEngine.transitionEncounter(from, to);

        examen.setEtatPatient(etat);
        examen.setWorkflowStatus(to);
        if (to == EncounterStatus.ARRIVED && examen.getArrivedAt() == null) {
            examen.setArrivedAt(LocalDateTime.now(ZONE));
        }
        if (to == EncounterStatus.CANCELLED || to == EncounterStatus.NO_SHOW) {
            examen.setCancelledAt(LocalDateTime.now(ZONE));
        }

        Utilisateur actor = SecurityUtils.currentUserOrNull();
        HistoriqueExamen hist = new HistoriqueExamen();
        hist.setExamen(examen);
        hist.setDate(LocalDateTime.now(ZONE));
        hist.setAuteur(actor != null ? actor.getNomComplet() : "Worklist");
        hist.setAction("Statut patient → " + etat.name());
        examen.getHistorique().add(hist);

        ExamStatusHistory trail = new ExamStatusHistory();
        trail.setExamen(examen);
        trail.setFromStatus(from.name());
        trail.setToStatus(to.name());
        trail.setActorId(actor != null ? actor.getId() : null);
        trail.setActorName(actor != null ? actor.getNomComplet() : "Worklist");
        trail.setCreatedAt(LocalDateTime.now(ZONE));
        examen.getStatusHistory().add(trail);

        Examen saved = examenRepository.save(examen);
        auditService.record(
                AuditService.EXAM_STATUS_CHANGED,
                "Examen",
                String.valueOf(id),
                java.util.Map.of("from", from.name(), "to", to.name(), "etatPatient", etat.name()));
        return toDto(saved, true);
    }

    /**
     * Applique un {@link EncounterStatus} métier (salle d'attente / advance),
     * synchronise {@code etat_patient} et historise.
     */
    @Transactional
    public WorklistItemDto applyWorkflowStatus(Long id, EncounterStatus to) {
        if (to == null) {
            throw ApiException.badRequest("Statut workflow manquant");
        }
        Examen examen =
                examenRepository
                        .findById(id)
                        .orElseThrow(() -> ApiException.notFound("Examen introuvable"));
        EncounterStatus from =
                examen.getWorkflowStatus() != null
                        ? examen.getWorkflowStatus()
                        : workflowEngine.fromEtatPatient(examen.getEtatPatient());
        workflowEngine.transitionEncounter(from, to);
        examen.setWorkflowStatus(to);
        examen.setEtatPatient(workflowEngine.toEtatPatient(to));
        if (to == EncounterStatus.ARRIVED && examen.getArrivedAt() == null) {
            examen.setArrivedAt(LocalDateTime.now(ZONE));
        }
        if (to == EncounterStatus.CANCELLED || to == EncounterStatus.NO_SHOW) {
            examen.setCancelledAt(LocalDateTime.now(ZONE));
        }

        Utilisateur actor = SecurityUtils.currentUserOrNull();
        HistoriqueExamen hist = new HistoriqueExamen();
        hist.setExamen(examen);
        hist.setDate(LocalDateTime.now(ZONE));
        hist.setAuteur(actor != null ? actor.getNomComplet() : "Worklist");
        hist.setAction("Workflow → " + to.name());
        examen.getHistorique().add(hist);

        ExamStatusHistory trail = new ExamStatusHistory();
        trail.setExamen(examen);
        trail.setFromStatus(from.name());
        trail.setToStatus(to.name());
        trail.setActorId(actor != null ? actor.getId() : null);
        trail.setActorName(actor != null ? actor.getNomComplet() : "Worklist");
        trail.setCreatedAt(LocalDateTime.now(ZONE));
        examen.getStatusHistory().add(trail);

        Examen saved = examenRepository.save(examen);
        auditService.record(
                AuditService.EXAM_STATUS_CHANGED,
                "Examen",
                String.valueOf(id),
                java.util.Map.of("from", from.name(), "to", to.name()));
        return toDto(saved, true);
    }

    private static EtatPatient parseStatusFilter(String status) {
        if (isBlank(status) || "tous".equalsIgnoreCase(status.trim())) {
            return null;
        }
        String raw = status.trim().toLowerCase();
        return switch (raw) {
            case "en_attente", "attendu", "attente" -> EtatPatient.attendu;
            case "en_cours", "arrive", "arrivé", "termine_arrive" -> EtatPatient.arrive;
            case "retard", "en_retard" -> EtatPatient.retard;
            case "attente_longue", "trop_attendu" -> EtatPatient.attente_longue;
            case "termine", "terminé" -> EtatPatient.arrive; // alias UI
            default -> {
                try {
                    yield EtatPatient.valueOf(raw);
                } catch (IllegalArgumentException ex) {
                    throw new ResponseStatusException(
                            HttpStatus.BAD_REQUEST, "status invalide: " + status);
                }
            }
        };
    }

    private static Modalite parseModaliteFilter(String modalite) {
        if (isBlank(modalite) || "tous".equalsIgnoreCase(modalite.trim())) {
            return null;
        }
        try {
            return Modalite.valueOf(modalite.trim());
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "modalite invalide: " + modalite);
        }
    }

    @Transactional
    public WorklistItemDto create(WorklistCreateRequest request) {
        validateCreate(request);

        Patient patient;
        if (request.getPatientId() != null) {
            patient =
                    patientRepository
                            .findByIdAndDeletedAtIsNull(request.getPatientId())
                            .orElseThrow(
                                    () -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Patient introuvable"));
        } else {
            patient =
                    patientService.upsertFromWorklist(
                            request.getNom(),
                            request.getPrenom(),
                            request.getCin(),
                            request.getSexe(),
                            request.getTelephone(),
                            request.getNaissance());
        }
        MedecinReferent prescripteur = resolvePrescripteur(request.getPrescripteurId());
        LocalDateTime dateExamen = parseDateHeure(request.getDateHeure());
        CatalogueExamen catalogue = resolveCatalogue(request.getCatalogueId());
        Modalite modalite =
                catalogue != null ? catalogue.getModalite() : parseModalite(request.getModalite());
        boolean walkIn = Boolean.TRUE.equals(request.getPassageSansRdv());

        Examen examen = new Examen();
        examen.setNumSejour(generateNumSejour(dateExamen.toLocalDate()));
        examen.setPatient(patient);
        examen.setPrescripteur(prescripteur);
        examen.setPrescripteurNom(blankToNull(request.getPrescripteurNom()));
        if (examen.getPrescripteurNom() == null && prescripteur != null) {
            examen.setPrescripteurNom(prescripteur.getNom());
        }
        examen.setDateExamen(dateExamen);
        ResourceRoom resource = resolveResource(request.getResourceId());
        if (resource != null) {
            examen.setResource(resource);
            examen.setSalle(resource.getLibelle());
        } else {
            examen.setSalle(blankToNull(request.getSalle()));
        }
        examen.setDescription(
                catalogue != null ? catalogue.getNom() : blankToNull(request.getTypeExamen()));
        examen.setModalite(modalite);
        examen.setEtatPatient(walkIn ? EtatPatient.arrive : EtatPatient.attendu);
        examen.setWorkflowStatus(walkIn ? EncounterStatus.ARRIVED : EncounterStatus.SCHEDULED);
        if (walkIn) {
            examen.setArrivedAt(LocalDateTime.now(ZONE));
        }
        examen.setPriorite(blankToNull(request.getPriorite()) != null ? request.getPriorite().trim() : "ROUTINE");
        examen.setExamTypeCode(catalogue != null ? catalogue.getCode() : blankToNull(request.getTypeExamen()));
        examen.setCatalogue(catalogue);
        examen.setPassageSansRdv(walkIn);
        examen.setStatutCr(StatutCr.a_faire);
        BigDecimal tarif = catalogue != null && catalogue.getPrix() != null ? catalogue.getPrix() : BigDecimal.ZERO;
        examen.setMontant(tarif);
        BigDecimal acompte = request.getAcompte() != null ? request.getAcompte() : BigDecimal.ZERO;
        applyAcompte(examen, acompte);
        examen.setCreatedBy(SecurityUtils.currentUserOrNull());

        HistoriqueExamen creation = new HistoriqueExamen();
        creation.setExamen(examen);
        creation.setDate(LocalDateTime.now(ZONE));
        creation.setAuteur("Accueil");
        creation.setAction(walkIn ? "Passage sans rendez-vous" : "Rendez-vous / examen créé");
        examen.getHistorique().add(creation);

        Examen saved = examenRepository.save(examen);
        if (acompte.compareTo(BigDecimal.ZERO) > 0) {
            recordLedger(saved, acompte, "especes");
        }
        auditService.record(
                AuditService.EXAM_CREATE,
                "Examen",
                String.valueOf(saved.getId()),
                java.util.Map.of("numSejour", saved.getNumSejour()));
        return toDto(saved, true);
    }

    @Transactional
    public WorklistItemDto patch(Long id, WorklistPatchRequest request) {
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Corps de requête manquant");
        }
        String etat =
                request.getEtatPatient() != null ? request.getEtatPatient() : request.getNouveauStatut();
        if (etat != null && !etat.isBlank()) {
            updateStatus(id, etat);
        }
        Examen examen = load(id);
        if (request.getStatutCr() != null && !request.getStatutCr().isBlank()) {
            String cr = request.getStatutCr().trim();
            if ("signe".equalsIgnoreCase(cr) || "imprime".equalsIgnoreCase(cr)) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Validation CR uniquement via /api/reports/{id}/validate");
            }
            try {
                examen.setStatutCr(StatutCr.valueOf(cr));
            } catch (IllegalArgumentException ex) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "statutCr invalide");
            }
        }
        if (request.getPaiement() != null && !request.getPaiement().isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Statut paiement uniquement via API de paiement (facture / worklist paiements)");
        }
        if (request.getMontant() != null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Montant issu du catalogue — modification directe interdite");
        }
        if (request.getAcompte() != null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Acompte uniquement via API de paiement");
        }
        if (request.getPriorite() != null && !request.getPriorite().isBlank()) {
            examen.setPriorite(request.getPriorite().trim());
        }
        if (request.getDossierStatut() != null && !request.getDossierStatut().isBlank()) {
            applyDossierStatut(examen, request.getDossierStatut().trim());
        }
        if (request.getIndication() != null) {
            examen.setIndication(blankToNull(request.getIndication()));
        }
        if (request.getTechnique() != null) {
            examen.setTechnique(blankToNull(request.getTechnique()));
        }
        if (request.getResultats() != null) {
            examen.setResultats(blankToNull(request.getResultats()));
        }
        if (request.getConclusion() != null) {
            examen.setConclusion(blankToNull(request.getConclusion()));
        }
        composeCompteRendu(examen);
        Examen saved = examenRepository.save(examen);
        if (request.getIndication() != null
                || request.getTechnique() != null
                || request.getResultats() != null
                || request.getConclusion() != null) {
            reportService.upsertDraftFromExamen(
                    saved.getId(),
                    saved.getIndication(),
                    saved.getTechnique(),
                    saved.getResultats(),
                    saved.getConclusion(),
                    saved.getCompteRendu());
        }
        auditService.record(AuditService.EXAM_UPDATE, "Examen", String.valueOf(id), java.util.Map.of());
        return toDto(saved, true);
    }

    @Transactional
    public WorklistItemDto recordPayment(Long id, PaiementCreateRequest request) {
        if (request == null || request.getMontant() == null || request.getMontant().compareTo(BigDecimal.ZERO) <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "montant de paiement invalide");
        }
        Examen examen = load(id);
        BigDecimal total = examen.getMontant() != null ? examen.getMontant() : BigDecimal.ZERO;
        BigDecimal current = examen.getAcompte() != null ? examen.getAcompte() : BigDecimal.ZERO;
        BigDecimal next = current.add(request.getMontant());
        if (next.compareTo(total) > 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "L'avance ne peut pas dépasser le total");
        }
        applyAcompte(examen, next);
        recordLedger(examen, request.getMontant(), request.getMode());
        HistoriqueExamen hist = new HistoriqueExamen();
        hist.setExamen(examen);
        hist.setDate(LocalDateTime.now(ZONE));
        Utilisateur actor = SecurityUtils.currentUserOrNull();
        hist.setAuteur(actor != null ? actor.getNomComplet() : "Caisse");
        hist.setAction("Paiement " + request.getMontant() + " DH");
        examen.getHistorique().add(hist);
        Examen saved = examenRepository.save(examen);
        auditService.record(
                AuditService.PAYMENT_CREATE,
                "Examen",
                String.valueOf(id),
                java.util.Map.of(
                        "montant", String.valueOf(request.getMontant()),
                        "source_type", "EXAM",
                        "source_id", String.valueOf(id)));
        return toDto(saved, true);
    }

    @Transactional(readOnly = true)
    public List<PaiementItemDto> listPayments(Long id) {
        load(id);
        return paiementExamenRepository.findByExamenIdOrderByCreatedAtAsc(id).stream()
                .map(
                        p ->
                                PaiementItemDto.builder()
                                        .id(p.getId())
                                        .montant(p.getMontant())
                                        .mode(p.getMode())
                                        .createdAt(p.getCreatedAt())
                                        .createdBy(p.getCreatedBy())
                                        .build())
                .toList();
    }

    @Transactional
    public WorklistItemDto saveCompteRendu(Long id, String texte) {
        Examen examen = load(id);
        examen.setCompteRendu(texte);
        if (examen.getStatutCr() == StatutCr.a_faire) {
            examen.setStatutCr(StatutCr.en_redaction);
        }
        Examen saved = examenRepository.save(examen);
        reportService.upsertDraftFromExamen(
                saved.getId(),
                saved.getIndication(),
                saved.getTechnique(),
                saved.getResultats(),
                saved.getConclusion(),
                texte);
        auditService.record(
                AuditService.EXAM_UPDATE,
                "Examen",
                String.valueOf(id),
                java.util.Map.of("field", "compteRendu"));
        return toDto(saved, true);
    }

    @Transactional
    public WorklistItemDto assign(Long id, Long radiologueId) {
        Examen examen =
                examenRepository
                        .findById(id)
                        .orElseThrow(
                                () -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Examen introuvable"));
        if (radiologueId == null) {
            examen.setAssignedRadiologue(null);
        } else {
            Utilisateur radiologue =
                    utilisateurRepository
                            .findById(radiologueId)
                            .orElseThrow(
                                    () ->
                                            new ResponseStatusException(
                                                    HttpStatus.BAD_REQUEST, "Radiologue introuvable"));
            examen.setAssignedRadiologue(radiologue);
            examen.setMedecin(radiologue.getNomComplet());
        }
        auditService.record(
                AuditService.WORKLIST_ASSIGN,
                "Examen",
                String.valueOf(id),
                java.util.Map.of("assigned", String.valueOf(radiologueId)));
        return toDto(examenRepository.save(examen), true);
    }

    private MedecinReferent resolvePrescripteur(String prescripteurId) {
        if (prescripteurId == null || prescripteurId.isBlank()) {
            return null;
        }
        try {
            Long id = Long.valueOf(prescripteurId.trim());
            return medecinReferentRepository
                    .findById(id)
                    .orElseThrow(
                            () ->
                                    new ResponseStatusException(
                                            HttpStatus.BAD_REQUEST,
                                            "Prescripteur introuvable: " + prescripteurId));
        } catch (NumberFormatException ex) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "prescripteurId invalide: " + prescripteurId);
        }
    }

    private String generateNumSejour(LocalDate jour) {
        String prefix = "SEJ-" + jour.getYear() + "-";
        long seq = examenRepository.countByNumSejourStartingWith(prefix) + 1;
        return prefix + String.format("%06d", seq);
    }

    private WorklistItemDto toDto(Examen examen, boolean includeHistorique) {
        Patient patient = examen.getPatient();
        String prescripteurLabel = examen.getPrescripteurNom();
        if ((prescripteurLabel == null || prescripteurLabel.isBlank())
                && examen.getPrescripteur() != null) {
            prescripteurLabel = examen.getPrescripteur().getNom();
        }

        List<HistoriqueItemDto> historique = List.of();
        if (includeHistorique && examen.getHistorique() != null) {
            historique =
                    examen.getHistorique().stream()
                            .map(h -> new HistoriqueItemDto(h.getDate(), h.getAuteur(), h.getAction()))
                            .toList();
        }

        return WorklistItemDto.builder()
                .id(String.valueOf(examen.getId()))
                .numSejour(examen.getNumSejour())
                .patientId(patient != null ? String.valueOf(patient.getId()) : null)
                .patient(patient != null ? patient.getNomComplet() : null)
                .cin(patient != null ? patient.getCin() : null)
                .telephone(patient != null ? patient.getTelephone() : null)
                .age(calculateAge(patient != null ? patient.getDateNaissance() : null))
                .sexe(patient != null ? patient.getSexe() : null)
                .medecin(examen.getMedecin())
                .radiologueId(
                        examen.getAssignedRadiologue() != null
                                ? String.valueOf(examen.getAssignedRadiologue().getId())
                                : null)
                .resourceId(
                        examen.getResource() != null
                                ? String.valueOf(examen.getResource().getId())
                                : null)
                .prescripteur(prescripteurLabel)
                .dateExamen(examen.getDateExamen())
                .salle(examen.getSalle())
                .description(examen.getDescription())
                .modalite(examen.getModalite() != null ? examen.getModalite().name() : null)
                .etatPatient(examen.getEtatPatient() != null ? examen.getEtatPatient().name() : null)
                .statutCr(examen.getStatutCr() != null ? examen.getStatutCr().name() : null)
                .paiement(examen.getPaiement() != null ? examen.getPaiement().name() : null)
                .montant(examen.getMontant())
                .acompte(examen.getAcompte() != null ? examen.getAcompte() : BigDecimal.ZERO)
                .reste(resteOf(examen))
                .catalogueId(examen.getCatalogue() != null ? examen.getCatalogue().getId() : null)
                .dossierStatut(examen.getDossierStatut())
                .dossierRemisAt(examen.getDossierRemisAt())
                .dossierRemisPar(examen.getDossierRemisPar())
                .priorite(examen.getPriorite())
                .indication(examen.getIndication())
                .technique(examen.getTechnique())
                .resultats(examen.getResultats())
                .conclusion(examen.getConclusion())
                .passageSansRdv(examen.isPassageSansRdv())
                .compteRendu(examen.getCompteRendu())
                .historique(historique)
                .build();
    }

    private Examen load(Long id) {
        return examenRepository
                .findByIdWithPatient(id)
                .or(() -> examenRepository.findById(id))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Examen introuvable"));
    }

    private CatalogueExamen resolveCatalogue(Long catalogueId) {
        if (catalogueId == null) {
            return null;
        }
        CatalogueExamen acte =
                catalogueExamenRepository
                        .findById(catalogueId)
                        .orElseThrow(
                                () -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Acte du catalogue introuvable"));
        if (!acte.isActif()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Acte inactif");
        }
        return acte;
    }

    private void applyAcompte(Examen examen, BigDecimal acompte) {
        BigDecimal value = acompte != null ? acompte : BigDecimal.ZERO;
        if (value.compareTo(BigDecimal.ZERO) < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "acompte invalide");
        }
        BigDecimal total = examen.getMontant() != null ? examen.getMontant() : BigDecimal.ZERO;
        if (value.compareTo(total) > 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "L'avance ne peut pas dépasser le total");
        }
        examen.setAcompte(value);
        if (total.compareTo(BigDecimal.ZERO) <= 0) {
            examen.setPaiement(value.compareTo(BigDecimal.ZERO) > 0 ? Paiement.paye : Paiement.impaye);
        } else if (value.compareTo(BigDecimal.ZERO) <= 0) {
            examen.setPaiement(Paiement.impaye);
        } else if (value.compareTo(total) >= 0) {
            examen.setPaiement(Paiement.paye);
        } else {
            examen.setPaiement(Paiement.cote);
        }
    }

    private void applyDossierStatut(Examen examen, String statut) {
        Set<String> allowed = Set.of("a_preparer", "pret", "remis", "non_remis", "envoye");
        if (!allowed.contains(statut)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "dossierStatut invalide");
        }
        examen.setDossierStatut(statut);
        if ("remis".equals(statut) || "envoye".equals(statut)) {
            examen.setDossierRemisAt(LocalDateTime.now(ZONE));
            Utilisateur actor = SecurityUtils.currentUserOrNull();
            examen.setDossierRemisPar(actor != null ? actor.getNomComplet() : "Accueil");
        }
    }

    private void recordLedger(Examen examen, BigDecimal montant, String mode) {
        PaiementExamen row = new PaiementExamen();
        row.setExamen(examen);
        row.setMontant(montant);
        row.setMode(isBlank(mode) ? "especes" : mode.trim());
        row.setSourceType("EXAM");
        row.setSourceId(examen.getId() != null ? String.valueOf(examen.getId()) : null);
        Utilisateur actor = SecurityUtils.currentUserOrNull();
        row.setCreatedBy(actor != null ? actor.getNomComplet() : null);
        paiementExamenRepository.save(row);
    }

    private ResourceRoom resolveResource(Long resourceId) {
        if (resourceId == null) {
            return null;
        }
        return resourceRoomRepository
                .findById(resourceId)
                .orElseThrow(
                        () ->
                                new ResponseStatusException(
                                        HttpStatus.BAD_REQUEST, "Ressource introuvable"));
    }

    private static void composeCompteRendu(Examen examen) {
        if (!isBlank(examen.getCompteRendu())) {
            return;
        }
        StringBuilder sb = new StringBuilder();
        appendSection(sb, "INDICATION", examen.getIndication());
        appendSection(sb, "TECHNIQUE", examen.getTechnique());
        appendSection(sb, "OBSERVATIONS", examen.getResultats());
        appendSection(sb, "CONCLUSION", examen.getConclusion());
        if (!sb.isEmpty()) {
            examen.setCompteRendu(sb.toString().trim());
        }
    }

    private static void appendSection(StringBuilder sb, String title, String body) {
        if (body == null || body.isBlank()) {
            return;
        }
        if (!sb.isEmpty()) {
            sb.append("\n\n");
        }
        sb.append(title).append("\n").append(body.trim());
    }

    private static BigDecimal resteOf(Examen examen) {
        BigDecimal total = examen.getMontant() != null ? examen.getMontant() : BigDecimal.ZERO;
        BigDecimal paid = examen.getAcompte() != null ? examen.getAcompte() : BigDecimal.ZERO;
        BigDecimal reste = total.subtract(paid);
        return reste.compareTo(BigDecimal.ZERO) < 0 ? BigDecimal.ZERO : reste;
    }

    private void validateCreate(WorklistCreateRequest request) {
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Corps de requête manquant");
        }
        if (request.getPatientId() == null && isBlank(request.getNom()) && isBlank(request.getPrenom())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "nom/prenom obligatoires");
        }
        if (request.getPatientId() == null && isBlank(request.getCin())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "cin obligatoire");
        }
        if (isBlank(request.getTypeExamen()) && request.getCatalogueId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "typeExamen ou catalogueId obligatoire");
        }
        if (isBlank(request.getModalite()) && request.getCatalogueId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "modalite obligatoire");
        }
        if (isBlank(request.getDateHeure())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "dateHeure obligatoire");
        }
    }

    private static Modalite parseModalite(String raw) {
        try {
            return Modalite.valueOf(raw.trim());
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "modalite invalide (attendu: Scanner, IRM, Mammographie, Radiologie, Échographie)");
        }
    }

    private static LocalDateTime parseDateHeure(String raw) {
        String value = raw.trim();
        try {
            if (value.length() == 16) {
                return LocalDateTime.parse(value, DATE_TIME_MINUTES);
            }
            return LocalDateTime.parse(value, DATE_TIME_SECONDS);
        } catch (DateTimeParseException ex) {
            try {
                return LocalDateTime.parse(value);
            } catch (DateTimeParseException nested) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "dateHeure invalide (attendu: YYYY-MM-DDTHH:mm ou YYYY-MM-DDTHH:mm:ss)");
            }
        }
    }

    private static Integer calculateAge(LocalDate dateNaissance) {
        if (dateNaissance == null) {
            return null;
        }
        return Period.between(dateNaissance, LocalDate.now(ZONE)).getYears();
    }

    private static String buildNomComplet(String nom, String prenom) {
        String n = nom == null ? "" : nom.trim();
        String p = prenom == null ? "" : prenom.trim();
        return (n + " " + p).trim();
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private static String blankToNull(String value) {
        return isBlank(value) ? null : value.trim();
    }
}
