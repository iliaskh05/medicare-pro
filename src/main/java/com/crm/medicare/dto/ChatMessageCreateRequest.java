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
public class ChatMessageCreateRequest {

    /** Corps du message. L'auteur est toujours dérivé du JWT serveur. */
    @NotBlank
    @Size(max = 4000)
    private String body;
}
