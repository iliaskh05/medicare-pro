package com.crm.medicare.dto;

import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PatientDuplicateMatch {

    private Long patientId;
    private double score;
    private List<String> champsIdentiques;
    private String nomComplet;
    private String numeroDossier;
}
