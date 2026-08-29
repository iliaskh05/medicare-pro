package com.crm.medicare.dto;

import java.math.BigDecimal;
import lombok.Builder;
import lombok.Data;

/** Compat dashboard caisse — GET /api/audit/fraude/anomalies */
@Data
@Builder
public class AnomalieCaisseCompatDto {
    private long totalAnomalies;
    private double scoreRisqueMoyen;
    private long alertesCritiques;
    private long alertesMoyennes;
    private long alertesFaibles;
    private double delaiReglementMinutes;
    private double tauxRemise;
    private String annulationPostActe;
    private double seuilDelaiMinutes;
    private double seuilRemise;
    private String guichet;
    private Integer scoreRisque;
    private String message;
    private String generatedAt;
}
