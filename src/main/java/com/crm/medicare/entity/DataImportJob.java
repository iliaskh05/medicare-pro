package com.crm.medicare.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "data_import_jobs")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DataImportJob {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 512)
    private String filename;

    @Column(name = "import_type", nullable = false, length = 64)
    private String importType;

    @Column(name = "import_mode", nullable = false, length = 32)
    private String importMode = "INITIALIZATION";

    @Column(nullable = false, length = 32)
    private String status;

    @Column(name = "rows_total", nullable = false)
    private int rowsTotal;

    @Column(name = "rows_valid", nullable = false)
    private int rowsValid;

    @Column(name = "rows_imported", nullable = false)
    private int rowsImported;

    @Column(name = "rows_rejected", nullable = false)
    private int rowsRejected;

    @Column(name = "error_summary", columnDefinition = "TEXT")
    private String errorSummary;

    @Column(name = "created_by_id")
    private Long createdById;

    @Column(name = "created_by_name")
    private String createdByName;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @PrePersist
    void prePersist() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
}
