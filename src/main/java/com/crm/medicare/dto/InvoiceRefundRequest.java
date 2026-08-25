package com.crm.medicare.dto;

import java.math.BigDecimal;
import lombok.Data;

@Data
public class InvoiceRefundRequest {
    private BigDecimal montant;
    private String reason;
}
