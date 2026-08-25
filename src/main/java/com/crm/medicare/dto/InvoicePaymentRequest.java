package com.crm.medicare.dto;

import java.math.BigDecimal;
import lombok.Data;

@Data
public class InvoicePaymentRequest {
    private BigDecimal montant;
    private String mode;
    private String idempotencyKey;
}
