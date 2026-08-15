package com.crm.medicare.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDate;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "patients")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Patient {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "nom_complet")
    private String nomComplet;

    @Column(unique = true)
    private String cin;

    @Column(name = "date_naissance")
    private LocalDate dateNaissance;

    @Column(length = 1)
    private String sexe;

    private String telephone;

    private String email;

    private String mutuelle;

    @Column(name = "num_affiliation")
    private String numAffiliation;

    @Column(name = "medecin_traitant")
    private String medecinTraitant;

    private String ville;

    private String quartier;

    private String adresse;

    @Column(name = "prochain_rdv")
    private LocalDateTime prochainRdv;
}
