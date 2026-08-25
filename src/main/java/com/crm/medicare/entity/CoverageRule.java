package com.crm.medicare.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "coverage_rules")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CoverageRule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "plan_id", nullable = false)
    private InsurancePlan plan;

    @Column(name = "taux_percent", nullable = false, precision = 5, scale = 2)
    private BigDecimal tauxPercent = BigDecimal.ZERO;

    @Column(precision = 12, scale = 2)
    private BigDecimal plafond;

    @Column(length = 32)
    private String modalite;

    @Column(name = "catalogue_id")
    private Long catalogueId;
}
