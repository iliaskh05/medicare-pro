package com.crm.medicare.dto;

import java.math.BigDecimal;
import lombok.Data;

@Data
public class InsuranceProviderWriteRequest {
    private String code;
    private String nom;
    private Boolean actif;
}

@Data
class InsuranceProviderWriteRequestMarker {}
