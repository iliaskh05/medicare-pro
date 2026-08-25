package com.crm.medicare.dto;

import java.math.BigDecimal;
import lombok.Data;

@Data
public class InsurancePlanWriteRequest {
    private Long providerId;
    private String code;
    private String libelle;
    private Boolean actif;
    /** Optional initial coverage rule (taux only). */
    private BigDecimal tauxPercent;
    private BigDecimal plafond;
    private Long catalogueId;
    private String modalite;
}
