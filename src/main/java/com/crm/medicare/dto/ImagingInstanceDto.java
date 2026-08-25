package com.crm.medicare.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ImagingInstanceDto {
    private Long id;
    private Long seriesId;
    private String sopInstanceUid;
    private Integer instanceNumber;
    private String wadoUri;
}
