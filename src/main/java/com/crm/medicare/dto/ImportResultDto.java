package com.crm.medicare.dto;

import java.util.ArrayList;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ImportResultDto {
    private Long jobId;
    private String mode;
    private String filename;
    private String status;
    private int rowsTotal;
    private int rowsValid;
    private int rowsImported;
    private int rowsRejected;
    @Builder.Default
    private List<ImportRowError> errors = new ArrayList<>();
}
