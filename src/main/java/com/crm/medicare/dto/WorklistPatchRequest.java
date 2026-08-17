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
}
