package com.crm.medicare.entity;

import com.crm.medicare.workflow.EncounterStatus;
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
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
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
@EqualsAndHashCode(exclude = {"patient", "prescripteur", "historique", "statusHistory", "createdBy", "resource", "assignedRadiologue", "catalogue"})
@ToString(exclude = {"patient", "prescripteur", "historique", "statusHistory", "createdBy", "resource", "assignedRadiologue", "catalogue"})
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

    /** Canonical room/machine link — prefer over free-text {@link #salle}. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "resource_id")
    private ResourceRoom resource;

    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Modalite modalite;

    @Enumerated(EnumType.STRING)
    @Column(name = "etat_patient", nullable = false)
    private EtatPatient etatPatient;

    @Enumerated(EnumType.STRING)
    @Column(name = "workflow_status", nullable = false, length = 32)
    private EncounterStatus workflowStatus;

    @Column(nullable = false, length = 16)
    private String priorite;

    @Column(name = "exam_type_code", length = 64)
    private String examTypeCode;

    @Enumerated(EnumType.STRING)
    @Column(name = "statut_cr", nullable = false)
    private StatutCr statutCr;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Paiement paiement;

    @Column(precision = 10, scale = 2)
    private BigDecimal montant;

    @Column(precision = 10, scale = 2, nullable = false)
    private BigDecimal acompte = BigDecimal.ZERO;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "catalogue_id")
    private CatalogueExamen catalogue;

    @Column(name = "dossier_statut", nullable = false, length = 32)
    private String dossierStatut = "a_preparer";

    @Column(name = "dossier_remis_at")
    private LocalDateTime dossierRemisAt;

    @Column(name = "dossier_remis_par")
    private String dossierRemisPar;

    @Column(columnDefinition = "TEXT")
    private String indication;

    @Column(columnDefinition = "TEXT")
    private String technique;

    @Column(columnDefinition = "TEXT")
    private String resultats;

    @Column(columnDefinition = "TEXT")
    private String conclusion;

    @Column(name = "passage_sans_rdv", nullable = false)
    private boolean passageSansRdv = false;

    @Column(name = "arrived_at")
    private LocalDateTime arrivedAt;

    @Column(name = "started_at")
    private LocalDateTime startedAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @Column(name = "promised_at")
    private LocalDateTime promisedAt;

    @Column(name = "weight_kg", precision = 6, scale = 2)
    private java.math.BigDecimal weightKg;

    @Column(name = "height_cm", precision = 6, scale = 2)
    private java.math.BigDecimal heightCm;

    @Column(name = "general_anesthesia", nullable = false)
    private boolean generalAnesthesia = false;

    @Column(nullable = false)
    private boolean inpatient = false;

    @Column(nullable = false)
    private boolean urgent = false;

    @Column(name = "technologist_name", length = 120)
    private String technologistName;

    @Column(name = "nurse_name", length = 120)
    private String nurseName;

    @Column(name = "assistant_name", length = 120)
    private String assistantName;

    @Column(name = "parent_examen_id")
    private Long parentExamenId;

    @Column(name = "compte_rendu", columnDefinition = "TEXT")
    private String compteRendu;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by_id")
    private Utilisateur createdBy;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_radiologue_id")
    private Utilisateur assignedRadiologue;

    @Column(name = "cancelled_at")
    private LocalDateTime cancelledAt;

    @Version
    @Column(nullable = false)
    private Integer version;

    @OneToMany(mappedBy = "examen", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("date ASC")
    private List<HistoriqueExamen> historique = new ArrayList<>();

    @OneToMany(mappedBy = "examen", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("createdAt ASC")
    private List<ExamStatusHistory> statusHistory = new ArrayList<>();

    @PrePersist
    void prePersist() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (workflowStatus == null) {
            workflowStatus = EncounterStatus.SCHEDULED;
        }
        if (priorite == null) {
            priorite = "ROUTINE";
        }
        if (acompte == null) {
            acompte = BigDecimal.ZERO;
        }
        if (dossierStatut == null || dossierStatut.isBlank()) {
            dossierStatut = "a_preparer";
        }
        if (version == null) {
            version = 0;
        }
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
