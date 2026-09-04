package com.crm.medicare.service;

import com.crm.medicare.common.ApiException;
import com.crm.medicare.common.PageResponse;
import com.crm.medicare.dto.AppointmentDto;
import com.crm.medicare.dto.Patient360Dtos;
import com.crm.medicare.dto.PatientDuplicateMatch;
import com.crm.medicare.dto.PatientResponse;
import com.crm.medicare.dto.PatientWriteRequest;
import com.crm.medicare.dto.ReportDto;
import com.crm.medicare.entity.Appointment;
import com.crm.medicare.entity.Examen;
import com.crm.medicare.entity.Invoice;
import com.crm.medicare.entity.Paiement;
import com.crm.medicare.entity.Patient;
import com.crm.medicare.entity.Report;
import com.crm.medicare.repository.AppointmentRepository;
import com.crm.medicare.repository.ExamenRepository;
import com.crm.medicare.repository.InvoiceRepository;
import com.crm.medicare.repository.PatientRepository;
import com.crm.medicare.repository.ReportRepository;
import com.crm.medicare.security.SecurityUtils;
import jakarta.persistence.criteria.Predicate;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.Period;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class PatientService {

    private static final ZoneId ZONE = ZoneId.of("Africa/Casablanca");
    private static final DateTimeFormatter ISO_DATE = DateTimeFormatter.ISO_LOCAL_DATE;

    private final PatientRepository patientRepository;
    private final ExamenRepository examenRepository;
    private final AppointmentRepository appointmentRepository;
    private final ReportRepository reportRepository;
    private final InvoiceRepository invoiceRepository;
    private final AuditService auditService;

    @Transactional(readOnly = true)
    public List<PatientResponse> listAll() {
        return patientRepository.findByDeletedAtIsNullOrderByNomCompletAsc().stream()
                .map(p -> toResponse(p, List.of()))
                .toList();
    }

    @Transactional(readOnly = true)
    public PageResponse<PatientResponse> search(
            String cin,
            String telephone,
            String nom,
            String prenom,
            String numeroDossier,
            LocalDate dateNaissance,
            String numAffiliation,
            String mutuelle,
            String q,
            int page,
            int size,
            String sort) {
        int safeSize = size <= 0 ? 20 : Math.min(size, 100);
        int safePage = Math.max(page, 0);
        Sort sortSpec = parseSort(sort);
        Page<Patient> result =
                patientRepository.findAll(
                        buildSpec(
                                cin,
                                telephone,
                                nom,
                                prenom,
                                numeroDossier,
                                dateNaissance,
                                numAffiliation,
                                mutuelle,
                                q),
                        PageRequest.of(safePage, safeSize, sortSpec));
        return PageResponse.<PatientResponse>builder()
                .content(result.getContent().stream().map(p -> toResponse(p, List.of())).toList())
                .page(result.getNumber())
                .size(result.getSize())
                .totalElements(result.getTotalElements())
                .totalPages(result.getTotalPages())
                .build();
    }

    @Transactional(readOnly = true)
    public List<PatientDuplicateMatch> findDuplicates(
            String nom, String cin, String telephone, String naissance) {
        LocalDate dob = null;
        if (naissance != null && !naissance.isBlank()) {
            try {
                dob = LocalDate.parse(naissance.trim(), ISO_DATE);
            } catch (DateTimeParseException ex) {
                throw ApiException.badRequest("naissance invalide (attendu YYYY-MM-DD)");
            }
        }
        String phone = blankToNull(telephone);
        String nomVal = blankToNull(nom);
        String prenom = null;
        if (nomVal != null) {
            String[] parts = nomVal.split("\\s+", 2);
            nomVal = parts[0];
            prenom = parts.length > 1 ? parts[1] : null;
        }
        List<Patient> candidates =
                new ArrayList<>(
                        patientRepository.findPotentialDuplicates(
                                phone,
                                nomVal != null ? nomVal.toLowerCase(Locale.ROOT) : null,
                                prenom != null ? prenom.toLowerCase(Locale.ROOT) : null,
                                dob,
                                null));
        if (notBlank(cin)) {
            patientRepository
                    .findByCinIgnoreCaseAndDeletedAtIsNull(cin.trim())
                    .ifPresent(
                            p -> {
                                if (candidates.stream().noneMatch(c -> c.getId().equals(p.getId()))) {
                                    candidates.add(p);
                                }
                            });
        }
        LocalDate dobFinal = dob;
        String nomFinal = nomVal;
        String prenomFinal = prenom;
        return candidates.stream()
                .map(p -> toDuplicateMatch(p, blankToNull(cin), phone, nomFinal, prenomFinal, dobFinal))
                .sorted((a, b) -> Double.compare(b.getScore(), a.getScore()))
                .toList();
    }

    private static PatientDuplicateMatch toDuplicateMatch(
            Patient p, String cin, String phone, String nom, String prenom, LocalDate dob) {
        List<String> champs = new ArrayList<>();
        double score = 0;
        if (cin != null && cin.equalsIgnoreCase(p.getCin())) {
            champs.add("cin");
            score = Math.max(score, 1.0);
        }
        if (phone != null && phone.equals(p.getTelephone())) {
            champs.add("telephone");
            score = Math.max(score, 0.7);
        }
        if (nom != null && nom.equalsIgnoreCase(p.getNom())) {
            champs.add("nom");
            score = Math.max(score, 0.5);
        }
        if (prenom != null && prenom.equalsIgnoreCase(p.getPrenom())) {
            champs.add("prenom");
            score = Math.max(score, 0.5);
        }
        if (dob != null && dob.equals(p.getDateNaissance())) {
            champs.add("naissance");
            score = Math.max(score, 0.6);
        }
        if (champs.contains("nom") && champs.contains("prenom") && champs.contains("naissance")) {
            score = Math.max(score, 0.85);
        }
        return PatientDuplicateMatch.builder()
                .patientId(p.getId())
                .score(score)
                .champsIdentiques(champs)
                .nomComplet(p.getNomComplet())
                .numeroDossier(p.getNumeroDossier())
                .build();
    }

    @Transactional(readOnly = true)
    public PatientResponse getById(Long id) {
        Patient patient = requirePatient(id);
        auditService.record(AuditService.PATIENT_VIEW, "Patient", String.valueOf(id), Map.of());
        return toResponse(patient, List.of());
    }

    @Transactional
    public PatientResponse create(PatientWriteRequest request) {
        String cin = normalizeCin(request.getCin());
        if (patientRepository.findByCinIgnoreCaseAndDeletedAtIsNull(cin).isPresent()) {
            throw ApiException.conflict("patient_duplicate_cin", "Un patient existe déjà avec ce CIN");
        }

        List<PatientResponse.DuplicateWarning> warnings = detectDuplicates(request, null);

        Patient patient = new Patient();
        applyWrite(patient, request, cin);
        patient.setCreatedBy(SecurityUtils.currentUserOrNull());
        Patient saved = persistNewPatient(patient);

        auditService.record(
                AuditService.PATIENT_CREATE,
                "Patient",
                String.valueOf(saved.getId()),
                Map.of("cin", cin, "numeroDossier", saved.getNumeroDossier()));
        return toResponse(saved, warnings);
    }

    @Transactional
    public PatientResponse update(Long id, PatientWriteRequest request) {
        Patient patient = requirePatient(id);
        String cin = normalizeCin(request.getCin());
        if (patientRepository.existsByCinIgnoreCaseAndDeletedAtIsNullAndIdNot(cin, id)) {
            throw ApiException.conflict("patient_duplicate_cin", "Un autre patient utilise déjà ce CIN");
        }
        Map<String, Object> before = Map.of("cin", String.valueOf(patient.getCin()));
        applyWrite(patient, request, cin);
        Patient saved = patientRepository.save(patient);
        auditService.record(
                AuditService.PATIENT_UPDATE,
                "Patient",
                String.valueOf(id),
                Map.of("cin", cin),
                before,
                Map.of("cin", cin));
        return toResponse(saved, detectDuplicates(request, id));
    }

    @Transactional(readOnly = true)
    public List<Patient360Dtos.HistoryItem> history(Long patientId) {
        requirePatient(patientId);
        return examenRepository.findByPatientIdOrderByDateExamenDesc(patientId).stream()
                .map(
                        e ->
                                Patient360Dtos.HistoryItem.builder()
                                        .date(formatDate(e.getDateExamen()))
                                        .type("examen")
                                        .intitule(
                                                e.getDescription() != null
                                                        ? e.getDescription()
                                                        : e.getModalite() != null ? e.getModalite().name() : "Examen")
                                        .praticien(
                                                e.getMedecin() != null
                                                        ? e.getMedecin()
                                                        : e.getPrescripteurNom())
                                        .note(e.getEtatPatient() != null ? e.getEtatPatient().name() : "")
                                        .tone(toneForExam(e))
                                        .build())
                .toList();
    }

    @Transactional(readOnly = true)
    public List<Patient360Dtos.ImagingItem> imaging(Long patientId) {
        requirePatient(patientId);
        return examenRepository.findByPatientIdOrderByDateExamenDesc(patientId).stream()
                .map(
                        e ->
                                Patient360Dtos.ImagingItem.builder()
                                        .id(String.valueOf(e.getId()))
                                        .examen(
                                                e.getDescription() != null
                                                        ? e.getDescription()
                                                        : e.getModalite() != null ? e.getModalite().name() : "")
                                        .modalite(e.getModalite() != null ? e.getModalite().name() : "")
                                        .date(formatDate(e.getDateExamen()))
                                        .radiologue(e.getMedecin())
                                        .statut(e.getStatutCr() != null ? e.getStatutCr().name() : "")
                                        .tone(toneForExam(e))
                                        .conclusion(e.getCompteRendu())
                                        .build())
                .toList();
    }

    @Transactional(readOnly = true)
    public List<Patient360Dtos.PrescriptionItem> prescriptions(Long patientId) {
        requirePatient(patientId);
        return examenRepository.findByPatientIdOrderByDateExamenDesc(patientId).stream()
                .filter(e -> e.getPrescripteurNom() != null || e.getPrescripteur() != null)
                .map(
                        e ->
                                Patient360Dtos.PrescriptionItem.builder()
                                        .id(String.valueOf(e.getId()))
                                        .date(formatDate(e.getDateExamen()))
                                        .prescripteur(
                                                e.getPrescripteurNom() != null
                                                        ? e.getPrescripteurNom()
                                                        : e.getPrescripteur().getNom())
                                        .lignes(
                                                List.of(
                                                        e.getDescription() != null
                                                                ? e.getDescription()
                                                                : e.getModalite().name()))
                                        .build())
                .toList();
    }

    @Transactional(readOnly = true)
    public List<Patient360Dtos.BillingItem> billing(Long patientId) {
        requirePatient(patientId);
        return examenRepository.findByPatientIdOrderByDateExamenDesc(patientId).stream()
                .map(
                        e -> {
                            BigDecimal total = e.getMontant() != null ? e.getMontant() : BigDecimal.ZERO;
                            BigDecimal acompte = e.getAcompte() != null ? e.getAcompte() : BigDecimal.ZERO;
                            return Patient360Dtos.BillingItem.builder()
                                    .id(e.getNumSejour())
                                    .acte(
                                            e.getDescription() != null
                                                    ? e.getDescription()
                                                    : e.getModalite() != null ? e.getModalite().name() : "")
                                    .date(formatDate(e.getDateExamen()))
                                    .total(total)
                                    .mutuelle(BigDecimal.ZERO)
                                    .acompte(acompte)
                                    .reste(total.subtract(acompte).max(BigDecimal.ZERO))
                                    .statut(e.getPaiement() != null ? e.getPaiement().name() : Paiement.impaye.name())
                                    .tone(
                                            e.getPaiement() == Paiement.paye
                                                    ? "success"
                                                    : e.getPaiement() == Paiement.cote ? "warning" : "destructive")
                                    .build();
                        })
                .toList();
    }

    @Transactional(readOnly = true)
    public Patient360Dtos.FinancialStatus financialStatus(Long patientId) {
        requirePatient(patientId);
        List<Invoice> invoices = invoiceRepository.findByPatientId(patientId);
        BigDecimal total =
                invoices.stream()
                        .map(i -> i.getTotal() != null ? i.getTotal() : BigDecimal.ZERO)
                        .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal paid =
                invoices.stream()
                        .map(i -> i.getAmountPaid() != null ? i.getAmountPaid() : BigDecimal.ZERO)
                        .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal refunded =
                invoices.stream()
                        .map(i -> i.getAmountRefunded() != null ? i.getAmountRefunded() : BigDecimal.ZERO)
                        .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal netPaid = paid.subtract(refunded).max(BigDecimal.ZERO);
        BigDecimal reste = total.subtract(netPaid).max(BigDecimal.ZERO);
        String lastRef =
                invoices.stream()
                        .sorted(
                                Comparator.comparing(
                                        Invoice::getCreatedAt,
                                        Comparator.nullsLast(Comparator.reverseOrder())))
                        .map(Invoice::getReference)
                        .findFirst()
                        .orElse("");
        return Patient360Dtos.FinancialStatus.builder()
                .examen(lastRef)
                .total(total)
                .acompte(netPaid)
                .statutImpression(reste.signum() == 0 && total.signum() > 0 ? "soldé" : "ouvert")
                .reste(reste)
                .build();
    }

    /** Agrégat réel examens / RDV / CR / factures — listes vides si aucune donnée. */
    @Transactional(readOnly = true)
    public List<Patient360Dtos.TimelineEvent> timeline(Long patientId) {
        requirePatient(patientId);
        List<Patient360Dtos.TimelineEvent> events = new ArrayList<>();

        for (Examen e : examenRepository.findByPatientIdOrderByDateExamenDesc(patientId)) {
            events.add(
                    Patient360Dtos.TimelineEvent.builder()
                            .id("exam-" + e.getId())
                            .source("examen")
                            .type(e.getWorkflowStatus() != null ? e.getWorkflowStatus().name() : "EXAMEN")
                            .title(
                                    e.getDescription() != null
                                            ? e.getDescription()
                                            : e.getModalite() != null ? e.getModalite().name() : "Examen")
                            .detail(e.getNumSejour())
                            .at(formatDate(e.getDateExamen()))
                            .actor(e.getMedecin())
                            .action("Examen créé / planifié")
                            .build());
            if (e.getStatusHistory() != null) {
                for (var h : e.getStatusHistory()) {
                    events.add(
                            Patient360Dtos.TimelineEvent.builder()
                                    .id("exam-hist-" + e.getId() + "-" + h.getId())
                                    .source("examen")
                                    .type(h.getToStatus())
                                    .title("Statut examen → " + h.getToStatus())
                                    .detail(e.getNumSejour())
                                    .at(formatDate(h.getCreatedAt()))
                                    .actor(h.getActorName())
                                    .action(
                                            (h.getFromStatus() != null ? h.getFromStatus() : "?")
                                                    + " → "
                                                    + h.getToStatus())
                                    .build());
                }
            }
        }

        Page<Appointment> appts =
                appointmentRepository.findByPatientIdOrderByStartsAtDesc(
                        patientId, PageRequest.of(0, 200));
        for (Appointment a : appts.getContent()) {
            events.add(
                    Patient360Dtos.TimelineEvent.builder()
                            .id("appt-" + a.getId())
                            .source("appointment")
                            .type(a.getStatut() != null ? a.getStatut().name() : "RDV")
                            .title(
                                    a.getCatalogue() != null
                                            ? a.getCatalogue().getNom()
                                            : a.getModalite() != null ? a.getModalite().name() : "Rendez-vous")
                            .detail(a.getMotif())
                            .at(formatDate(a.getStartsAt()))
                            .actor(a.getPrescripteur() != null ? a.getPrescripteur().getNom() : null)
                            .action("Rendez-vous " + (a.getStatut() != null ? a.getStatut().name() : ""))
                            .build());
        }

        for (Report r : reportRepository.findAllFiltered(patientId, null)) {
            events.add(
                    Patient360Dtos.TimelineEvent.builder()
                            .id("report-" + r.getId())
                            .source("report")
                            .type(r.getStatus() != null ? r.getStatus().name() : "REPORT")
                            .title("Compte-rendu")
                            .detail(r.getAuthorName())
                            .at(formatDate(r.getCreatedAt()))
                            .actor(r.getAuthorName())
                            .action(
                                    r.getStatus() != null && "VALIDATED".equals(r.getStatus().name())
                                            ? "Compte-rendu validé"
                                            : "Compte-rendu enregistré")
                            .build());
        }

        for (Invoice inv : invoiceRepository.findByPatientId(patientId)) {
            events.add(
                    Patient360Dtos.TimelineEvent.builder()
                            .id("invoice-" + inv.getId())
                            .source("invoice")
                            .type(inv.getStatut() != null ? inv.getStatut().name() : "INVOICE")
                            .title(inv.getReference())
                            .detail(
                                    inv.getTotal() != null
                                            ? inv.getTotal().toPlainString() + " MAD"
                                            : null)
                            .at(formatDate(inv.getCreatedAt()))
                            .actor(inv.getCreatedByName())
                            .action("Facture " + (inv.getStatut() != null ? inv.getStatut().name() : ""))
                            .build());
            if (inv.getPayments() != null) {
                for (var pay : inv.getPayments()) {
                    events.add(
                            Patient360Dtos.TimelineEvent.builder()
                                    .id("pay-" + pay.getId())
                                    .source("payment")
                                    .type("PAYMENT")
                                    .title("Paiement " + (pay.getMontant() != null ? pay.getMontant() + " MAD" : ""))
                                    .detail(pay.getMode())
                                    .at(formatDate(pay.getCreatedAt()))
                                    .actor(pay.getCreatedByName())
                                    .action("Paiement enregistré")
                                    .build());
                }
            }
        }

        events.sort(
                Comparator.comparing(
                                Patient360Dtos.TimelineEvent::getAt,
                                Comparator.nullsLast(Comparator.naturalOrder()))
                        .reversed());
        return events;
    }

    @Transactional(readOnly = true)
    public List<AppointmentDto> appointments(Long patientId) {
        requirePatient(patientId);
        return appointmentRepository
                .findByPatientIdOrderByStartsAtDesc(patientId, PageRequest.of(0, 200))
                .getContent()
                .stream()
                .map(this::toAppointmentDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ReportDto> reports(Long patientId) {
        requirePatient(patientId);
        return reportRepository.findAllFiltered(patientId, null).stream()
                .map(this::toReportDto)
                .toList();
    }

    private AppointmentDto toAppointmentDto(Appointment a) {
        return AppointmentDto.builder()
                .id(String.valueOf(a.getId()))
                .patientId(
                        a.getPatient() != null ? String.valueOf(a.getPatient().getId()) : null)
                .patient(a.getPatient() != null ? a.getPatient().getNomComplet() : null)
                .catalogueId(
                        a.getCatalogue() != null ? String.valueOf(a.getCatalogue().getId()) : null)
                .examenLibelle(a.getCatalogue() != null ? a.getCatalogue().getNom() : null)
                .resourceId(
                        a.getResource() != null ? String.valueOf(a.getResource().getId()) : null)
                .resourceCode(a.getResource() != null ? a.getResource().getCode() : null)
                .resourceLibelle(a.getResource() != null ? a.getResource().getLibelle() : null)
                .salle(a.getResource() != null ? a.getResource().getLibelle() : null)
                .modalite(a.getModalite() != null ? a.getModalite().name() : null)
                .prescripteurId(
                        a.getPrescripteur() != null
                                ? String.valueOf(a.getPrescripteur().getId())
                                : null)
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

    private ReportDto toReportDto(Report r) {
        Examen e = r.getExamen();
        return ReportDto.builder()
                .id(String.valueOf(r.getId()))
                .examenId(e != null ? String.valueOf(e.getId()) : null)
                .patientId(
                        e != null && e.getPatient() != null
                                ? String.valueOf(e.getPatient().getId())
                                : null)
                .patientName(
                        e != null && e.getPatient() != null ? e.getPatient().getNomComplet() : null)
                .examLabel(
                        e != null
                                ? (e.getDescription() != null
                                        ? e.getDescription()
                                        : e.getModalite() != null ? e.getModalite().name() : null)
                                : null)
                .status(r.getStatus() != null ? r.getStatus().name().toLowerCase(Locale.ROOT) : null)
                .radiologist(r.getAuthorName())
                .authorName(r.getAuthorName())
                .currentVersion(r.getCurrentVersion())
                .indication(e != null ? e.getIndication() : null)
                .technique(e != null ? e.getTechnique() : null)
                .resultats(e != null ? e.getResultats() : null)
                .conclusion(e != null ? e.getConclusion() : null)
                .body(e != null ? e.getCompteRendu() : null)
                .texte(e != null ? e.getCompteRendu() : null)
                .createdAt(r.getCreatedAt())
                .validatedAt(r.getValidatedAt())
                .build();
    }

    public Patient upsertFromWorklist(String nom, String prenom, String cinRaw, String sexe, String telephone, String naissance) {
        String cin = normalizeCin(cinRaw);
        Patient patient =
                patientRepository
                        .findByCinIgnoreCaseAndDeletedAtIsNull(cin)
                        .orElseGet(Patient::new);
        boolean created = patient.getId() == null;
        String nomComplet = ((nom == null ? "" : nom.trim()) + " " + (prenom == null ? "" : prenom.trim())).trim();
        patient.setNomComplet(nomComplet);
        patient.setNom(blankToNull(nom));
        patient.setPrenom(blankToNull(prenom));
        patient.setCin(cin);
        patient.setSexe(blankToNull(sexe));
        patient.setTelephone(blankToNull(telephone));
        if (naissance != null && !naissance.isBlank()) {
            try {
                patient.setDateNaissance(LocalDate.parse(naissance.trim()));
            } catch (DateTimeParseException ex) {
                throw ApiException.badRequest("naissance invalide (attendu YYYY-MM-DD)");
            }
        }
        if (created) {
            patient.setCreatedBy(SecurityUtils.currentUserOrNull());
            return persistNewPatient(patient);
        }
        return patientRepository.save(patient);
    }

    private Patient requirePatient(Long id) {
        return patientRepository
                .findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> ApiException.notFound("Patient introuvable"));
    }

    private void applyWrite(Patient patient, PatientWriteRequest request, String cin) {
        String nomComplet = blankToNull(request.getNomComplet());
        String nom = blankToNull(request.getNom());
        String prenom = blankToNull(request.getPrenom());
        if (nomComplet == null && (nom != null || prenom != null)) {
            nomComplet = ((nom == null ? "" : nom) + " " + (prenom == null ? "" : prenom)).trim();
        }
        if (nom == null && prenom == null && nomComplet != null) {
            String[] parts = nomComplet.split("\\s+", 2);
            nom = parts[0];
            prenom = parts.length > 1 ? parts[1] : null;
        }
        patient.setNomComplet(nomComplet);
        patient.setNom(nom);
        patient.setPrenom(prenom);
        patient.setCin(cin);
        patient.setTelephone(blankToNull(request.getTelephone()));
        patient.setEmail(blankToNull(request.getEmail()));
        patient.setMutuelle(blankToNull(request.getMutuelle()));
        patient.setSexe(blankToNull(request.getSexe()));
        patient.setNumAffiliation(blankToNull(request.getNumAffiliation()));
        patient.setMedecinTraitant(blankToNull(request.getMedecinTraitant()));
        patient.setVille(blankToNull(request.getVille()));
        patient.setQuartier(blankToNull(request.getQuartier()));
        patient.setAdresse(blankToNull(request.getAdresse()));
        patient.setTitre(blankToNull(request.getTitre()));
        patient.setTelephoneDomicile(blankToNull(request.getTelephoneDomicile()));
        patient.setTelephoneTravail(blankToNull(request.getTelephoneTravail()));
        patient.setFax(blankToNull(request.getFax()));
        patient.setPays(blankToNull(request.getPays()) != null ? blankToNull(request.getPays()) : "Maroc");
        patient.setConventionType(blankToNull(request.getConventionType()));
        if (request.getVip() != null) {
            patient.setVip(request.getVip());
        }
        if (request.getPacemaker() != null) {
            patient.setPacemaker(request.getPacemaker());
        }
        if (request.getPregnant() != null) {
            patient.setPregnant(request.getPregnant());
        }
        if (request.getContrastAllergy() != null) {
            patient.setContrastAllergy(request.getContrastAllergy());
        }
        if (request.getMedicalAlerts() != null) {
            patient.setMedicalAlerts(blankToNull(request.getMedicalAlerts()));
        }
        LocalDate dob = resolveBirthDate(request);
        if (dob != null) {
            patient.setDateNaissance(dob);
        }
    }

    private List<PatientResponse.DuplicateWarning> detectDuplicates(PatientWriteRequest request, Long excludeId) {
        String nom = blankToNull(request.getNom());
        String prenom = blankToNull(request.getPrenom());
        if (nom == null && request.getNomComplet() != null) {
            String[] parts = request.getNomComplet().trim().split("\\s+", 2);
            nom = parts[0];
            prenom = parts.length > 1 ? parts[1] : prenom;
        }
        final String nomKey = nom;
        final String prenomKey = prenom;
        LocalDate dob = resolveBirthDate(request);
        String phone = blankToNull(request.getTelephone());
        if (phone == null && nomKey == null) {
            return List.of();
        }
        return patientRepository
                .findPotentialDuplicates(
                        phone,
                        nomKey != null ? nomKey.toLowerCase(Locale.ROOT) : null,
                        prenomKey != null ? prenomKey.toLowerCase(Locale.ROOT) : null,
                        dob,
                        excludeId)
                .stream()
                .map(
                        p ->
                                new PatientResponse.DuplicateWarning(
                                        p.getId(),
                                        p.getNumeroDossier(),
                                        duplicateReason(p, phone, nomKey, prenomKey, dob),
                                        p.getNomComplet()))
                .toList();
    }

    private static String duplicateReason(Patient p, String phone, String nom, String prenom, LocalDate dob) {
        if (phone != null && phone.equals(p.getTelephone())) {
            return "TELEPHONE";
        }
        if (nom != null
                && prenom != null
                && dob != null
                && nom.equalsIgnoreCase(p.getNom())
                && prenom.equalsIgnoreCase(p.getPrenom())
                && dob.equals(p.getDateNaissance())) {
            return "NOM_PRENOM_NAISSANCE";
        }
        return "SIMILAIRE";
    }

    private Specification<Patient> buildSpec(
            String cin,
            String telephone,
            String nom,
            String prenom,
            String numeroDossier,
            LocalDate dateNaissance,
            String numAffiliation,
            String mutuelle,
            String q) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.isNull(root.get("deletedAt")));
            if (notBlank(cin)) {
                predicates.add(cb.equal(cb.lower(root.get("cin")), cin.trim().toLowerCase(Locale.ROOT)));
            }
            if (notBlank(telephone)) {
                predicates.add(cb.equal(root.get("telephone"), telephone.trim()));
            }
            if (notBlank(nom)) {
                predicates.add(cb.like(cb.lower(root.get("nom")), "%" + nom.trim().toLowerCase(Locale.ROOT) + "%"));
            }
            if (notBlank(prenom)) {
                predicates.add(
                        cb.like(cb.lower(root.get("prenom")), "%" + prenom.trim().toLowerCase(Locale.ROOT) + "%"));
            }
            if (notBlank(numeroDossier)) {
                predicates.add(cb.equal(cb.lower(root.get("numeroDossier")), numeroDossier.trim().toLowerCase()));
            }
            if (dateNaissance != null) {
                predicates.add(cb.equal(root.get("dateNaissance"), dateNaissance));
            }
            if (notBlank(numAffiliation)) {
                predicates.add(cb.equal(root.get("numAffiliation"), numAffiliation.trim()));
            }
            if (notBlank(mutuelle)) {
                predicates.add(cb.equal(cb.lower(root.get("mutuelle")), mutuelle.trim().toLowerCase(Locale.ROOT)));
            }
            if (notBlank(q)) {
                String like = "%" + q.trim().toLowerCase(Locale.ROOT) + "%";
                predicates.add(
                        cb.or(
                                cb.like(cb.lower(root.get("nomComplet")), like),
                                cb.like(cb.lower(root.get("cin")), like),
                                cb.and(
                                        cb.isNotNull(root.get("telephone")),
                                        cb.like(cb.lower(root.get("telephone")), like)),
                                cb.and(
                                        cb.isNotNull(root.get("numeroDossier")),
                                        cb.like(cb.lower(root.get("numeroDossier")), like))));
            }
            return cb.and(predicates.toArray(Predicate[]::new));
        };
    }

    private PatientResponse toResponse(Patient patient, List<PatientResponse.DuplicateWarning> warnings) {
        return PatientResponse.builder()
                .id(patient.getId())
                .nomComplet(patient.getNomComplet())
                .nom(patient.getNom())
                .prenom(patient.getPrenom())
                .cin(patient.getCin())
                .numeroDossier(patient.getNumeroDossier())
                .age(calculateAge(patient.getDateNaissance()))
                .telephone(patient.getTelephone())
                .mutuelle(patient.getMutuelle())
                .email(patient.getEmail())
                .sexe(patient.getSexe())
                .numAffiliation(patient.getNumAffiliation())
                .medecinTraitant(patient.getMedecinTraitant())
                .ville(patient.getVille())
                .quartier(patient.getQuartier())
                .adresse(patient.getAdresse())
                .titre(patient.getTitre())
                .telephoneDomicile(patient.getTelephoneDomicile())
                .telephoneTravail(patient.getTelephoneTravail())
                .fax(patient.getFax())
                .pays(patient.getPays())
                .conventionType(patient.getConventionType())
                .vip(patient.isVip())
                .pacemaker(patient.isPacemaker())
                .pregnant(patient.isPregnant())
                .contrastAllergy(patient.isContrastAllergy())
                .medicalAlerts(patient.getMedicalAlerts())
                .dateNaissance(patient.getDateNaissance())
                .prochainRdv(patient.getProchainRdv())
                .duplicateWarnings(warnings)
                .build();
    }

    private static Sort parseSort(String sort) {
        if (sort == null || sort.isBlank()) {
            return Sort.by(Sort.Direction.ASC, "nomComplet");
        }
        String[] parts = sort.split(",");
        String field = parts[0].trim();
        Sort.Direction direction =
                parts.length > 1 && "desc".equalsIgnoreCase(parts[1].trim())
                        ? Sort.Direction.DESC
                        : Sort.Direction.ASC;
        String mapped =
                switch (field) {
                    case "nom", "prenom", "cin", "dateNaissance", "numeroDossier", "createdAt" -> field;
                    default -> "nomComplet";
                };
        return Sort.by(direction, mapped);
    }

    private static LocalDate resolveBirthDate(PatientWriteRequest request) {
        if (request.getDateNaissance() != null) {
            return request.getDateNaissance();
        }
        if (request.getNaissance() != null && !request.getNaissance().isBlank()) {
            try {
                return LocalDate.parse(request.getNaissance().trim(), ISO_DATE);
            } catch (DateTimeParseException ex) {
                throw ApiException.badRequest("naissance invalide (attendu YYYY-MM-DD)");
            }
        }
        return null;
    }

    private static Integer calculateAge(LocalDate dateNaissance) {
        if (dateNaissance == null) {
            return 0;
        }
        return Math.max(0, Period.between(dateNaissance, LocalDate.now(ZONE)).getYears());
    }

    /**
     * {@code numero_dossier} est NOT NULL en PostgreSQL. L'id n'existe qu'après INSERT,
     * donc on pose une valeur unique temporaire puis on la remplace par {@code PAT-000123}.
     */
    private Patient persistNewPatient(Patient patient) {
        if (patient.getNumeroDossier() == null || patient.getNumeroDossier().isBlank()) {
            patient.setNumeroDossier(temporaryDossier());
        }
        Patient saved = patientRepository.save(patient);
        String canonical = formatDossier(saved.getId());
        if (!canonical.equals(saved.getNumeroDossier())) {
            saved.setNumeroDossier(canonical);
            saved = patientRepository.save(saved);
        }
        return saved;
    }

    private static String temporaryDossier() {
        return "PAT-TMP-" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
    }

    private static String formatDossier(Long id) {
        return "PAT-" + String.format("%06d", id);
    }

    private static String formatDate(LocalDateTime value) {
        return value == null ? "" : value.toString();
    }

    private static String toneForExam(Examen examen) {
        if (examen.getPaiement() == Paiement.paye) {
            return "success";
        }
        if (examen.getCompteRendu() != null && !examen.getCompteRendu().isBlank()) {
            return "primary";
        }
        return "neutral";
    }

    private static String normalizeCin(String cin) {
        if (cin == null || cin.isBlank()) {
            throw ApiException.badRequest("cin obligatoire");
        }
        return cin.trim().toUpperCase(Locale.ROOT);
    }

    private static boolean notBlank(String value) {
        return value != null && !value.isBlank();
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
