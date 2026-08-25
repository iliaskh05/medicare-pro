package com.crm.medicare.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import lombok.Data;

@Data
public class CatalogueExamenWriteRequest {
    private String nom;
    private String code;
    private String modalite;
    private String categorie;
    private String bodyRegion;
    private Integer dureeMinutes;
    private BigDecimal prix;
    private String currency;
    private BigDecimal nationalReferencePrice;
    private String referenceSource;
    private LocalDate referenceDate;
    private Boolean marketIndicative;
    private Boolean contrastRequired;
    private String contrastType;
    private Boolean sedationRequired;
    private String description;
    private String preparation;
    private Boolean actif;
}
