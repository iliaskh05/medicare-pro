package com.crm.medicare.dto;

import java.time.LocalDateTime;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class DocumentItemDto {
    private Long id;
    private Long examenId;
    private Long patientId;
    private String type;
    private String nomOriginal;
    private String contentType;
    private Long taille;
    private LocalDateTime createdAt;
    private String createdBy;
}
