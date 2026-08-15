package com.crm.medicare.entity;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.ToString;

@Entity
@Table(name = "examens")
@Data
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(exclude = {"patient", "prescripteur", "historique"})
@ToString(exclude = {"patient", "prescripteur", "historique"})
public class Examen {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "num_sejour", unique = true, nullable = false)
    private String numSejour;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "patient_id", nullable = false)
    private Patient patient;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "prescripteur_id")
    private MedecinReferent prescripteur;

    @Column(name = "prescripteur_nom")
    private String prescripteurNom;

    /** Nom du radiologue exposé en JSON sous la clé {@code medecin}. */
    private String medecin;

    @Column(name = "date_examen", nullable = false)
    private LocalDateTime dateExamen;

    private String salle;

    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Modalite modalite;

    @Enumerated(EnumType.STRING)
    @Column(name = "etat_patient", nullable = false)
    private EtatPatient etatPatient;

    @Enumerated(EnumType.STRING)
    @Column(name = "statut_cr", nullable = false)
    private StatutCr statutCr;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Paiement paiement;

    @Column(precision = 10, scale = 2)
    private BigDecimal montant;

    @Column(name = "compte_rendu", columnDefinition = "TEXT")
    private String compteRendu;

    @OneToMany(mappedBy = "examen", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("date ASC")
    private List<HistoriqueExamen> historique = new ArrayList<>();
}
