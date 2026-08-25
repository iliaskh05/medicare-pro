package com.crm.medicare.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import java.math.BigDecimal;
import java.time.LocalDateTime;
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
public class InvoiceDto {
    private String id;
    private String reference;
    private String patientId;
    private String patient;
    private String patientName;
    private String examen;
    private String acte;
    private String statut;
    private String status;
    private BigDecimal total;
    private BigDecimal amountPaid;
    private BigDecimal amountRefunded;
    private BigDecimal reste;
    private BigDecimal partMutuelle;
    private BigDecimal resteACharge;
    private BigDecimal insuranceShare;
    private BigDecimal patientShare;
    private BigDecimal remise;
    private String modePaiement;
    private String paiement;
    private String date;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime createdAt;

    @Builder.Default
    private List<InvoiceItemDto> items = new ArrayList<>();
}
