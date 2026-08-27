package com.crm.medicare.service;

import com.crm.medicare.dto.ChatChannelDto;
import com.crm.medicare.dto.ChatMessageCreateRequest;
import com.crm.medicare.dto.ChatMessageDto;
import com.crm.medicare.entity.ChatChannel;
import com.crm.medicare.entity.ChatMessage;
import com.crm.medicare.entity.Utilisateur;
import com.crm.medicare.repository.ChatChannelRepository;
import com.crm.medicare.repository.ChatMessageRepository;
import com.crm.medicare.security.SecurityUtils;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class ChatService {

    private static final int MAX_HISTORY = 500;
    private static final DateTimeFormatter ISO =
            DateTimeFormatter.ISO_OFFSET_DATE_TIME.withZone(ZoneOffset.UTC);

    private final ChatChannelRepository chatChannelRepository;
    private final ChatMessageRepository chatMessageRepository;

    @Transactional(readOnly = true)
    public List<ChatChannelDto> listChannels() {
        return chatChannelRepository.findAll().stream().map(this::toChannelDto).toList();
    }

    @Transactional(readOnly = true)
    public List<ChatMessageDto> listMessages(String channelId) {
        requireChannel(channelId);
        List<ChatMessage> all = chatMessageRepository.findByChannelIdOrdered(channelId);
        if (all.size() <= MAX_HISTORY) {
            return all.stream().map(this::toMessageDto).toList();
        }
        return all.subList(all.size() - MAX_HISTORY, all.size()).stream()
                .map(this::toMessageDto)
                .toList();
    }

    @Transactional
    public ChatMessageDto postMessage(String channelId, ChatMessageCreateRequest request) {
        ChatChannel channel = requireChannel(channelId);
        Utilisateur user = SecurityUtils.currentUserOrNull();
        if (user == null || user.getId() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentification requise");
        }

        String body = sanitizeBody(request != null ? request.getBody() : null);
        if (body.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Message vide");
        }
        if (body.length() > 4000) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Message trop long (max 4000)");
        }

        ChatMessage message =
                ChatMessage.builder()
                        .channel(channel)
                        .authorId(user.getId())
                        .authorName(resolveAuthorName(user))
                        .authorRole(user.getRole() != null ? user.getRole().name() : "STAFF")
                        .body(body)
                        .build();

        ChatMessage saved = chatMessageRepository.save(message);
        return toMessageDto(saved);
    }

    private ChatChannel requireChannel(String channelId) {
        if (channelId == null || channelId.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Canal invalide");
        }
        return chatChannelRepository
                .findById(channelId.trim())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Canal introuvable"));
    }

    private static String sanitizeBody(String raw) {
        if (raw == null) {
            return "";
        }
        // Normalise les retours ligne et coupe les espaces extrêmes (pas de HTML).
        String normalized = raw.replace("\r\n", "\n").replace('\r', '\n').trim();
        if (normalized.length() > 4000) {
            return normalized.substring(0, 4000);
        }
        return normalized;
    }

    private static String resolveAuthorName(Utilisateur user) {
        if (user.getNomComplet() != null && !user.getNomComplet().isBlank()) {
            return user.getNomComplet().trim();
        }
        if (user.getEmail() != null && !user.getEmail().isBlank()) {
            return user.getEmail().trim();
        }
        return "Utilisateur " + user.getId();
    }

    private ChatChannelDto toChannelDto(ChatChannel channel) {
        long members =
                chatMessageRepository.countDistinctAuthorsByChannelId(channel.getId());
        int count = channel.getMembersCount() != null ? channel.getMembersCount() : 0;
        if (members > count) {
            count = (int) Math.min(members, Integer.MAX_VALUE);
        }
        return ChatChannelDto.builder()
                .id(channel.getId())
                .name(channel.getName())
                .description(channel.getDescription() != null ? channel.getDescription() : "")
                .membersCount(count)
                .build();
    }

    private ChatMessageDto toMessageDto(ChatMessage message) {
        String channelId = message.getChannel() != null ? message.getChannel().getId() : null;
        String createdAt =
                message.getCreatedAt() != null
                        ? ISO.format(message.getCreatedAt().atZone(ZoneOffset.systemDefault()).toInstant())
                        : null;
        return ChatMessageDto.builder()
                .id(String.valueOf(message.getId()))
                .channelId(channelId)
                .authorId(String.valueOf(message.getAuthorId()))
                .authorName(message.getAuthorName())
                .authorRole(
                        message.getAuthorRole() != null
                                ? message.getAuthorRole().toLowerCase(Locale.ROOT)
                                : "staff")
                .body(message.getBody())
                .createdAt(createdAt)
                .build();
    }
}
