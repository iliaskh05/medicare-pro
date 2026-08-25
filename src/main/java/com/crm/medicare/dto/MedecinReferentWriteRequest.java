package com.crm.medicare.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MedecinReferentWriteRequest {
    private String nom;
    private String telephone;
    private String email;
    private String specialite;
    private String adresse;
    private String ville;
    private String quartier;
    private String etablissement;
    private Boolean actif;
}
