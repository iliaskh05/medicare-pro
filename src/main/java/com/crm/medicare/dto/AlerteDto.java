package com.crm.medicare.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Forme consommée par {@code fetchAlertes} / {@code Alerte}.
 * {@code niveau} ∈ critique | eleve | moyen
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AlerteDto {

    private String id;
    private String titre;
    private String detail;
    private String niveau;
    private String temps;
}
