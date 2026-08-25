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
public class AppointmentDto {

    private String id;
    private String patientId;
    private String patient;
    private String catalogueId;
    private String examenLibelle;
    private String resourceId;
    private String resourceCode;
    private String resourceLibelle;
    private String salle;
    private String modalite;
    private String prescripteurId;
    private String prescripteur;
    private String examenId;
    private String statut;
    private String priorite;
    private int dureeMinutes;
    private String motif;
    private String notes;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime startsAt;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime endsAt;
}
