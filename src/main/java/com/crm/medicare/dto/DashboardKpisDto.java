package com.crm.medicare.dto;

import java.math.BigDecimal;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Forme consommée par {@code fetchDashboardKpis} / {@code DashboardKpis}.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardKpisDto {

    private long patientsDuJour;
    private long actesRealises;
    private BigDecimal chiffreAffaires;
    private int tauxOccupation;
}
