package com.crm.medicare.service;

import com.crm.medicare.dto.HistoriqueItemDto;
import com.crm.medicare.dto.WorklistCreateRequest;
import com.crm.medicare.dto.WorklistItemDto;
import com.crm.medicare.entity.EtatPatient;
import com.crm.medicare.entity.ExamStatusHistory;
import com.crm.medicare.entity.Examen;
import com.crm.medicare.entity.HistoriqueExamen;
import com.crm.medicare.entity.MedecinReferent;
import com.crm.medicare.entity.Modalite;
import com.crm.medicare.entity.Paiement;
import com.crm.medicare.entity.Patient;
import com.crm.medicare.entity.StatutCr;
import com.crm.medicare.entity.Utilisateur;
import com.crm.medicare.repository.ExamenRepository;
import com.crm.medicare.repository.MedecinReferentRepository;
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
import java.util.List;
import lombok.RequiredArgsConstructor;
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
    private final WorkflowEngine workflowEngine;
    private final AuditService auditService;
    private final UtilisateurRepository utilisateurRepository;

    @Transactional(readOnly = true)
    public List<WorklistItemDto> listByDate(LocalDate date, String search, String status) {
        LocalDate jour = date != null ? date : LocalDate.now(ZONE);
        LocalDateTime debut = jour.atStartOfDay();
        LocalDateTime fin = jour.plusDays(1).atStartOfDay();

        String searchTerm = isBlank(search) ? null : search.trim();
        EtatPatient etatFilter = parseStatusFilter(status);

        return examenRepository.searchWorklist(debut, fin, searchTerm, etatFilter).stream()
                .map(this::toDto)
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
        return toDto(saved);
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

    @Transactional
    public WorklistItemDto create(WorklistCreateRequest request) {
        validateCreate(request);

        Patient patient = patientService.upsertFromWorklist(
                request.getNom(),
                request.getPrenom(),
                request.getCin(),
                request.getSexe(),
                request.getTelephone(),
                request.getNaissance());
        MedecinReferent prescripteur = resolvePrescripteur(request.getPrescripteurId());
        LocalDateTime dateExamen = parseDateHeure(request.getDateHeure());
        Modalite modalite = parseModalite(request.getModalite());

        Examen examen = new Examen();
        examen.setNumSejour(generateNumSejour(dateExamen.toLocalDate()));
        examen.setPatient(patient);
        examen.setPrescripteur(prescripteur);
        examen.setPrescripteurNom(blankToNull(request.getPrescripteurNom()));
        if (examen.getPrescripteurNom() == null && prescripteur != null) {
            examen.setPrescripteurNom(prescripteur.getNom());
        }
        examen.setDateExamen(dateExamen);
        examen.setSalle(blankToNull(request.getSalle()));
        examen.setDescription(blankToNull(request.getTypeExamen()));
        examen.setModalite(modalite);
        examen.setEtatPatient(EtatPatient.attendu);
        examen.setWorkflowStatus(EncounterStatus.SCHEDULED);
        examen.setPriorite("ROUTINE");
        examen.setExamTypeCode(blankToNull(request.getTypeExamen()));
        examen.setStatutCr(StatutCr.a_faire);
        examen.setPaiement(Paiement.impaye);
        examen.setMontant(BigDecimal.ZERO);
        examen.setCreatedBy(SecurityUtils.currentUserOrNull());

        HistoriqueExamen creation = new HistoriqueExamen();
        creation.setExamen(examen);
        creation.setDate(LocalDateTime.now(ZONE));
        creation.setAuteur("Accueil");
        creation.setAction("Examen créé — patient attendu");
        examen.getHistorique().add(creation);

        Examen saved = examenRepository.save(examen);
        auditService.record(
                AuditService.EXAM_CREATE,
                "Examen",
                String.valueOf(saved.getId()),
                java.util.Map.of("numSejour", saved.getNumSejour()));
        return toDto(saved);
    }

    @Transactional
    public WorklistItemDto patch(Long id, String etatPatient, String statutCr, String paiement) {
        if (etatPatient != null && !etatPatient.isBlank()) {
            return updateStatus(id, etatPatient);
        }
        Examen examen =
                examenRepository
                        .findById(id)
                        .orElseThrow(
                                () -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Examen introuvable"));
        if (statutCr != null && !statutCr.isBlank()) {
            try {
                examen.setStatutCr(StatutCr.valueOf(statutCr.trim()));
            } catch (IllegalArgumentException ex) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "statutCr invalide");
            }
        }
        if (paiement != null && !paiement.isBlank()) {
            try {
                examen.setPaiement(Paiement.valueOf(paiement.trim()));
            } catch (IllegalArgumentException ex) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "paiement invalide");
            }
        }
        auditService.record(AuditService.EXAM_UPDATE, "Examen", String.valueOf(id), java.util.Map.of());
        return toDto(examenRepository.save(examen));
    }

    @Transactional
    public WorklistItemDto saveCompteRendu(Long id, String texte) {
        Examen examen =
                examenRepository
                        .findById(id)
                        .orElseThrow(
                                () -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Examen introuvable"));
        examen.setCompteRendu(texte);
        if (examen.getStatutCr() == StatutCr.a_faire) {
            examen.setStatutCr(StatutCr.en_redaction);
        }
        auditService.record(
                AuditService.EXAM_UPDATE,
                "Examen",
                String.valueOf(id),
                java.util.Map.of("field", "compteRendu"));
        return toDto(examenRepository.save(examen));
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
                AuditService.EXAM_UPDATE,
                "Examen",
                String.valueOf(id),
                java.util.Map.of("assigned", String.valueOf(radiologueId)));
        return toDto(examenRepository.save(examen));
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

    private WorklistItemDto toDto(Examen examen) {
        Patient patient = examen.getPatient();
        String prescripteurLabel = examen.getPrescripteurNom();
        if ((prescripteurLabel == null || prescripteurLabel.isBlank())
                && examen.getPrescripteur() != null) {
            prescripteurLabel = examen.getPrescripteur().getNom();
        }

        List<HistoriqueItemDto> historique = List.of();
        if (examen.getHistorique() != null) {
            historique =
                    examen.getHistorique().stream()
                            .map(h -> new HistoriqueItemDto(h.getDate(), h.getAuteur(), h.getAction()))
                            .toList();
        }

        return WorklistItemDto.builder()
                .id(String.valueOf(examen.getId()))
                .numSejour(examen.getNumSejour())
                .patient(patient != null ? patient.getNomComplet() : null)
                .cin(patient != null ? patient.getCin() : null)
                .telephone(patient != null ? patient.getTelephone() : null)
                .age(calculateAge(patient != null ? patient.getDateNaissance() : null))
                .sexe(patient != null ? patient.getSexe() : null)
                .medecin(examen.getMedecin())
                .prescripteur(prescripteurLabel)
                .dateExamen(examen.getDateExamen())
                .salle(examen.getSalle())
                .description(examen.getDescription())
                .modalite(examen.getModalite() != null ? examen.getModalite().name() : null)
                .etatPatient(examen.getEtatPatient() != null ? examen.getEtatPatient().name() : null)
                .statutCr(examen.getStatutCr() != null ? examen.getStatutCr().name() : null)
                .paiement(examen.getPaiement() != null ? examen.getPaiement().name() : null)
                .montant(examen.getMontant())
                .compteRendu(examen.getCompteRendu())
                .historique(historique)
                .build();
    }

    private void validateCreate(WorklistCreateRequest request) {
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Corps de requête manquant");
        }
        if (isBlank(request.getNom()) && isBlank(request.getPrenom())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "nom/prenom obligatoires");
        }
        if (isBlank(request.getCin())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "cin obligatoire");
        }
        if (isBlank(request.getTypeExamen())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "typeExamen obligatoire");
        }
        if (isBlank(request.getModalite())) {
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
