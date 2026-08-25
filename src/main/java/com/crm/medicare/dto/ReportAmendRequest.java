package com.crm.medicare.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ReportAmendRequest {

    private String reason;
    private String indication;
    private String technique;
    private String resultats;
    private String conclusion;
    private String body;
    private String texte;
}
