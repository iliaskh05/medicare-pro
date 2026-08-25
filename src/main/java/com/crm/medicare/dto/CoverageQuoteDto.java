package com.crm.medicare.dto;

import java.math.BigDecimal;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CoverageQuoteDto {
    private BigDecimal tauxPercent;
    private BigDecimal plafond;
    /** Part patient estimée (total − part assurance), jamais inventée hors règles DB. */
    private BigDecimal patientShareHint;
}
