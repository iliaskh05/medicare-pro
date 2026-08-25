package com.crm.medicare.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.crm.medicare.dto.DemoDatasetStatusDto;
import com.crm.medicare.repository.DemoDatasetMarkerRepository;
import com.crm.medicare.repository.PatientRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class DemoDatasetServiceTest {

    @Autowired private DemoDatasetService demoDatasetService;
    @Autowired private DemoDatasetMarkerRepository markerRepository;
    @Autowired private PatientRepository patientRepository;

    @Test
    void loadThenStatusLoadedThenResetClears() {
        DemoDatasetStatusDto before = demoDatasetService.status();
        assertThat(before.isLoaded()).isFalse();

        DemoDatasetStatusDto loaded = demoDatasetService.load(false);
        assertThat(loaded.isLoaded()).isTrue();
        assertThat(loaded.getTotalMarkers()).isGreaterThan(0);
        assertThat(patientRepository.findByCinIgnoreCaseAndDeletedAtIsNull("DEMO-CIN-001")).isPresent();
        assertThat(patientRepository.findByCinIgnoreCaseAndDeletedAtIsNull("DEMO-CIN-002")).isPresent();
        assertThat(patientRepository.findByCinIgnoreCaseAndDeletedAtIsNull("DEMO-CIN-003")).isPresent();

        DemoDatasetStatusDto cleared = demoDatasetService.reset();
        assertThat(cleared.isLoaded()).isFalse();
        assertThat(cleared.getTotalMarkers()).isZero();
        assertThat(markerRepository.count()).isZero();
        assertThat(patientRepository.findByCinIgnoreCaseAndDeletedAtIsNull("DEMO-CIN-001")).isEmpty();
    }
}
