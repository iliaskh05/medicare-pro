package com.crm.medicare.dto;

import java.math.BigDecimal;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class AuditKpisDto {
    private long dossiersAnalyses;
    private double dossiersAnalysesDelta;
    private double tauxConformite;
    private double tauxConformiteDelta;
    private BigDecimal montantEnJeu;
}
