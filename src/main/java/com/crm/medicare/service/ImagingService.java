package com.crm.medicare.service;

import com.crm.medicare.common.ApiException;
import com.crm.medicare.dto.ImagerieStudyDto;
import com.crm.medicare.dto.ImagerieStudyDto.ImagerieImageDto;
import com.crm.medicare.dto.ImagerieStudyDto.ImagerieSeriesDto;
import com.crm.medicare.dto.ImagingInstanceDto;
import com.crm.medicare.dto.ImagingSeriesDto;
import com.crm.medicare.dto.ImagingStudyDto;
import com.crm.medicare.entity.Examen;
import com.crm.medicare.entity.ImagingInstance;
import com.crm.medicare.entity.ImagingSeries;
import com.crm.medicare.entity.ImagingStudy;
import com.crm.medicare.entity.Patient;
import com.crm.medicare.imaging.ImagingProvider;
import com.crm.medicare.repository.ExamenRepository;
import com.crm.medicare.repository.ImagingInstanceRepository;
import com.crm.medicare.repository.ImagingSeriesRepository;
import com.crm.medicare.repository.ImagingStudyRepository;
import java.util.ArrayList;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class ImagingService {

    private final ImagingStudyRepository studyRepository;
    private final ImagingSeriesRepository seriesRepository;
    private final ImagingInstanceRepository instanceRepository;
    private final ExamenRepository examenRepository;
    /** Stub PACS (EmptyImagingProvider) — pas de fake UIDs. */
    private final ImagingProvider imagingProvider;

    @Transactional(readOnly = true)
    public List<ImagingStudyDto> listStudies(Long patientId) {
        if (patientId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "patientId obligatoire");
        }
        List<ImagingStudy> fromDb = studyRepository.findByPatientIdOrderByCreatedAtDesc(patientId);
        if (!fromDb.isEmpty()) {
            return fromDb.stream().map(this::toStudyDto).toList();
        }
        return imagingProvider.findStudiesByPatientId(patientId).stream().map(this::toStudyDto).toList();
    }

    @Transactional(readOnly = true)
    public List<ImagingSeriesDto> listSeries(Long studyId) {
        studyRepository
                .findById(studyId)
                .orElseThrow(() -> ApiException.notFound("Étude introuvable"));
        List<ImagingSeries> fromDb = seriesRepository.findByStudyIdOrderBySeriesNumberAscIdAsc(studyId);
        if (!fromDb.isEmpty()) {
            return fromDb.stream().map(this::toSeriesDto).toList();
        }
        return imagingProvider.findSeriesByStudyId(studyId).stream().map(this::toSeriesDto).toList();
    }

    @Transactional(readOnly = true)
    public List<ImagingInstanceDto> listInstances(Long seriesId) {
        seriesRepository
                .findById(seriesId)
                .orElseThrow(() -> ApiException.notFound("Série introuvable"));
        List<ImagingInstance> fromDb =
                instanceRepository.findBySeriesIdOrderByInstanceNumberAscIdAsc(seriesId);
        if (!fromDb.isEmpty()) {
            return fromDb.stream().map(this::toInstanceDto).toList();
        }
        return imagingProvider.findInstancesBySeriesId(seriesId).stream()
                .map(this::toInstanceDto)
                .toList();
    }

    /**
     * Façade viewer : métadonnées DB uniquement. Pas de placehold.co / UID inventés.
     * Sans étude → DTO vide (séries []).
     */
    @Transactional(readOnly = true)
    public ImagerieStudyDto studyForExamen(Long examenId) {
        Examen examen =
                examenRepository
                        .findByIdWithPatient(examenId)
                        .orElseThrow(
                                () ->
                                        new ResponseStatusException(
                                                HttpStatus.NOT_FOUND, "Examen introuvable"));

        ImagingStudy study =
                studyRepository
                        .findFirstByExamenId(examenId)
                        .or(() -> imagingProvider.findStudyByExamenId(examenId))
                        .orElse(null);

        Patient patient = examen.getPatient();
        if (study == null) {
            return ImagerieStudyDto.builder()
                    .examenId(String.valueOf(examenId))
                    .studyInstanceUID(null)
                    .patientName(patient != null ? patient.getNomComplet() : null)
                    .patientId(
                            patient != null
                                    ? (patient.getCin() != null
                                            ? patient.getCin()
                                            : String.valueOf(patient.getId()))
                                    : null)
                    .modality(examen.getModalite() != null ? examen.getModalite().name() : null)
                    .studyDescription(examen.getDescription())
                    .studyDate(null)
                    .numberOfImages(0)
                    .series(List.of())
                    .build();
        }

        List<ImagingSeries> seriesRows =
                seriesRepository.findByStudyIdOrderBySeriesNumberAscIdAsc(study.getId());
        List<ImagerieSeriesDto> seriesDtos = new ArrayList<>();
        for (ImagingSeries s : seriesRows) {
            List<ImagingInstance> instances =
                    instanceRepository.findBySeriesIdOrderByInstanceNumberAscIdAsc(s.getId());
            List<ImagerieImageDto> images =
                    instances.stream()
                            .map(
                                    i ->
                                            ImagerieImageDto.builder()
                                                    .instanceNumber(
                                                            i.getInstanceNumber() != null
                                                                    ? i.getInstanceNumber()
                                                                    : 0)
                                                    .sopInstanceUID(i.getSopInstanceUid())
                                                    .url(i.getWadoUri())
                                                    .build())
                            .toList();
            seriesDtos.add(
                    ImagerieSeriesDto.builder()
                            .seriesInstanceUID(s.getSeriesInstanceUid())
                            .seriesDescription(s.getSeriesDescription())
                            .modality(s.getModality())
                            .numberOfInstances(
                                    s.getNumberOfInstances() > 0
                                            ? s.getNumberOfInstances()
                                            : images.size())
                            .thumbnailUrl(s.getThumbnailUrl())
                            .images(images)
                            .build());
        }

        return ImagerieStudyDto.builder()
                .examenId(String.valueOf(examenId))
                .studyInstanceUID(study.getStudyInstanceUid())
                .patientName(patient != null ? patient.getNomComplet() : null)
                .patientId(
                        patient != null
                                ? (patient.getCin() != null
                                        ? patient.getCin()
                                        : String.valueOf(patient.getId()))
                                : null)
                .modality(study.getModality())
                .studyDescription(study.getStudyDescription())
                .studyDate(study.getStudyDate())
                .numberOfImages(study.getNumberOfImages())
                .series(seriesDtos)
                .build();
    }

    private ImagingStudyDto toStudyDto(ImagingStudy s) {
        return ImagingStudyDto.builder()
                .id(s.getId())
                .patientId(s.getPatient() != null ? s.getPatient().getId() : null)
                .examenId(s.getExamenId())
                .studyInstanceUid(s.getStudyInstanceUid())
                .modality(s.getModality())
                .studyDescription(s.getStudyDescription())
                .studyDate(s.getStudyDate())
                .numberOfImages(s.getNumberOfImages())
                .build();
    }

    private ImagingSeriesDto toSeriesDto(ImagingSeries s) {
        return ImagingSeriesDto.builder()
                .id(s.getId())
                .studyId(s.getStudy() != null ? s.getStudy().getId() : null)
                .seriesInstanceUid(s.getSeriesInstanceUid())
                .seriesDescription(s.getSeriesDescription())
                .modality(s.getModality())
                .numberOfInstances(s.getNumberOfInstances())
                .thumbnailUrl(s.getThumbnailUrl())
                .build();
    }

    private ImagingInstanceDto toInstanceDto(ImagingInstance i) {
        return ImagingInstanceDto.builder()
                .id(i.getId())
                .seriesId(i.getSeries() != null ? i.getSeries().getId() : null)
                .sopInstanceUid(i.getSopInstanceUid())
                .instanceNumber(i.getInstanceNumber())
                .wadoUri(i.getWadoUri())
                .build();
    }
}
