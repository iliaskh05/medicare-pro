package com.crm.medicare.entity;

import com.crm.medicare.workflow.InvoiceStatus;
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
@Table(name = "invoices")
@Data
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(exclude = {"patient", "items", "payments", "refunds"})
@ToString(exclude = {"patient", "items", "payments", "refunds"})
public class Invoice {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 64)
    private String reference;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "patient_id", nullable = false)
    private Patient patient;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private InvoiceStatus statut = InvoiceStatus.DRAFT;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal total = BigDecimal.ZERO;

    @Column(name = "amount_paid", nullable = false, precision = 12, scale = 2)
    private BigDecimal amountPaid = BigDecimal.ZERO;

    @Column(name = "amount_refunded", nullable = false, precision = 12, scale = 2)
    private BigDecimal amountRefunded = BigDecimal.ZERO;

    @Column(name = "insurance_share", nullable = false, precision = 12, scale = 2)
    private BigDecimal insuranceShare = BigDecimal.ZERO;

    @Column(name = "patient_share", nullable = false, precision = 12, scale = 2)
    private BigDecimal patientShare = BigDecimal.ZERO;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal remise = BigDecimal.ZERO;

    @Column(name = "mode_paiement", length = 32)
    private String modePaiement;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "created_by_id")
    private Long createdById;

    @Column(name = "created_by_name")
    private String createdByName;

    @Column(name = "issued_at")
    private LocalDateTime issuedAt;

    @Column(name = "cancelled_at")
    private LocalDateTime cancelledAt;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Version
    private Long version;

    @OneToMany(mappedBy = "invoice", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("id ASC")
    private List<InvoiceItem> items = new ArrayList<>();

    @OneToMany(mappedBy = "invoice", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("createdAt ASC")
    private List<InvoicePayment> payments = new ArrayList<>();

    @OneToMany(mappedBy = "invoice", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("createdAt ASC")
    private List<InvoiceRefund> refunds = new ArrayList<>();

    @PrePersist
    void prePersist() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (statut == null) {
            statut = InvoiceStatus.DRAFT;
        }
        zeroNulls();
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = LocalDateTime.now();
        zeroNulls();
    }

    private void zeroNulls() {
        if (total == null) total = BigDecimal.ZERO;
        if (amountPaid == null) amountPaid = BigDecimal.ZERO;
        if (amountRefunded == null) amountRefunded = BigDecimal.ZERO;
        if (insuranceShare == null) insuranceShare = BigDecimal.ZERO;
        if (patientShare == null) patientShare = BigDecimal.ZERO;
        if (remise == null) remise = BigDecimal.ZERO;
    }

    public BigDecimal reste() {
        return total.subtract(amountPaid).add(amountRefunded).max(BigDecimal.ZERO);
    }

    /** Remaining patient share after payments (insurance share is not cash payable). */
    public BigDecimal patientReste() {
        BigDecimal share = patientShare != null ? patientShare : total;
        return share.subtract(amountPaid).add(amountRefunded).max(BigDecimal.ZERO);
    }
}
