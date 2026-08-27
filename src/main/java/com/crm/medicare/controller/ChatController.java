package com.crm.medicare.controller;

import com.crm.medicare.dto.ChatChannelDto;
import com.crm.medicare.dto.ChatMessageCreateRequest;
import com.crm.medicare.dto.ChatMessageDto;
import com.crm.medicare.security.PermissionCatalog;
import com.crm.medicare.service.ChatService;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
public class ChatController {

    private final ChatService chatService;

    @GetMapping({"/api/chat/channels", "/api/v1/chat/channels"})
    @PreAuthorize("hasAuthority('" + PermissionCatalog.CHAT_READ + "')")
    public List<ChatChannelDto> channels() {
        return chatService.listChannels();
    }

    @GetMapping({
        "/api/chat/channels/{channelId}/messages",
        "/api/v1/chat/channels/{channelId}/messages"
    })
    @PreAuthorize("hasAuthority('" + PermissionCatalog.CHAT_READ + "')")
    public List<ChatMessageDto> messages(@PathVariable String channelId) {
        return chatService.listMessages(channelId);
    }

    @PostMapping({
        "/api/chat/channels/{channelId}/messages",
        "/api/v1/chat/channels/{channelId}/messages"
    })
    @PreAuthorize("hasAuthority('" + PermissionCatalog.CHAT_WRITE + "')")
    public ChatMessageDto post(
            @PathVariable String channelId, @Valid @RequestBody ChatMessageCreateRequest request) {
        return chatService.postMessage(channelId, request);
    }
}
