package com.crm.medicare.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class TendanceAnomalieDto {
    private String semaine;
    private long anomalies;
    private long confirmees;
}
