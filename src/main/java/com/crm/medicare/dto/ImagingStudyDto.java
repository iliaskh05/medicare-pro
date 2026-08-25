package com.crm.medicare.dto;

import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ImagingStudyDto {
    private Long id;
    private Long patientId;
    private Long examenId;
    private String studyInstanceUid;
    private String modality;
    private String studyDescription;
    private String studyDate;
    private int numberOfImages;
}

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
class ImagingSeriesDtoMarker {
    private Long id;
}
