package com.crm.medicare.dto;

import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Métadonnées DICOM simulées (PACS stub) pour la visionneuse. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ImagerieStudyDto {

    private String examenId;
    private String studyInstanceUID;
    private String patientName;
    private String patientId;
    private String modality;
    private String studyDescription;
    private String studyDate;
    private int numberOfImages;
    private List<ImagerieSeriesDto> series;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ImagerieSeriesDto {
        private String seriesInstanceUID;
        private String seriesDescription;
        private String modality;
        private int numberOfInstances;
        private String thumbnailUrl;
        private List<ImagerieImageDto> images;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ImagerieImageDto {
        private int instanceNumber;
        private String sopInstanceUID;
        private String url;
    }
}
