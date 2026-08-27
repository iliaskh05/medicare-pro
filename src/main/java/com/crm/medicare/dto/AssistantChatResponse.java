package com.crm.medicare.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AssistantChatResponse {

    private String text;
    private String intent;
    /** true si la réponse vient de Gemini ; false si moteur local / erreur. */
    private boolean gemini;
}
