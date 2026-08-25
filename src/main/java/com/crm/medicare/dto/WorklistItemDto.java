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

    private String patientId;

    private String patient;

    private String cin;

    private String telephone;

    private Integer age;

    private String sexe;

    private String medecin;

    /** Stable radiologist user id (filter by this, not display name). */
    private String radiologueId;

    private String resourceId;

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

    private BigDecimal acompte;

    private BigDecimal reste;

    private Long catalogueId;

    private String dossierStatut;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime dossierRemisAt;

    private String dossierRemisPar;

    private String priorite;

    private String indication;

    private String technique;

    private String resultats;

    private String conclusion;

    private Boolean passageSansRdv;

    private String compteRendu;

    @Builder.Default
    private List<HistoriqueItemDto> historique = new ArrayList<>();
}
