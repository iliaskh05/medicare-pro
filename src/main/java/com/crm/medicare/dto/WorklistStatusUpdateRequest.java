package com.crm.medicare.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class WorklistStatusUpdateRequest {

    private String nouveauStatut;
}
