package com.crm.medicare.dto;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.Map;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Statistiques agrégées du tableau de bord RadioCRM. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardStatsDto {

    private long totalExamens;
    private long examensAujourdhui;

    /**
     * Compteurs par libellé métier : {@code En attente}, {@code En cours}, {@code Terminé}.
     */
    @Builder.Default
    private Map<String, Long> repartitionStatuts = new LinkedHashMap<>();

    /** Somme des montants réellement renseignés des examens du mois, hors annulés. */
    private BigDecimal revenusEstimes;
}
