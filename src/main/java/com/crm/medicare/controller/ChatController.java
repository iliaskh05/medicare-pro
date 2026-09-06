package com.crm.medicare.controller;

import com.crm.medicare.dto.ChatChannelDto;
import com.crm.medicare.dto.ChatDirectCreateRequest;
import com.crm.medicare.dto.ChatDirectoryUserDto;
import com.crm.medicare.dto.ChatMessageCreateRequest;
import com.crm.medicare.dto.ChatMessageDto;
import com.crm.medicare.security.PermissionCatalog;
import com.crm.medicare.service.ChatService;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequiredArgsConstructor
public class ChatController {

    private final ChatService chatService;

    @GetMapping({"/api/chat/channels", "/api/v1/chat/channels"})
    @PreAuthorize("hasAuthority('" + PermissionCatalog.CHAT_READ + "')")
    public List<ChatChannelDto> channels() {
        return chatService.listChannels();
    }

    @GetMapping({"/api/chat/directory", "/api/v1/chat/directory"})
    @PreAuthorize("hasAuthority('" + PermissionCatalog.CHAT_READ + "')")
    public List<ChatDirectoryUserDto> directory(@RequestParam(name = "q", defaultValue = "") String q) {
        return chatService.searchDirectory(q);
    }

    @PostMapping({"/api/chat/direct", "/api/v1/chat/direct"})
    @PreAuthorize("hasAuthority('" + PermissionCatalog.CHAT_WRITE + "')")
    public ChatChannelDto openDirect(@Valid @RequestBody ChatDirectCreateRequest request) {
        return chatService.openOrCreateDirect(request);
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

    @PostMapping(
            path = {
                "/api/chat/channels/{channelId}/messages/upload",
                "/api/v1/chat/channels/{channelId}/messages/upload"
            },
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAuthority('" + PermissionCatalog.CHAT_WRITE + "')")
    public ChatMessageDto upload(
            @PathVariable String channelId,
            @RequestPart("file") MultipartFile file,
            @RequestParam(value = "caption", required = false) String caption,
            @RequestParam(value = "durationSeconds", required = false) Integer durationSeconds) {
        return chatService.uploadMessage(channelId, file, caption, durationSeconds);
    }

    @PostMapping({
        "/api/chat/channels/{channelId}/read",
        "/api/v1/chat/channels/{channelId}/read"
    })
    @PreAuthorize("hasAuthority('" + PermissionCatalog.CHAT_READ + "')")
    public ResponseEntity<Void> markRead(@PathVariable String channelId) {
        chatService.markChannelRead(channelId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping({"/api/chat/files/{messageId}", "/api/v1/chat/files/{messageId}"})
    @PreAuthorize("hasAuthority('" + PermissionCatalog.CHAT_READ + "')")
    public ResponseEntity<Resource> file(@PathVariable Long messageId) {
        return chatService.downloadFile(messageId);
    }
}
