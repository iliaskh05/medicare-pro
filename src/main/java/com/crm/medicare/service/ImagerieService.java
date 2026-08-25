package com.crm.medicare.service;

import com.crm.medicare.dto.ImagerieStudyDto;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Façade legacy {@code /api/imagerie} — délègue à {@link ImagingService} (plus de placehold.co). */
@Service
@RequiredArgsConstructor
public class ImagerieService {

    private final ImagingService imagingService;

    @Transactional(readOnly = true)
    public ImagerieStudyDto getStudyForExamen(Long examenId) {
        return imagingService.studyForExamen(examenId);
    }
}
