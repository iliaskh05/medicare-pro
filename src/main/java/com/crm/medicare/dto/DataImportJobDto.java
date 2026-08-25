package com.crm.medicare.dto;

import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DataImportJobDto {
    private Long id;
    private String filename;
    private String importType;
    private String importMode;
    private String status;
    private int rowsTotal;
    private int rowsValid;
    private int rowsImported;
    private int rowsRejected;
    private String errorSummary;
    private Long createdById;
    private String createdByName;
    private LocalDateTime createdAt;
    private LocalDateTime completedAt;
}
