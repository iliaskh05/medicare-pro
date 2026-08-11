package com.crm.medicare.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "medecins_referents")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class MedecinReferent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "id_medecin_excel")
    private String idMedecinExcel;

    private String nom;

    private String telephone;

    private String email;

    private String specialite;

    private String adresse;

    private String ville;

    private String quartier;
}
