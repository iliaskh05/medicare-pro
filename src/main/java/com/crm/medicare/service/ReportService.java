package com.crm.medicare.service;

import com.crm.medicare.common.CentreZone;
import com.crm.medicare.common.ApiException;
import com.crm.medicare.dto.ReportAmendRequest;
import com.crm.medicare.dto.ReportDto;
import com.crm.medicare.dto.ReportVersionDto;
import com.crm.medicare.dto.ReportWriteRequest;
import com.crm.medicare.entity.Examen;
import com.crm.medicare.entity.Report;
import com.crm.medicare.entity.ReportAmendment;
import com.crm.medicare.entity.ReportValidation;
import com.crm.medicare.entity.ReportVersion;
import com.crm.medicare.entity.StatutCr;
import com.crm.medicare.entity.Utilisateur;
import com.crm.medicare.repository.ExamenRepository;
import com.crm.medicare.repository.ReportAmendmentRepository;
import com.crm.medicare.repository.ReportRepository;
import com.crm.medicare.repository.ReportValidationRepository;
import com.crm.medicare.repository.ReportVersionRepository;
import com.crm.medicare.security.SecurityUtils;
import com.crm.medicare.workflow.EncounterStatus;
import com.crm.medicare.workflow.ReportStatus;
import com.crm.medicare.workflow.WorkflowEngine;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ReportService {

    private final ReportRepository reportRepository;
    private final ReportVersionRepository reportVersionRepository;
    private final ReportValidationRepository reportValidationRepository;
    private final ReportAmendmentRepository reportAmendmentRepository;
    private final ExamenRepository examenRepository;
    private final WorkflowEngine workflowEngine;
    private final AuditService auditService;
    private final FactureService factureService;

    @Transactional(readOnly = true)
    public List<ReportDto> list(Long patientId, String status) {
        ReportStatus parsed = parseStatusOrNull(status);
        return reportRepository.findAllFiltered(patientId, parsed).stream()
                .map(
                        r -> {
                            ReportVersion latest =
                                    reportVersionRepository
                                            .findByReportIdAndVersionNumber(
                                                    r.getId(), r.getCurrentVersion())
                                            .orElse(null);
                            return toDto(r, latest);
                        })
                .toList();
    }

    @Transactional(readOnly = true)
    public ReportDto getById(Long id) {
        Report report = loadWithDetails(id);
        ReportVersion latest =
                reportVersionRepository
                        .findByReportIdAndVersionNumber(report.getId(), report.getCurrentVersion())
                        .orElse(null);
        return toDto(report, latest);
    }

    @Transactional
    public ReportDto create(ReportWriteRequest request) {
        if (request == null || request.getExamenId() == null) {
            throw ApiException.badRequest("examenId requis");
        }
        if (reportRepository.existsByExamenId(request.getExamenId())) {
            throw ApiException.conflict("report_exists", "Un compte rendu existe déjà pour cet examen");
        }
        Examen examen =
                examenRepository
                        .findById(request.getExamenId())
                        .orElseThrow(() -> ApiException.notFound("Examen introuvable"));

        Utilisateur actor = SecurityUtils.currentUserOrNull();
        String authorName = actorName(actor);

        Report report = new Report();
        report.setExamen(examen);
        report.setStatus(ReportStatus.DRAFT);
        report.setCurrentVersion(1);
        report.setAuthor(actor);
        report.setAuthorName(authorName);
        report = reportRepository.save(report);

        ReportVersion version = new ReportVersion();
        version.setReport(report);
        version.setVersionNumber(1);
        applyContent(version, request);
        version.setAuthor(actor);
        version.setAuthorName(authorName);
        reportVersionRepository.save(version);

        syncExamenDraftFields(examen, version);
        if (examen.getStatutCr() == StatutCr.a_faire) {
            examen.setStatutCr(StatutCr.en_redaction);
        }
        examenRepository.save(examen);

        auditService.record(
                AuditService.EXAM_UPDATE,
                "Report",
                String.valueOf(report.getId()),
                java.util.Map.of("action", "create"));
        return toDto(report, version);
    }

    @Transactional
    public ReportDto update(Long id, ReportWriteRequest request) {
        Report report = loadWithDetails(id);
        ReportStatus status = report.getStatus();
        if (status != ReportStatus.DRAFT && status != ReportStatus.IN_REVIEW) {
            throw ApiException.conflict(
                    "report_locked",
                    "Compte rendu verrouillé (statut " + status + ") — utilisez amend");
        }

        ReportVersion latest =
                reportVersionRepository
                        .findByReportIdAndVersionNumber(report.getId(), report.getCurrentVersion())
                        .orElseThrow(() -> ApiException.notFound("Version courante introuvable"));

        Utilisateur actor = SecurityUtils.currentUserOrNull();
        applyContent(latest, request);
        latest.setAuthor(actor);
        latest.setAuthorName(actorName(actor));
        reportVersionRepository.save(latest);

        report.setUpdatedAt(LocalDateTime.now());
        if (report.getAuthorName() == null || report.getAuthorName().isBlank()) {
            report.setAuthor(actor);
            report.setAuthorName(actorName(actor));
        }
        reportRepository.save(report);

        syncExamenDraftFields(report.getExamen(), latest);
        if (report.getExamen().getStatutCr() == StatutCr.a_faire) {
            report.getExamen().setStatutCr(StatutCr.en_redaction);
        }
        examenRepository.save(report.getExamen());

        auditService.record(
                AuditService.EXAM_UPDATE,
                "Report",
                String.valueOf(report.getId()),
                java.util.Map.of("action", "update"));
        return toDto(report, latest);
    }

    /**
     * Upsert draft from worklist CR facade — avoids dual truth without calling WorklistService.
     */
    @Transactional
    public void upsertDraftFromExamen(
            Long examenId,
            String indication,
            String technique,
            String resultats,
            String conclusion,
            String body) {
        Examen examen =
                examenRepository
                        .findById(examenId)
                        .orElseThrow(() -> ApiException.notFound("Examen introuvable"));

        Utilisateur actor = SecurityUtils.currentUserOrNull();
        String authorName = actorName(actor);

        Report report =
                reportRepository
                        .findByExamenId(examenId)
                        .orElseGet(
                                () -> {
                                    Report created = new Report();
                                    created.setExamen(examen);
                                    created.setStatus(ReportStatus.DRAFT);
                                    created.setCurrentVersion(1);
                                    created.setAuthor(actor);
                                    created.setAuthorName(authorName);
                                    return reportRepository.save(created);
                                });

        if (report.getStatus() != ReportStatus.DRAFT && report.getStatus() != ReportStatus.IN_REVIEW) {
            // Validated reports are not overwritten by the draft facade
            return;
        }

        ReportVersion version =
                reportVersionRepository
                        .findByReportIdAndVersionNumber(report.getId(), report.getCurrentVersion())
                        .orElseGet(
                                () -> {
                                    ReportVersion v = new ReportVersion();
                                    v.setReport(report);
                                    v.setVersionNumber(
                                            report.getCurrentVersion() != null
                                                    ? report.getCurrentVersion()
                                                    : 1);
                                    return v;
                                });

        if (indication != null) {
            version.setIndication(blankToNull(indication));
        }
        if (technique != null) {
            version.setTechnique(blankToNull(technique));
        }
        if (resultats != null) {
            version.setResultats(blankToNull(resultats));
        }
        if (conclusion != null) {
            version.setConclusion(blankToNull(conclusion));
        }
        if (body != null) {
            version.setBody(blankToNull(body));
        }
        version.setAuthor(actor);
        version.setAuthorName(authorName);
        reportVersionRepository.save(version);

        report.setUpdatedAt(LocalDateTime.now());
        reportRepository.save(report);
    }

    @Transactional
    public ReportDto submit(Long id) {
        Report report = loadWithDetails(id);
        ReportStatus next = workflowEngine.transitionReport(report.getStatus(), ReportStatus.IN_REVIEW);
        report.setStatus(next);
        report.setUpdatedAt(LocalDateTime.now());
        reportRepository.save(report);
        ReportVersion latest =
                reportVersionRepository
                        .findByReportIdAndVersionNumber(report.getId(), report.getCurrentVersion())
                        .orElse(null);
        auditService.record(
                AuditService.REPORT_UPDATE,
                "Report",
                String.valueOf(report.getId()),
                java.util.Map.of("action", "submit", "status", next.name()));
        return toDto(report, latest);
    }

    @Transactional
    public ReportDto validate(Long id) {
        Report report = loadWithDetails(id);
        ReportStatus from = report.getStatus();
        if (from != ReportStatus.DRAFT
                && from != ReportStatus.IN_REVIEW
                && from != ReportStatus.AMENDED) {
            throw ApiException.conflict(
                    "invalid_transition", "Validation impossible depuis le statut " + from);
        }
        // DRAFT → IN_REVIEW → VALIDATED if needed (engine forbids DRAFT→VALIDATED directly)
        if (from == ReportStatus.DRAFT) {
            report.setStatus(workflowEngine.transitionReport(ReportStatus.DRAFT, ReportStatus.IN_REVIEW));
            from = ReportStatus.IN_REVIEW;
        }
        ReportStatus next = workflowEngine.transitionReport(from, ReportStatus.VALIDATED);

        Utilisateur actor = SecurityUtils.currentUserOrNull();
        LocalDateTime now = LocalDateTime.now(CentreZone.ZONE);
        report.setStatus(next);
        report.setValidatedAt(now);
        report.setValidatedBy(actor);
        report.setValidatedByName(actorName(actor));
        report.setUpdatedAt(now);
        reportRepository.save(report);

        ReportValidation validation = new ReportValidation();
        validation.setReport(report);
        validation.setVersionNumber(report.getCurrentVersion());
        validation.setValidator(actor);
        validation.setValidatorName(actorName(actor));
        validation.setValidatedAt(now);
        reportValidationRepository.save(validation);

        ReportVersion latest =
                reportVersionRepository
                        .findByReportIdAndVersionNumber(report.getId(), report.getCurrentVersion())
                        .orElse(null);
        Examen examen = report.getExamen();
        if (latest != null) {
            syncExamenDraftFields(examen, latest);
        }
        examen.setStatutCr(StatutCr.signe);
        advanceEncounterOnReportValidation(examen);
        examenRepository.save(examen);

        auditService.record(
                AuditService.REPORT_VALIDATE,
                "Report",
                String.valueOf(report.getId()),
                Map.of(
                        "action", "validate",
                        "version", String.valueOf(report.getCurrentVersion()),
                        "examenId", String.valueOf(examen.getId())));
        return toDto(report, latest);
    }

    private void advanceEncounterOnReportValidation(Examen examen) {
        EncounterStatus from = examen.getWorkflowStatus();
        if (from == null || from == EncounterStatus.VALIDATED || from == EncounterStatus.DISCHARGED) {
            return;
        }
        if (from == EncounterStatus.COMPLETED
                && workflowEngine.canTransitionEncounter(from, EncounterStatus.REPORT_PENDING)) {
            from = workflowEngine.transitionEncounter(from, EncounterStatus.REPORT_PENDING);
            examen.setWorkflowStatus(from);
        }
        if (from == EncounterStatus.REPORT_PENDING
                && workflowEngine.canTransitionEncounter(from, EncounterStatus.VALIDATED)) {
            examen.setWorkflowStatus(
                    workflowEngine.transitionEncounter(from, EncounterStatus.VALIDATED));
        }
    }

    @Transactional
    public ReportDto amend(Long id, ReportAmendRequest request) {
        if (request == null || request.getReason() == null || request.getReason().isBlank()) {
            throw ApiException.badRequest("reason requis pour un amendement");
        }
        Report report = loadWithDetails(id);
        ReportStatus from = report.getStatus();
        if (from != ReportStatus.VALIDATED && from != ReportStatus.AMENDED) {
            throw ApiException.conflict(
                    "invalid_transition",
                    "Amendement possible uniquement depuis VALIDATED ou AMENDED");
        }
        // AMENDED → VALIDATED is for re-validate; VALIDATED → AMENDED via engine.
        // If already AMENDED, stay AMENDED after new version (or transition VALIDATED→AMENDED).
        if (from == ReportStatus.VALIDATED) {
            report.setStatus(workflowEngine.transitionReport(ReportStatus.VALIDATED, ReportStatus.AMENDED));
        }

        ReportVersion previous =
                reportVersionRepository
                        .findByReportIdAndVersionNumber(report.getId(), report.getCurrentVersion())
                        .orElseThrow(() -> ApiException.notFound("Version courante introuvable"));

        int fromVersion = report.getCurrentVersion();
        int toVersion = fromVersion + 1;

        Utilisateur actor = SecurityUtils.currentUserOrNull();
        String authorName = actorName(actor);

        ReportVersion next = new ReportVersion();
        next.setReport(report);
        next.setVersionNumber(toVersion);
        next.setIndication(
                request.getIndication() != null
                        ? blankToNull(request.getIndication())
                        : previous.getIndication());
        next.setTechnique(
                request.getTechnique() != null
                        ? blankToNull(request.getTechnique())
                        : previous.getTechnique());
        next.setResultats(
                request.getResultats() != null
                        ? blankToNull(request.getResultats())
                        : previous.getResultats());
        next.setConclusion(
                request.getConclusion() != null
                        ? blankToNull(request.getConclusion())
                        : previous.getConclusion());
        String body =
                firstNonBlank(request.getBody(), request.getTexte());
        next.setBody(body != null ? blankToNull(body) : previous.getBody());
        next.setAuthor(actor);
        next.setAuthorName(authorName);
        reportVersionRepository.save(next);

        ReportAmendment amendment = new ReportAmendment();
        amendment.setReport(report);
        amendment.setFromVersion(fromVersion);
        amendment.setToVersion(toVersion);
        amendment.setReason(request.getReason().trim());
        amendment.setAuthor(actor);
        amendment.setAuthorName(authorName);
        reportAmendmentRepository.save(amendment);

        report.setCurrentVersion(toVersion);
        report.setStatus(ReportStatus.AMENDED);
        report.setValidatedAt(null);
        report.setValidatedBy(null);
        report.setValidatedByName(null);
        report.setUpdatedAt(LocalDateTime.now());
        reportRepository.save(report);

        Examen examen = report.getExamen();
        syncExamenDraftFields(examen, next);
        examen.setStatutCr(StatutCr.en_redaction);
        examenRepository.save(examen);

        auditService.record(
                AuditService.EXAM_UPDATE,
                "Report",
                String.valueOf(report.getId()),
                java.util.Map.of(
                        "action", "amend",
                        "fromVersion", fromVersion,
                        "toVersion", toVersion));
        return toDto(report, next);
    }

    @Transactional(readOnly = true)
    public List<ReportVersionDto> listVersions(Long id) {
        loadWithDetails(id);
        return reportVersionRepository.findByReportIdOrderByVersionNumberAsc(id).stream()
                .map(this::toVersionDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public FactureService.FacturePdf pdf(Long id) {
        Report report = loadWithDetails(id);
        return factureService.genererCompteRenduPdf(report.getExamen().getId());
    }

    /** Marque le CR comme imprimé (réimpression autorisée) — sans hardware. */
    @Transactional
    public ReportDto markPrinted(Long id) {
        Report report = loadWithDetails(id);
        if (report.getStatus() != ReportStatus.VALIDATED && report.getStatus() != ReportStatus.AMENDED) {
            throw ApiException.conflict(
                    "report_not_validated", "Seuls les comptes rendus validés peuvent être imprimés");
        }
        Examen examen = report.getExamen();
        examen.setStatutCr(StatutCr.imprime);
        examenRepository.save(examen);
        auditService.record(
                AuditService.REPORT_UPDATE,
                "Report",
                String.valueOf(report.getId()),
                java.util.Map.of("action", "print", "examenId", examen.getId()));
        ReportVersion latest =
                reportVersionRepository
                        .findByReportIdAndVersionNumber(report.getId(), report.getCurrentVersion())
                        .orElse(null);
        return toDto(report, latest);
    }

    private Report loadWithDetails(Long id) {
        return reportRepository
                .findByIdWithDetails(id)
                .orElseThrow(() -> ApiException.notFound("Compte rendu introuvable"));
    }

    private void applyContent(ReportVersion version, ReportWriteRequest request) {
        if (request == null) {
            return;
        }
        if (request.getIndication() != null) {
            version.setIndication(blankToNull(request.getIndication()));
        }
        if (request.getTechnique() != null) {
            version.setTechnique(blankToNull(request.getTechnique()));
        }
        if (request.getResultats() != null) {
            version.setResultats(blankToNull(request.getResultats()));
        }
        if (request.getConclusion() != null) {
            version.setConclusion(blankToNull(request.getConclusion()));
        }
        String body = firstNonBlank(request.getBody(), request.getTexte());
        if (body != null) {
            version.setBody(blankToNull(body));
        }
    }

    private void syncExamenDraftFields(Examen examen, ReportVersion version) {
        if (version.getIndication() != null) {
            examen.setIndication(version.getIndication());
        }
        if (version.getTechnique() != null) {
            examen.setTechnique(version.getTechnique());
        }
        if (version.getResultats() != null) {
            examen.setResultats(version.getResultats());
        }
        if (version.getConclusion() != null) {
            examen.setConclusion(version.getConclusion());
        }
        if (version.getBody() != null) {
            examen.setCompteRendu(version.getBody());
        } else {
            String composed = composeBody(version);
            if (composed != null && !composed.isBlank()) {
                examen.setCompteRendu(composed);
            }
        }
    }

    private static String composeBody(ReportVersion v) {
        StringBuilder sb = new StringBuilder();
        if (notBlank(v.getIndication())) {
            sb.append("Indication:\n").append(v.getIndication().trim()).append("\n\n");
        }
        if (notBlank(v.getTechnique())) {
            sb.append("Technique:\n").append(v.getTechnique().trim()).append("\n\n");
        }
        if (notBlank(v.getResultats())) {
            sb.append("Résultats:\n").append(v.getResultats().trim()).append("\n\n");
        }
        if (notBlank(v.getConclusion())) {
            sb.append("Conclusion:\n").append(v.getConclusion().trim());
        }
        return sb.toString().trim();
    }

    private ReportDto toDto(Report report, ReportVersion version) {
        Examen examen = report.getExamen();
        String patientName =
                examen.getPatient() != null ? examen.getPatient().getNomComplet() : null;
        String patientId =
                examen.getPatient() != null ? String.valueOf(examen.getPatient().getId()) : null;
        String examLabel =
                examen.getDescription() != null && !examen.getDescription().isBlank()
                        ? examen.getDescription()
                        : (examen.getCatalogue() != null ? examen.getCatalogue().getNom() : null);
        String radiologist =
                firstNonBlank(
                        report.getAuthorName(),
                        examen.getMedecin(),
                        examen.getAssignedRadiologue() != null
                                ? examen.getAssignedRadiologue().getNomComplet()
                                : null);

        ReportDto.ReportDtoBuilder b =
                ReportDto.builder()
                        .id(String.valueOf(report.getId()))
                        .examenId(String.valueOf(examen.getId()))
                        .patientId(patientId)
                        .patientName(patientName)
                        .examLabel(examLabel)
                        .status(report.getStatus().name().toLowerCase(Locale.ROOT))
                        .radiologist(radiologist)
                        .authorName(report.getAuthorName())
                        .currentVersion(report.getCurrentVersion())
                        .createdAt(report.getCreatedAt())
                        .validatedAt(report.getValidatedAt());

        if (version != null) {
            b.indication(version.getIndication())
                    .technique(version.getTechnique())
                    .resultats(version.getResultats())
                    .conclusion(version.getConclusion())
                    .body(version.getBody())
                    .texte(version.getBody());
        }
        return b.build();
    }

    private ReportVersionDto toVersionDto(ReportVersion v) {
        return ReportVersionDto.builder()
                .id(String.valueOf(v.getId()))
                .versionNumber(v.getVersionNumber())
                .indication(v.getIndication())
                .technique(v.getTechnique())
                .resultats(v.getResultats())
                .conclusion(v.getConclusion())
                .body(v.getBody())
                .authorName(v.getAuthorName())
                .createdAt(v.getCreatedAt())
                .build();
    }

    private static ReportStatus parseStatusOrNull(String status) {
        if (status == null || status.isBlank()) {
            return null;
        }
        try {
            return ReportStatus.valueOf(status.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            throw ApiException.badRequest("Statut rapport invalide: " + status);
        }
    }

    private static String actorName(Utilisateur actor) {
        if (actor == null) {
            return "Système";
        }
        if (actor.getNomComplet() != null && !actor.getNomComplet().isBlank()) {
            return actor.getNomComplet();
        }
        return actor.getEmail() != null ? actor.getEmail() : "Système";
    }

    private static String blankToNull(String value) {
        if (value == null) {
            return null;
        }
        String t = value.trim();
        return t.isEmpty() ? null : t;
    }

    private static boolean notBlank(String value) {
        return value != null && !value.isBlank();
    }

    private static String firstNonBlank(String... values) {
        if (values == null) {
            return null;
        }
        for (String v : values) {
            if (v != null && !v.isBlank()) {
                return v;
            }
        }
        return null;
    }
}
