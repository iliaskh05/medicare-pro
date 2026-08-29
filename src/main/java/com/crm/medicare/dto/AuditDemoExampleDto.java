package com.crm.medicare.dto;

import java.util.List;
import lombok.Builder;
import lombok.Data;

/** Description d'un scénario de démonstration (aperçu UI). */
@Data
@Builder
public class AuditDemoExampleDto {
    private String id;
    private String title;
    private String summary;
    private int expectedScore;
    private String niveau;
    private List<String> signals;
    private String patient;
    private String acte;
}
