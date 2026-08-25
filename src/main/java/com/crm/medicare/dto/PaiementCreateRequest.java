package com.crm.medicare.dto;

import java.math.BigDecimal;
import lombok.Data;

@Data
public class PaiementCreateRequest {
    private BigDecimal montant;
    private String mode;
}
