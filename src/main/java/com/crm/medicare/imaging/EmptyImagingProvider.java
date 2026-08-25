package com.crm.medicare.imaging;

import com.crm.medicare.entity.ImagingInstance;
import com.crm.medicare.entity.ImagingSeries;
import com.crm.medicare.entity.ImagingStudy;
import java.util.List;
import java.util.Optional;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * Provider sans données inventées — listes vides. Activé si {@code radiocrm.imaging.provider=empty}
 * (défaut) ; le bean DB {@link DbImagingProvider} prend le relais sinon.
 */
@Component
@ConditionalOnProperty(name = "radiocrm.imaging.provider", havingValue = "empty", matchIfMissing = true)
public class EmptyImagingProvider implements ImagingProvider {

    @Override
    public List<ImagingStudy> findStudiesByPatientId(Long patientId) {
        return List.of();
    }

    @Override
    public Optional<ImagingStudy> findStudyById(Long studyId) {
        return Optional.empty();
    }

    @Override
    public Optional<ImagingStudy> findStudyByExamenId(Long examenId) {
        return Optional.empty();
    }

    @Override
    public List<ImagingSeries> findSeriesByStudyId(Long studyId) {
        return List.of();
    }

    @Override
    public List<ImagingInstance> findInstancesBySeriesId(Long seriesId) {
        return List.of();
    }
}
