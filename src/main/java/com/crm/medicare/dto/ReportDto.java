package com.crm.medicare.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReportDto {

    private String id;
    private String examenId;
    private String patientId;
    private String patientName;
    private String examLabel;
    private String status;
    private String radiologist;
    private String authorName;
    private Integer currentVersion;
    private String indication;
    private String technique;
    private String resultats;
    private String conclusion;
    private String body;
    private String texte;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime createdAt;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime validatedAt;
}
