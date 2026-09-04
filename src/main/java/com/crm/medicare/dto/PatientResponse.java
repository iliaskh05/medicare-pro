package com.crm.medicare.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PatientResponse {

    private Long id;
    private String nomComplet;
    private String nom;
    private String prenom;
    private String cin;
    private String numeroDossier;
    private Integer age;
    private String telephone;
    private String mutuelle;
    private String email;
    private String sexe;
    private String numAffiliation;
    private String medecinTraitant;
    private String ville;
    private String quartier;
    private String adresse;
    private String titre;
    private String telephoneDomicile;
    private String telephoneTravail;
    private String fax;
    private String pays;
    private String conventionType;
    private Boolean vip;
    private Boolean pacemaker;
    private Boolean pregnant;
    private Boolean contrastAllergy;
    private String medicalAlerts;
    private LocalDate dateNaissance;
    private LocalDateTime prochainRdv;
    private List<DuplicateWarning> duplicateWarnings;

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class DuplicateWarning {
        private Long patientId;
        private String numeroDossier;
        private String reason;
        private String nomComplet;
    }
}
