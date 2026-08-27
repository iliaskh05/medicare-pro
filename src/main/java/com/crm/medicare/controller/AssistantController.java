package com.crm.medicare.controller;

import com.crm.medicare.dto.AssistantChatRequest;
import com.crm.medicare.dto.AssistantChatResponse;
import com.crm.medicare.service.GeminiAssistantService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
public class AssistantController {

    private final GeminiAssistantService geminiAssistantService;

    @PostMapping({"/api/assistant/chat", "/api/v1/assistant/chat"})
    @PreAuthorize("isAuthenticated()")
    public AssistantChatResponse chat(@Valid @RequestBody AssistantChatRequest request) {
        return geminiAssistantService.chat(request);
    }
}
