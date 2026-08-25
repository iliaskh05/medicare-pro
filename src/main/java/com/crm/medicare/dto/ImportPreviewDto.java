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
public class ImportPreviewDto {
    private String mode;
    private String filename;
    private int rowsTotal;
    private int rowsValid;
    private int rowsInvalid;
    @Builder.Default
    private List<ImportRowError> errors = new ArrayList<>();
}
