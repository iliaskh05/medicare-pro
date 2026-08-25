package com.crm.medicare.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AppointmentWriteRequest {

    private Long patientId;
    private Long catalogueId;
    private Long resourceId;
    private Long prescripteurId;
    /** ISO local datetime YYYY-MM-DDTHH:mm */
    private String dateHeure;
    private Integer dureeMinutes;
    private String modalite;
    private String priorite;
    private String motif;
    private String notes;
    private String salle;
}
