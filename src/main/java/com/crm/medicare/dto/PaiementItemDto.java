package com.crm.medicare.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class PaiementItemDto {
    private Long id;
    private BigDecimal montant;
    private String mode;
    private LocalDateTime createdAt;
    private String createdBy;
}
