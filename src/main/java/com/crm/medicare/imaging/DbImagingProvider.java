package com.crm.medicare.imaging;

import com.crm.medicare.entity.ImagingInstance;
import com.crm.medicare.entity.ImagingSeries;
import com.crm.medicare.entity.ImagingStudy;
import com.crm.medicare.repository.ImagingInstanceRepository;
import com.crm.medicare.repository.ImagingSeriesRepository;
import com.crm.medicare.repository.ImagingStudyRepository;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * Lit les métadonnées DICOM depuis PostgreSQL ({@code imaging_studies}…).
 * Aucune image inventée — si la table est vide, le viewer reste vide.
 */
@Component
@ConditionalOnProperty(name = "radiocrm.imaging.provider", havingValue = "db")
@RequiredArgsConstructor
public class DbImagingProvider implements ImagingProvider {

    private final ImagingStudyRepository studyRepository;
    private final ImagingSeriesRepository seriesRepository;
    private final ImagingInstanceRepository instanceRepository;

    @Override
    public List<ImagingStudy> findStudiesByPatientId(Long patientId) {
        return studyRepository.findByPatientIdOrderByCreatedAtDesc(patientId);
    }

    @Override
    public Optional<ImagingStudy> findStudyById(Long studyId) {
        return studyRepository.findByIdWithPatient(studyId);
    }

    @Override
    public Optional<ImagingStudy> findStudyByExamenId(Long examenId) {
        return studyRepository.findFirstByExamenId(examenId);
    }

    @Override
    public List<ImagingSeries> findSeriesByStudyId(Long studyId) {
        return seriesRepository.findByStudyIdOrderBySeriesNumberAscIdAsc(studyId);
    }

    @Override
    public List<ImagingInstance> findInstancesBySeriesId(Long seriesId) {
        return instanceRepository.findBySeriesIdOrderByInstanceNumberAscIdAsc(seriesId);
    }
}
