package com.crm.medicare.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ImagingSeriesDto {
    private Long id;
    private Long studyId;
    private String seriesInstanceUid;
    private String seriesDescription;
    private String modality;
    private int numberOfInstances;
    private String thumbnailUrl;
}
