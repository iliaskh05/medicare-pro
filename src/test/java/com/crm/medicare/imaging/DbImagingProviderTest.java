package com.crm.medicare.imaging;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import com.crm.medicare.entity.ImagingStudy;
import com.crm.medicare.entity.Patient;
import com.crm.medicare.repository.ImagingInstanceRepository;
import com.crm.medicare.repository.ImagingSeriesRepository;
import com.crm.medicare.repository.ImagingStudyRepository;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class DbImagingProviderTest {

    @Mock ImagingStudyRepository studyRepository;
    @Mock ImagingSeriesRepository seriesRepository;
    @Mock ImagingInstanceRepository instanceRepository;

    @InjectMocks DbImagingProvider provider;

    @Test
    void findStudiesByPatientIdDelegatesToRepositoryWithoutInventingRows() {
        Patient patient = new Patient();
        patient.setId(1L);
        ImagingStudy study = new ImagingStudy();
        study.setId(10L);
        study.setPatient(patient);
        study.setModality("CT");
        when(studyRepository.findByPatientIdOrderByCreatedAtDesc(1L)).thenReturn(List.of(study));
        when(studyRepository.findByPatientIdOrderByCreatedAtDesc(999L)).thenReturn(List.of());

        List<ImagingStudy> rows = provider.findStudiesByPatientId(1L);
        assertThat(rows).hasSize(1);
        assertThat(rows.get(0).getModality()).isEqualTo("CT");
        assertThat(provider.findStudiesByPatientId(999L)).isEmpty();
    }
}
