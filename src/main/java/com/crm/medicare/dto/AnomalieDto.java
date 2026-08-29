package com.crm.medicare.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import lombok.Builder;
import lombok.Data;

/** Contrat frontend — module Audit (/audit). */
@Data
@Builder
public class AnomalieDto {
    private String id;
    private String patient;
    private String cin;
    private String acte;
    private String typeExamen;
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime date;
    private BigDecimal montant;
    private BigDecimal bareme;
    private int score;
    private List<String> motifs;
    private String cluster;
    private String prescripteur;
    private String mutuelle;
    private String statut;
}
