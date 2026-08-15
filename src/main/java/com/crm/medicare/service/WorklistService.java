package com.crm.medicare.service;

import com.crm.medicare.dto.HistoriqueItemDto;
import com.crm.medicare.dto.WorklistCreateRequest;
import com.crm.medicare.dto.WorklistItemDto;
import com.crm.medicare.entity.EtatPatient;
import com.crm.medicare.entity.Examen;
import com.crm.medicare.entity.HistoriqueExamen;
import com.crm.medicare.entity.MedecinReferent;
import com.crm.medicare.entity.Modalite;
import com.crm.medicare.entity.Paiement;
import com.crm.medicare.entity.Patient;
import com.crm.medicare.entity.StatutCr;
import com.crm.medicare.repository.ExamenRepository;
import com.crm.medicare.repository.MedecinReferentRepository;
import com.crm.medicare.repository.PatientRepository;
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
    private final PatientRepository patientRepository;
    private final MedecinReferentRepository medecinReferentRepository;

    @Transactional(readOnly = true)
    public List<WorklistItemDto> listByDate(LocalDate date) {
        LocalDate jour = date != null ? date : LocalDate.now(ZONE);
        LocalDateTime debut = jour.atStartOfDay();
        LocalDateTime fin = jour.plusDays(1).atStartOfDay();

        return examenRepository.findByDateExamenBetween(debut, fin).stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional
    public WorklistItemDto create(WorklistCreateRequest request) {
        validateCreate(request);

        Patient patient = resolvePatient(request);
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
        examen.setStatutCr(StatutCr.a_faire);
        examen.setPaiement(Paiement.impaye);
        examen.setMontant(BigDecimal.ZERO);

        HistoriqueExamen creation = new HistoriqueExamen();
        creation.setExamen(examen);
        creation.setDate(LocalDateTime.now(ZONE));
        creation.setAuteur("Accueil");
        creation.setAction("Examen créé — patient attendu");
        examen.getHistorique().add(creation);

        Examen saved = examenRepository.save(examen);
        return toDto(saved);
    }

    private Patient resolvePatient(WorklistCreateRequest request) {
        String cin = request.getCin().trim();
        return patientRepository
                .findByCin(cin)
                .map(existing -> {
                    existing.setNomComplet(buildNomComplet(request.getNom(), request.getPrenom()));
                    existing.setSexe(blankToNull(request.getSexe()));
                    existing.setTelephone(blankToNull(request.getTelephone()));
                    if (request.getNaissance() != null && !request.getNaissance().isBlank()) {
                        existing.setDateNaissance(LocalDate.parse(request.getNaissance().trim()));
                    }
                    return patientRepository.save(existing);
                })
                .orElseGet(() -> {
                    Patient created = new Patient();
                    created.setNomComplet(buildNomComplet(request.getNom(), request.getPrenom()));
                    created.setCin(cin);
                    created.setSexe(blankToNull(request.getSexe()));
                    created.setTelephone(blankToNull(request.getTelephone()));
                    if (request.getNaissance() != null && !request.getNaissance().isBlank()) {
                        created.setDateNaissance(LocalDate.parse(request.getNaissance().trim()));
                    }
                    return patientRepository.save(created);
                });
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

        List<HistoriqueItemDto> historique =
                examen.getHistorique() == null
                        ? List.of()
                        : examen.getHistorique().stream()
                                .map(
                                        h ->
                                                new HistoriqueItemDto(
                                                        h.getDate(), h.getAuteur(), h.getAction()))
                                .toList();

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
