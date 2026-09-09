package com.crm.medicare.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.ToString;

@Entity
@Table(name = "invoice_items")
@Data
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(exclude = "invoice")
@ToString(exclude = "invoice")
public class InvoiceItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "invoice_id", nullable = false)
    private Invoice invoice;

    @Column(name = "examen_id")
    private Long examenId;

    @Column(name = "catalogue_id")
    private Long catalogueId;

    @Column(nullable = false, length = 512)
    private String label;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal quantity = BigDecimal.ONE;

    @Column(name = "unit_price", nullable = false, precision = 12, scale = 2)
    private BigDecimal unitPrice = BigDecimal.ZERO;

    @Column(name = "line_total", nullable = false, precision = 12, scale = 2)
    private BigDecimal lineTotal = BigDecimal.ZERO;

    @Column(length = 64)
    private String code;

    @Column(length = 32)
    private String modalite;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal discount = BigDecimal.ZERO;

    @Column(name = "vat_rate", nullable = false, precision = 5, scale = 2)
    private BigDecimal vatRate = BigDecimal.ZERO;

    @Column(name = "vat_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal vatAmount = BigDecimal.ZERO;

    @Column(name = "total_ht", nullable = false, precision = 12, scale = 2)
    private BigDecimal totalHt = BigDecimal.ZERO;

    @Column(name = "total_ttc", nullable = false, precision = 12, scale = 2)
    private BigDecimal totalTtc = BigDecimal.ZERO;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void prePersist() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (discount == null) discount = BigDecimal.ZERO;
        if (vatRate == null) vatRate = BigDecimal.ZERO;
        if (vatAmount == null) vatAmount = BigDecimal.ZERO;
        if (totalHt == null) totalHt = lineTotal != null ? lineTotal : BigDecimal.ZERO;
        if (totalTtc == null) totalTtc = lineTotal != null ? lineTotal : BigDecimal.ZERO;
    }
}
