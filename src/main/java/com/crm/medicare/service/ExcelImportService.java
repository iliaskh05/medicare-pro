package com.crm.medicare.service;

import com.crm.medicare.common.ApiException;
import com.crm.medicare.common.CentreZone;
import com.crm.medicare.dto.CatalogueExamenWriteRequest;
import com.crm.medicare.dto.DataImportJobDto;
import com.crm.medicare.dto.ImportPreviewDto;
import com.crm.medicare.dto.ImportResultDto;
import com.crm.medicare.dto.ImportRowError;
import com.crm.medicare.entity.CatalogueExamen;
import com.crm.medicare.entity.DataImportJob;
import com.crm.medicare.entity.MedecinReferent;
import com.crm.medicare.entity.Modalite;
import com.crm.medicare.entity.ResourceRoom;
import com.crm.medicare.entity.Utilisateur;
import com.crm.medicare.repository.CatalogueExamenRepository;
import com.crm.medicare.repository.DataImportJobRepository;
import com.crm.medicare.repository.MedecinReferentRepository;
import com.crm.medicare.repository.ResourceRoomRepository;
import com.crm.medicare.security.SecurityUtils;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ExcelImportService {

    public static final String MODE_INITIALIZATION = "INITIALIZATION";
    public static final String MODE_UPDATE = "UPDATE";
    public static final String EXAMPLE_PREFIX = "EXAMPLE — DELETE BEFORE IMPORT";

    private final CatalogueService catalogueService;
    private final CatalogueExamenRepository catalogueExamenRepository;
    private final ResourceRoomRepository resourceRoomRepository;
    private final MedecinReferentRepository medecinReferentRepository;
    private final DataImportJobRepository dataImportJobRepository;
    private final AppointmentService appointmentService;
    private final AuditService auditService;

    private final DataFormatter formatter = new DataFormatter();

    public byte[] template() {
        try (XSSFWorkbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet readme = wb.createSheet("README");
            writeRow(readme, 0, "MediCare Pro — modèle d'import centre");
            writeRow(readme, 1, "Les lignes préfixées EXAMPLE — DELETE BEFORE IMPORT sont des exemples à supprimer.");
            writeRow(readme, 2, "Modes: INITIALIZATION (création seule, ignore codes existants) | UPDATE (upsert par code).");
            writeRow(readme, 3, "Ne jamais supprimer d'actes absents du fichier — l'import n'efface pas.");
            writeRow(readme, 4, "Prix = tarif centre (MAD). national_reference_price séparé — ne pas inventer de tarifs ANAM.");
            writeRow(readme, 5, "Modalités autorisées: Scanner | IRM | Mammographie | Radiologie | Échographie");

            Sheet exams = wb.createSheet("EXAMS");
            writeRow(
                    exams,
                    0,
                    "code",
                    "nom",
                    "modalite",
                    "categorie",
                    "body_region",
                    "duree_minutes",
                    "prix",
                    "currency",
                    "contrast_required",
                    "contrast_type",
                    "sedation_required",
                    "description",
                    "preparation",
                    "actif",
                    "note");
            writeRow(
                    exams,
                    1,
                    "XR-THORAX-FACE",
                    "Radiographie thorax face",
                    "Radiologie",
                    "RADIOGRAPHIE",
                    "Thorax",
                    "10",
                    "150",
                    "MAD",
                    "false",
                    "",
                    "false",
                    "Exemple — tarif indicatif marché",
                    "Retirer métaux",
                    "true",
                    EXAMPLE_PREFIX);

            Sheet modalities = wb.createSheet("MODALITIES");
            writeRow(modalities, 0, "code", "libelle", "note");
            writeRow(modalities, 1, "Radiologie", "Radiographie conventionnelle", EXAMPLE_PREFIX);
            writeRow(modalities, 2, "Échographie", "Échographie / Doppler", EXAMPLE_PREFIX);
            writeRow(modalities, 3, "Scanner", "Tomodensitométrie", EXAMPLE_PREFIX);
            writeRow(modalities, 4, "IRM", "Imagerie par résonance magnétique", EXAMPLE_PREFIX);
            writeRow(modalities, 5, "Mammographie", "Mammographie", EXAMPLE_PREFIX);

            Sheet resources = wb.createSheet("RESOURCES");
            writeRow(resources, 0, "code", "libelle", "modalite", "actif", "note");
            writeRow(resources, 1, "MRI-01", "Salle IRM 1", "IRM", "true", EXAMPLE_PREFIX);

            Sheet refs = wb.createSheet("REFERRING_PHYSICIANS");
            writeRow(refs, 0, "code", "nom", "specialite", "telephone", "email", "ville", "actif", "note");
            writeRow(
                    refs,
                    1,
                    "DEMO-REF-001",
                    "Dr. Exemple Benali",
                    "Médecine générale",
                    "0612345678",
                    "exemple@referent.local",
                    "Casablanca",
                    "true",
                    EXAMPLE_PREFIX);

            Sheet settings = wb.createSheet("SETTINGS");
            writeRow(settings, 0, "key", "value", "note");
            writeRow(settings, 1, "centre.timezone", "Africa/Casablanca", EXAMPLE_PREFIX);
            writeRow(settings, 2, "centre.currency", "MAD", EXAMPLE_PREFIX);

            wb.write(out);
            return out.toByteArray();
        } catch (Exception ex) {
            throw new IllegalStateException("Impossible de générer le modèle Excel", ex);
        }
    }

    @Transactional(readOnly = true)
    public ImportPreviewDto preview(InputStream inputStream, String mode, String filename) {
        String normalized = normalizeMode(mode);
        ParsedWorkbook parsed = parse(inputStream);
        ValidationResult validation = validate(parsed, normalized);
        return ImportPreviewDto.builder()
                .mode(normalized)
                .filename(filename)
                .rowsTotal(validation.rowsTotal())
                .rowsValid(validation.rowsValid())
                .rowsInvalid(validation.errors().size())
                .errors(validation.errors())
                .build();
    }

    @Transactional
    public ImportResultDto commit(InputStream inputStream, String mode, String filename) {
        String normalized = normalizeMode(mode);
        ParsedWorkbook parsed = parse(inputStream);
        ValidationResult validation = validate(parsed, normalized);
        if (!validation.errors().isEmpty() && validation.rowsValid() == 0) {
            throw ApiException.badRequest("Aucune ligne valide à importer");
        }

        Utilisateur actor = SecurityUtils.currentUserOrNull();
        DataImportJob job = new DataImportJob();
        job.setFilename(filename != null ? filename : "import.xlsx");
        job.setImportType("CATALOGUE_RESOURCES");
        job.setImportMode(normalized);
        job.setStatus("RUNNING");
        job.setRowsTotal(validation.rowsTotal());
        job.setRowsValid(validation.rowsValid());
        job.setRowsImported(0);
        job.setRowsRejected(validation.errors().size());
        if (actor != null) {
            job.setCreatedById(actor.getId());
            job.setCreatedByName(actor.getNomComplet());
        }
        job = dataImportJobRepository.save(job);

        int imported = 0;
        List<ImportRowError> commitErrors = new ArrayList<>(validation.errors());

        for (ExamRow row : validation.validExams()) {
            try {
                boolean updateExisting = MODE_UPDATE.equals(normalized);
                if (MODE_INITIALIZATION.equals(normalized)
                        && catalogueExamenRepository.existsByCodeIgnoreCase(row.code())) {
                    continue;
                }
                CatalogueExamenWriteRequest req = new CatalogueExamenWriteRequest();
                req.setCode(row.code());
                req.setNom(row.nom());
                req.setModalite(row.modalite());
                req.setCategorie(row.categorie());
                req.setBodyRegion(row.bodyRegion());
                req.setDureeMinutes(row.dureeMinutes());
                req.setPrix(row.prix());
                req.setCurrency(row.currency());
                req.setContrastRequired(row.contrastRequired());
                req.setContrastType(row.contrastType());
                req.setSedationRequired(row.sedationRequired());
                req.setDescription(row.description());
                req.setPreparation(row.preparation());
                req.setActif(row.actif());
                req.setMarketIndicative(true);
                catalogueService.upsertByCode(req, updateExisting || !catalogueExamenRepository.existsByCodeIgnoreCase(row.code()));
                imported++;
            } catch (Exception ex) {
                commitErrors.add(
                        ImportRowError.builder()
                                .sheet("EXAMS")
                                .row(row.rowNum())
                                .field("code")
                                .message(ex.getMessage())
                                .build());
            }
        }

        for (ResourceRow row : validation.validResources()) {
            try {
                var existing = resourceRoomRepository.findByCodeIgnoreCase(row.code());
                if (MODE_INITIALIZATION.equals(normalized) && existing.isPresent()) {
                    continue;
                }
                if (existing.isPresent()) {
                    ResourceRoom room = existing.get();
                    room.setLibelle(row.libelle());
                    room.setModalite(Modalite.valueOf(row.modalite()));
                    room.setActif(row.actif());
                    resourceRoomRepository.save(room);
                } else {
                    appointmentService.createResource(row.code(), row.libelle(), row.modalite());
                }
                imported++;
            } catch (Exception ex) {
                commitErrors.add(
                        ImportRowError.builder()
                                .sheet("RESOURCES")
                                .row(row.rowNum())
                                .field("code")
                                .message(ex.getMessage())
                                .build());
            }
        }

        for (ReferentRow row : validation.validReferents()) {
            try {
                MedecinReferent ref =
                        medecinReferentRepository.findAll().stream()
                                .filter(r -> row.code().equalsIgnoreCase(r.getIdMedecinExcel()))
                                .findFirst()
                                .orElseGet(MedecinReferent::new);
                if (MODE_INITIALIZATION.equals(normalized) && ref.getId() != null) {
                    continue;
                }
                ref.setIdMedecinExcel(row.code());
                ref.setNom(row.nom());
                ref.setSpecialite(row.specialite());
                ref.setTelephone(row.telephone());
                ref.setEmail(row.email());
                ref.setVille(row.ville());
                ref.setActif(row.actif());
                medecinReferentRepository.save(ref);
                imported++;
            } catch (Exception ex) {
                commitErrors.add(
                        ImportRowError.builder()
                                .sheet("REFERRING_PHYSICIANS")
                                .row(row.rowNum())
                                .field("code")
                                .message(ex.getMessage())
                                .build());
            }
        }

        job.setRowsImported(imported);
        job.setRowsRejected(commitErrors.size());
        job.setStatus(commitErrors.isEmpty() ? "COMPLETED" : "COMPLETED_WITH_ERRORS");
        job.setErrorSummary(
                commitErrors.isEmpty()
                        ? null
                        : commitErrors.stream()
                                .limit(20)
                                .map(e -> e.getSheet() + "#" + e.getRow() + ": " + e.getMessage())
                                .collect(Collectors.joining("; ")));
        job.setCompletedAt(LocalDateTime.now(CentreZone.ZONE));
        job = dataImportJobRepository.save(job);

        auditService.record(
                AuditService.SETTINGS_UPDATE,
                "DataImportJob",
                String.valueOf(job.getId()),
                java.util.Map.of("mode", normalized, "imported", imported));

        return ImportResultDto.builder()
                .jobId(job.getId())
                .mode(normalized)
                .filename(job.getFilename())
                .status(job.getStatus())
                .rowsTotal(job.getRowsTotal())
                .rowsValid(job.getRowsValid())
                .rowsImported(job.getRowsImported())
                .rowsRejected(job.getRowsRejected())
                .errors(commitErrors)
                .build();
    }

    @Transactional(readOnly = true)
    public List<DataImportJobDto> history() {
        return dataImportJobRepository.findTop50ByOrderByCreatedAtDesc().stream()
                .map(this::toJobDto)
                .toList();
    }

    private DataImportJobDto toJobDto(DataImportJob job) {
        return DataImportJobDto.builder()
                .id(job.getId())
                .filename(job.getFilename())
                .importType(job.getImportType())
                .importMode(job.getImportMode())
                .status(job.getStatus())
                .rowsTotal(job.getRowsTotal())
                .rowsValid(job.getRowsValid())
                .rowsImported(job.getRowsImported())
                .rowsRejected(job.getRowsRejected())
                .errorSummary(job.getErrorSummary())
                .createdById(job.getCreatedById())
                .createdByName(job.getCreatedByName())
                .createdAt(job.getCreatedAt())
                .completedAt(job.getCompletedAt())
                .build();
    }

    private String normalizeMode(String mode) {
        if (mode == null || mode.isBlank()) {
            return MODE_INITIALIZATION;
        }
        String m = mode.trim().toUpperCase(Locale.ROOT);
        if (!MODE_INITIALIZATION.equals(m) && !MODE_UPDATE.equals(m)) {
            throw ApiException.badRequest("mode invalide (INITIALIZATION|UPDATE)");
        }
        return m;
    }

    private ParsedWorkbook parse(InputStream inputStream) {
        try (Workbook wb = new XSSFWorkbook(inputStream)) {
            List<ExamRow> exams = parseExams(wb.getSheet("EXAMS"));
            List<ResourceRow> resources = parseResources(wb.getSheet("RESOURCES"));
            List<ReferentRow> referents = parseReferents(wb.getSheet("REFERRING_PHYSICIANS"));
            return new ParsedWorkbook(exams, resources, referents);
        } catch (ApiException ex) {
            throw ex;
        } catch (Exception ex) {
            throw ApiException.badRequest("Fichier Excel illisible: " + ex.getMessage());
        }
    }

    private List<ExamRow> parseExams(Sheet sheet) {
        List<ExamRow> rows = new ArrayList<>();
        if (sheet == null) {
            return rows;
        }
        for (int i = 1; i <= sheet.getLastRowNum(); i++) {
            Row row = sheet.getRow(i);
            if (row == null || isBlankRow(row, 14)) {
                continue;
            }
            String note = cell(row, 14);
            if (note != null && note.contains("EXAMPLE")) {
                continue;
            }
            String code = cell(row, 0);
            if (code != null && code.startsWith("EXAMPLE")) {
                continue;
            }
            rows.add(
                    new ExamRow(
                            i + 1,
                            cell(row, 0),
                            cell(row, 1),
                            cell(row, 2),
                            cell(row, 3),
                            cell(row, 4),
                            parseInt(cell(row, 5)),
                            parseDecimal(cell(row, 6)),
                            blankTo(cell(row, 7), "MAD"),
                            parseBool(cell(row, 8), false),
                            cell(row, 9),
                            parseBool(cell(row, 10), false),
                            cell(row, 11),
                            cell(row, 12),
                            parseBool(cell(row, 13), true)));
        }
        return rows;
    }

    private List<ResourceRow> parseResources(Sheet sheet) {
        List<ResourceRow> rows = new ArrayList<>();
        if (sheet == null) {
            return rows;
        }
        for (int i = 1; i <= sheet.getLastRowNum(); i++) {
            Row row = sheet.getRow(i);
            if (row == null || isBlankRow(row, 4)) {
                continue;
            }
            String note = cell(row, 4);
            if (note != null && note.contains("EXAMPLE")) {
                continue;
            }
            String code = cell(row, 0);
            if (code != null && code.startsWith("EXAMPLE")) {
                continue;
            }
            rows.add(
                    new ResourceRow(
                            i + 1,
                            cell(row, 0),
                            cell(row, 1),
                            cell(row, 2),
                            parseBool(cell(row, 3), true)));
        }
        return rows;
    }

    private List<ReferentRow> parseReferents(Sheet sheet) {
        List<ReferentRow> rows = new ArrayList<>();
        if (sheet == null) {
            return rows;
        }
        for (int i = 1; i <= sheet.getLastRowNum(); i++) {
            Row row = sheet.getRow(i);
            if (row == null || isBlankRow(row, 7)) {
                continue;
            }
            String note = cell(row, 7);
            if (note != null && note.contains("EXAMPLE")) {
                continue;
            }
            rows.add(
                    new ReferentRow(
                            i + 1,
                            cell(row, 0),
                            cell(row, 1),
                            cell(row, 2),
                            cell(row, 3),
                            cell(row, 4),
                            cell(row, 5),
                            parseBool(cell(row, 6), true)));
        }
        return rows;
    }

    private ValidationResult validate(ParsedWorkbook parsed, String mode) {
        List<ImportRowError> errors = new ArrayList<>();
        List<ExamRow> validExams = new ArrayList<>();
        List<ResourceRow> validResources = new ArrayList<>();
        List<ReferentRow> validReferents = new ArrayList<>();
        Set<String> examCodes = new HashSet<>();
        Set<String> resourceCodes = new HashSet<>();

        for (ExamRow row : parsed.exams()) {
            boolean ok = true;
            if (isBlank(row.code())) {
                errors.add(err("EXAMS", row.rowNum(), "code", "code obligatoire"));
                ok = false;
            } else if (!examCodes.add(row.code().trim().toUpperCase(Locale.ROOT))) {
                errors.add(err("EXAMS", row.rowNum(), "code", "code en doublon dans le fichier"));
                ok = false;
            }
            if (isBlank(row.nom())) {
                errors.add(err("EXAMS", row.rowNum(), "nom", "nom obligatoire"));
                ok = false;
            }
            if (isBlank(row.modalite()) || !isValidModalite(row.modalite())) {
                errors.add(
                        err(
                                "EXAMS",
                                row.rowNum(),
                                "modalite",
                                "modalite invalide (Scanner|IRM|Mammographie|Radiologie|Échographie)"));
                ok = false;
            }
            if (row.prix() == null || row.prix().compareTo(BigDecimal.ZERO) < 0) {
                errors.add(err("EXAMS", row.rowNum(), "prix", "prix invalide (>= 0)"));
                ok = false;
            }
            if (MODE_INITIALIZATION.equals(mode)
                    && !isBlank(row.code())
                    && catalogueExamenRepository.existsByCodeIgnoreCase(row.code().trim())) {
                errors.add(err("EXAMS", row.rowNum(), "code", "code déjà présent en base (mode INITIALIZATION)"));
                ok = false;
            }
            if (ok) {
                validExams.add(row);
            }
        }

        for (ResourceRow row : parsed.resources()) {
            boolean ok = true;
            if (isBlank(row.code()) || isBlank(row.libelle())) {
                errors.add(err("RESOURCES", row.rowNum(), "code", "code et libelle obligatoires"));
                ok = false;
            } else if (!resourceCodes.add(row.code().trim().toUpperCase(Locale.ROOT))) {
                errors.add(err("RESOURCES", row.rowNum(), "code", "code en doublon dans le fichier"));
                ok = false;
            }
            if (isBlank(row.modalite()) || !isValidModalite(row.modalite())) {
                errors.add(err("RESOURCES", row.rowNum(), "modalite", "modalite invalide"));
                ok = false;
            }
            if (MODE_INITIALIZATION.equals(mode)
                    && !isBlank(row.code())
                    && resourceRoomRepository.findByCodeIgnoreCase(row.code().trim()).isPresent()) {
                errors.add(err("RESOURCES", row.rowNum(), "code", "ressource déjà présente (mode INITIALIZATION)"));
                ok = false;
            }
            if (ok) {
                validResources.add(row);
            }
        }

        for (ReferentRow row : parsed.referents()) {
            boolean ok = true;
            if (isBlank(row.code()) || isBlank(row.nom())) {
                errors.add(err("REFERRING_PHYSICIANS", row.rowNum(), "code", "code et nom obligatoires"));
                ok = false;
            }
            if (ok) {
                validReferents.add(row);
            }
        }

        int total = parsed.exams().size() + parsed.resources().size() + parsed.referents().size();
        int valid = validExams.size() + validResources.size() + validReferents.size();
        return new ValidationResult(total, valid, errors, validExams, validResources, validReferents);
    }

    private static ImportRowError err(String sheet, int row, String field, String message) {
        return ImportRowError.builder().sheet(sheet).row(row).field(field).message(message).build();
    }

    private static boolean isValidModalite(String value) {
        try {
            Modalite.valueOf(value.trim());
            return true;
        } catch (Exception ex) {
            return false;
        }
    }

    private String cell(Row row, int idx) {
        Cell cell = row.getCell(idx);
        if (cell == null) {
            return null;
        }
        String v = formatter.formatCellValue(cell);
        return v == null || v.isBlank() ? null : v.trim();
    }

    private static boolean isBlankRow(Row row, int lastCol) {
        for (int i = 0; i <= lastCol; i++) {
            Cell c = row.getCell(i);
            if (c != null && c.toString() != null && !c.toString().isBlank()) {
                return false;
            }
        }
        return true;
    }

    private static Integer parseInt(String v) {
        if (isBlank(v)) {
            return null;
        }
        try {
            return Integer.parseInt(v.replace(",", "").trim());
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private static BigDecimal parseDecimal(String v) {
        if (isBlank(v)) {
            return null;
        }
        try {
            return new BigDecimal(v.replace(",", ".").trim());
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private static boolean parseBool(String v, boolean defaultValue) {
        if (isBlank(v)) {
            return defaultValue;
        }
        String s = v.trim().toLowerCase(Locale.ROOT);
        if (s.equals("true") || s.equals("1") || s.equals("oui") || s.equals("yes")) {
            return true;
        }
        if (s.equals("false") || s.equals("0") || s.equals("non") || s.equals("no")) {
            return false;
        }
        return defaultValue;
    }

    private static String blankTo(String v, String fallback) {
        return isBlank(v) ? fallback : v.trim();
    }

    private static boolean isBlank(String v) {
        return v == null || v.isBlank();
    }

    private record ParsedWorkbook(List<ExamRow> exams, List<ResourceRow> resources, List<ReferentRow> referents) {}

    private record ExamRow(
            int rowNum,
            String code,
            String nom,
            String modalite,
            String categorie,
            String bodyRegion,
            Integer dureeMinutes,
            BigDecimal prix,
            String currency,
            boolean contrastRequired,
            String contrastType,
            boolean sedationRequired,
            String description,
            String preparation,
            boolean actif) {}

    private record ResourceRow(int rowNum, String code, String libelle, String modalite, boolean actif) {}

    private record ReferentRow(
            int rowNum,
            String code,
            String nom,
            String specialite,
            String telephone,
            String email,
            String ville,
            boolean actif) {}

    private record ValidationResult(
            int rowsTotal,
            int rowsValid,
            List<ImportRowError> errors,
            List<ExamRow> validExams,
            List<ResourceRow> validResources,
            List<ReferentRow> validReferents) {}

    private static void writeRow(Sheet sheet, int rowIndex, String... values) {
        Row row = sheet.getRow(rowIndex);
        if (row == null) {
            row = sheet.createRow(rowIndex);
        }
        for (int i = 0; i < values.length; i++) {
            Cell cell = row.createCell(i);
            cell.setCellValue(values[i] != null ? values[i] : "");
        }
    }
}
