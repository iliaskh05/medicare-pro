package com.crm.medicare.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Corps de {@code POST /api/worklist} — création patient + examen en une passe.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class WorklistCreateRequest {

    private String nom;

    private String prenom;

    private String cin;

    /** Date de naissance ISO {@code YYYY-MM-DD}. */
    private String naissance;

    private String sexe;

    private String telephone;

    /** Libellé de l'acte (ex. {@code IRM Lombaire}). */
    private String typeExamen;

    private String modalite;

    private String salle;

    /** Id ressource (salle/machine) — source de vérité DB. */
    private Long resourceId;

    /** Date/heure de l'examen — accepte {@code YYYY-MM-DDTHH:mm} ou avec secondes. */
    private String dateHeure;

    private String prescripteurId;

    private String prescripteurNom;

    /** Id patient existant — évite un second upsert si le dossier est déjà ouvert. */
    private Long patientId;

    /** Acte du catalogue (prix / durée / modalité). */
    private Long catalogueId;

    /** true = admission immédiate (état arrive), false = rendez-vous (état attendu). */
    private Boolean passageSansRdv;

    private java.math.BigDecimal acompte;

    private String priorite;
}
