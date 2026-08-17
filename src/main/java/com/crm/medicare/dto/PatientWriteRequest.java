package com.crm.medicare.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PatientWriteRequest {

    private String nomComplet;

    private String nom;

    private String prenom;

    @NotBlank(message = "cin obligatoire")
    @Size(max = 32)
    private String cin;

    private String telephone;

    private String email;

    private String mutuelle;

    private String sexe;

    private String numAffiliation;

    private String medecinTraitant;

    private String ville;

    private String quartier;

    private String adresse;

    /** Alias UI : date de naissance ISO. */
    private String naissance;

    private LocalDate dateNaissance;

    private Integer age;

    private Boolean force;
}
