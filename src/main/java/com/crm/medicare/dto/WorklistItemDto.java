package com.crm.medicare.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Objet Worklist exposé au frontend — clés JSON strictement alignées sur le contrat.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WorklistItemDto {

    private String id;

    private String numSejour;

    private String patient;

    private String cin;

    private String telephone;

    private Integer age;

    private String sexe;

    private String medecin;

    private String prescripteur;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime dateExamen;

    private String salle;

    private String description;

    private String modalite;

    private String etatPatient;

    private String statutCr;

    private String paiement;

    private BigDecimal montant;

    private String compteRendu;

    @Builder.Default
    private List<HistoriqueItemDto> historique = new ArrayList<>();
}
