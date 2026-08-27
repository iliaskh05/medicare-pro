package com.crm.medicare.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AssistantChatRequest {

    @NotBlank
    @Size(max = 2000)
    private String message;

    /** Route UI courante, ex. /patients */
    @Size(max = 200)
    private String pathname;

    /** Rôle UI : directeur | accueil | technicien | medecin */
    @Size(max = 40)
    private String role;
}
