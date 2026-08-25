package com.crm.medicare.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class WorklistPatchRequest {

    private String etatPatient;
    private String nouveauStatut;
    private String statutCr;
    private String paiement;
    private String dossierStatut;
    private java.math.BigDecimal acompte;
    private java.math.BigDecimal montant;
    private String priorite;
    private String indication;
    private String technique;
    private String resultats;
    private String conclusion;
}
