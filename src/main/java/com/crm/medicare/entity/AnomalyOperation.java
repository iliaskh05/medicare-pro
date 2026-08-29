package com.crm.medicare.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "anomaly_operations")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AnomalyOperation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "operation_id", nullable = false, unique = true, length = 64)
    private String operationId;

    @Column(name = "invoice_id")
    private Long invoiceId;

    @Column(name = "examen_id")
    private Long examenId;

    @Column(name = "patient_id")
    private Long patientId;

    @Column(name = "operator_id")
    private Long operatorId;

    @Column(name = "anomaly_score", nullable = false)
    private Integer anomalyScore;

    @Column(nullable = false, length = 32)
    private String niveau;

    @Column(name = "cluster_id")
    private Integer clusterId;

    @Column(name = "cluster_distance", precision = 12, scale = 4)
    private BigDecimal clusterDistance;

    @Column(name = "isolation_anomaly", nullable = false)
    private boolean isolationAnomaly;

    @Column(name = "isolation_score", precision = 8, scale = 2)
    private BigDecimal isolationScore;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "triggered_rules", columnDefinition = "jsonb")
    @Builder.Default
    private List<String> triggeredRules = new ArrayList<>();

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    @Builder.Default
    private List<String> reasons = new ArrayList<>();

    @JdbcTypeCode(SqlTypes.JSON)
    private Map<String, Object> features;

    @Column(name = "model_version", length = 64)
    private String modelVersion;

    @Column(nullable = false, length = 32)
    @Builder.Default
    private String decision = "pending";

    @Column(name = "catalogue_price", precision = 12, scale = 2)
    private BigDecimal cataloguePrice;

    @Column(name = "billed_amount", precision = 12, scale = 2)
    private BigDecimal billedAmount;

    @Column(name = "discount_amount", precision = 12, scale = 2)
    private BigDecimal discountAmount;

    @Column(name = "reviewed_at")
    private LocalDateTime reviewedAt;

    @Column(name = "reviewed_by_id")
    private Long reviewedById;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    void prePersist() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (decision == null) {
            decision = "pending";
        }
        if (triggeredRules == null) {
            triggeredRules = new ArrayList<>();
        }
        if (reasons == null) {
            reasons = new ArrayList<>();
        }
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
