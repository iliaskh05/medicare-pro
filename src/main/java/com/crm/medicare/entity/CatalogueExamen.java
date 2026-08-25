package com.crm.medicare.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "catalogue_examens")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CatalogueExamen {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String nom;

    private String code;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private Modalite modalite;

    private String categorie;

    @Column(name = "body_region", length = 64)
    private String bodyRegion;

    @Column(name = "duree_minutes")
    private Integer dureeMinutes;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal prix = BigDecimal.ZERO;

    @Column(nullable = false, length = 8)
    private String currency = "MAD";

    /** Optional national/reference tariff — leave null if not verified. */
    @Column(name = "national_reference_price", precision = 10, scale = 2)
    private BigDecimal nationalReferencePrice;

    @Column(name = "reference_source", length = 128)
    private String referenceSource;

    @Column(name = "reference_date")
    private LocalDate referenceDate;

    /** True when prix is a market demo baseline (not contractual centre tariff). */
    @Column(name = "market_indicative", nullable = false)
    private boolean marketIndicative = true;

    @Column(name = "contrast_required", nullable = false)
    private boolean contrastRequired = false;

    @Column(name = "contrast_type", length = 64)
    private String contrastType;

    @Column(name = "sedation_required", nullable = false)
    private boolean sedationRequired = false;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(columnDefinition = "TEXT")
    private String preparation;

    @Column(nullable = false)
    private boolean actif = true;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    void prePersist() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (prix == null) {
            prix = BigDecimal.ZERO;
        }
        if (currency == null || currency.isBlank()) {
            currency = "MAD";
        }
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
