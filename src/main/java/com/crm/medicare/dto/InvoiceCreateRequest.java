package com.crm.medicare.dto;

import java.math.BigDecimal;
import lombok.Data;

@Data
public class InvoiceCreateRequest {
    private Long patientId;
    private String patientName;
    private Long examenId;
    private String acte;
    private BigDecimal montant;
    private BigDecimal acompte;
    private BigDecimal remise;
    private String modePaiement;
    private String notes;
    private String idempotencyKey;
}
