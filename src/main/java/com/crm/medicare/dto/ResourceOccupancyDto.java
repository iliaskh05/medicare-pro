package com.crm.medicare.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ResourceOccupancyDto {

    private String id;
    private String code;
    private String libelle;
    private String modalite;
    private boolean actif;
    /** AVAILABLE | OCCUPIED | OUT_OF_SERVICE */
    private String status;
    private String currentPatient;
    private String currentPatientId;
    private String currentAppointmentId;
    private String currentExam;
    private String currentExamenId;
    private String startsAt;
    private String endsAt;
}
