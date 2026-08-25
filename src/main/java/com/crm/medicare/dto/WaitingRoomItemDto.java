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
public class WaitingRoomItemDto {

    private String id;
    private String patient;
    private String patientId;
    private String examen;
    private String modalite;
    private String priorite;
    private String statut;
    private String workflowStatus;
    private String operateur;
    private Integer attenteMinutes;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime heurePrevue;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime heureArrivee;
}
