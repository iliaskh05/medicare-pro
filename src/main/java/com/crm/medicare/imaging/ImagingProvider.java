package com.crm.medicare.imaging;

import com.crm.medicare.entity.ImagingInstance;
import com.crm.medicare.entity.ImagingSeries;
import com.crm.medicare.entity.ImagingStudy;
import java.util.List;
import java.util.Optional;

/** Abstraction PACS / viewer — métadonnées uniquement. */
public interface ImagingProvider {

    List<ImagingStudy> findStudiesByPatientId(Long patientId);

    Optional<ImagingStudy> findStudyById(Long studyId);

    Optional<ImagingStudy> findStudyByExamenId(Long examenId);

    List<ImagingSeries> findSeriesByStudyId(Long studyId);

    List<ImagingInstance> findInstancesBySeriesId(Long seriesId);
}
