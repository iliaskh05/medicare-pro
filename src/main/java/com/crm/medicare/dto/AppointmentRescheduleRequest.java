package com.crm.medicare.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AppointmentRescheduleRequest {

    private String dateHeure;
    private Integer dureeMinutes;
    private Long resourceId;
    private String note;
}
