package com.crm.medicare.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Forme consommée par {@code fetchSalleAttente} / {@code SalleAttente}.
 * {@code statut} ∈ En attente | En cours | Préparation
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SalleAttenteDto {

    private String heure;
    private String patient;
    private String examen;
    private String medecin;
    private String statut;
}
