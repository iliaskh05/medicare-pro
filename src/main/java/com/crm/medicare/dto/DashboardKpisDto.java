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
    private long patientsSemaine;
    private long patientsMois;
    private long actesRealises;
    /** CA du mois (rétrocompat FE). */
    private BigDecimal chiffreAffaires;
    private BigDecimal chiffreAffairesJour;
    private BigDecimal chiffreAffairesSemaine;
    private BigDecimal chiffreAffairesMois;
    private BigDecimal chiffreAffairesAnnee;
    private int tauxOccupation;
    /** Minutes ; {@code null} si aucun {@code arrived_at} exploitable. */
    private Double tempsAttenteMoyenMinutes;
}
