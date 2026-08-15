package com.crm.medicare.service;

import com.crm.medicare.dto.ImagerieStudyDto;
import com.crm.medicare.dto.ImagerieStudyDto.ImagerieImageDto;
import com.crm.medicare.dto.ImagerieStudyDto.ImagerieSeriesDto;
import com.crm.medicare.entity.Examen;
import com.crm.medicare.entity.Modalite;
import com.crm.medicare.entity.Patient;
import com.crm.medicare.repository.ExamenRepository;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * Simulateur PACS : génère des métadonnées DICOM factices + URLs d'images de démonstration.
 */
@Service
@RequiredArgsConstructor
public class ImagerieService {

    private static final DateTimeFormatter DICOM_DATE =
            DateTimeFormatter.ofPattern("yyyyMMdd");
    private static final String UID_ROOT = "1.2.840.113619.2.55.3.2831190743";

    private final ExamenRepository examenRepository;

    @Transactional(readOnly = true)
    public ImagerieStudyDto getStudyForExamen(Long examenId) {
        Examen examen =
                examenRepository
                        .findByIdWithPatient(examenId)
                        .orElseThrow(
                                () ->
                                        new ResponseStatusException(
                                                HttpStatus.NOT_FOUND, "Examen introuvable"));

        Patient patient = examen.getPatient();
        String patientName = patient != null ? safe(patient.getNomComplet(), "ANONYME^PATIENT") : "ANONYME^PATIENT";
        String patientId = patient != null ? safe(patient.getCin(), "PID-" + examenId) : "PID-" + examenId;
        String modality = toDicomModality(examen.getModalite());
        String studyDate =
                examen.getDateExamen() != null
                        ? examen.getDateExamen().toLocalDate().format(DICOM_DATE)
                        : "20260101";
        String studyDesc =
                firstNonBlank(
                        examen.getDescription(),
                        examen.getModalite() != null ? examen.getModalite().name() : "Étude");

        String studyUid = UID_ROOT + "." + examenId + ".1";

        List<ImagerieSeriesDto> series = buildSeries(examenId, modality, studyDesc);
        int totalImages =
                series.stream().mapToInt(ImagerieSeriesDto::getNumberOfInstances).sum();

        return ImagerieStudyDto.builder()
                .examenId(String.valueOf(examenId))
                .studyInstanceUID(studyUid)
                .patientName(patientName)
                .patientId(patientId)
                .modality(modality)
                .studyDescription(studyDesc)
                .studyDate(studyDate)
                .numberOfImages(totalImages)
                .series(series)
                .build();
    }

    private List<ImagerieSeriesDto> buildSeries(Long examenId, String modality, String studyDesc) {
        List<ImagerieSeriesDto> series = new ArrayList<>();

        series.add(
                buildOneSeries(
                        examenId,
                        1,
                        modality,
                        seriesLabel(modality, "Axial Soft Tissue"),
                        8,
                        110));
        series.add(
                buildOneSeries(
                        examenId,
                        2,
                        modality,
                        seriesLabel(modality, "Coronal recon"),
                        5,
                        220));
        series.add(
                buildOneSeries(
                        examenId,
                        3,
                        modality,
                        firstNonBlank(studyDesc, "Localizer"),
                        3,
                        330));

        return series;
    }

    private ImagerieSeriesDto buildOneSeries(
            Long examenId, int seriesNumber, String modality, String description, int count, int seedBase) {
        String seriesUid = UID_ROOT + "." + examenId + ".2." + seriesNumber;
        List<ImagerieImageDto> images = new ArrayList<>();
        for (int i = 1; i <= count; i++) {
            int seed = seedBase + (int) (examenId % 50) * 7 + i;
            images.add(
                    ImagerieImageDto.builder()
                            .instanceNumber(i)
                            .sopInstanceUID(seriesUid + "." + i)
                            .url(demoImageUrl(seed, modality))
                            .build());
        }

        return ImagerieSeriesDto.builder()
                .seriesInstanceUID(seriesUid)
                .seriesDescription(description)
                .modality(modality)
                .numberOfInstances(count)
                .thumbnailUrl(images.get(0).getUrl())
                .images(images)
                .build();
    }

    /**
     * Placeholders médicaux sombres (démo) — picsum en niveaux de gris pour un rendu clinique.
     */
    private static String demoImageUrl(int seed, String modality) {
        String label =
                switch (modality.toUpperCase(Locale.ROOT)) {
                    case "MR" -> "IRM";
                    case "CT" -> "CT";
                    case "MG" -> "MG";
                    case "US" -> "US";
                    default -> "XR";
                };
        // Fond sombre + texte modalité — lisible hors réseau DICOM réel
        return "https://placehold.co/800x800/0a0a0a/9ca3af/png?text="
                + label
                + "+"
                + seed
                + "&font=roboto";
    }

    private static String toDicomModality(Modalite modalite) {
        if (modalite == null) {
            return "OT";
        }
        return switch (modalite) {
            case IRM -> "MR";
            case Scanner -> "CT";
            case Mammographie -> "MG";
            case Échographie -> "US";
            case Radiologie -> "CR";
        };
    }

    private static String seriesLabel(String modality, String suffix) {
        return modality + " — " + suffix;
    }

    private static String safe(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value.trim();
    }

    private static String firstNonBlank(String primary, String fallback) {
        if (primary != null && !primary.isBlank()) {
            return primary.trim();
        }
        return fallback;
    }
}
