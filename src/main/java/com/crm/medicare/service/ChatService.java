package com.crm.medicare.service;

import com.crm.medicare.chat.ChatRealtimeHub;
import com.crm.medicare.dto.ChatChannelDto;
import com.crm.medicare.dto.ChatDirectCreateRequest;
import com.crm.medicare.dto.ChatDirectoryUserDto;
import com.crm.medicare.dto.ChatMessageCreateRequest;
import com.crm.medicare.dto.ChatMessageDto;
import com.crm.medicare.entity.ChatChannel;
import com.crm.medicare.entity.ChatChannelMember;
import com.crm.medicare.entity.ChatChannelRead;
import com.crm.medicare.entity.ChatChannelType;
import com.crm.medicare.entity.ChatMessage;
import com.crm.medicare.entity.ChatMessageType;
import com.crm.medicare.entity.Utilisateur;
import com.crm.medicare.repository.ChatChannelMemberRepository;
import com.crm.medicare.repository.ChatChannelReadRepository;
import com.crm.medicare.repository.ChatChannelRepository;
import com.crm.medicare.repository.ChatMessageRepository;
import com.crm.medicare.repository.UtilisateurRepository;
import com.crm.medicare.security.SecurityUtils;
import com.crm.medicare.storage.DocumentStorage;
import java.io.IOException;
import java.io.InputStream;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class ChatService {

    private static final int MAX_HISTORY = 500;
    private static final int MAX_DIRECTORY = 25;
    private static final Set<String> IMAGE_MIME =
            Set.of("image/jpeg", "image/png", "image/webp", "image/gif");
    private static final Set<String> PDF_MIME = Set.of("application/pdf");
    private static final Set<String> AUDIO_MIME =
            Set.of("audio/webm", "audio/ogg", "audio/mpeg", "audio/mp4", "audio/wav", "audio/x-wav");
    private static final DateTimeFormatter ISO =
            DateTimeFormatter.ISO_OFFSET_DATE_TIME.withZone(ZoneOffset.UTC);

    private final ChatChannelRepository chatChannelRepository;
    private final ChatChannelMemberRepository chatChannelMemberRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final ChatChannelReadRepository chatChannelReadRepository;
    private final UtilisateurRepository utilisateurRepository;
    private final DocumentStorage documentStorage;
    private final ChatRealtimeHub chatRealtimeHub;

    @Value("${radiocrm.chat.max-image-bytes:10485760}")
    private long maxImageBytes;

    @Value("${radiocrm.chat.max-pdf-bytes:20971520}")
    private long maxPdfBytes;

    @Value("${radiocrm.chat.max-audio-bytes:10485760}")
    private long maxAudioBytes;

    @Transactional
    public List<ChatChannelDto> listChannels() {
        Utilisateur user = requireUser();
        ensureGroupMemberships(user.getId());
        return chatChannelRepository.findAllForUser(user.getId()).stream()
                .map(c -> toChannelDto(c, user.getId()))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ChatDirectoryUserDto> searchDirectory(String query) {
        Utilisateur user = requireUser();
        String q = query == null ? "" : query.trim();
        if (q.length() < 2) {
            return List.of();
        }
        return utilisateurRepository.searchActiveDirectory(q, user.getId()).stream()
                .limit(MAX_DIRECTORY)
                .map(
                        u ->
                                ChatDirectoryUserDto.builder()
                                        .id(String.valueOf(u.getId()))
                                        .nomComplet(u.getNomComplet())
                                        .email(u.getEmail())
                                        .role(u.getRole() != null ? u.getRole().name().toLowerCase(Locale.ROOT) : "staff")
                                        .build())
                .toList();
    }

    @Transactional
    public ChatChannelDto openOrCreateDirect(ChatDirectCreateRequest request) {
        Utilisateur me = requireUser();
        if (request == null || request.getPeerUserId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Destinataire requis");
        }
        Long peerId = request.getPeerUserId();
        if (peerId.equals(me.getId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Discussion avec soi-même impossible");
        }
        Utilisateur peer =
                utilisateurRepository
                        .findById(peerId)
                        .filter(u -> u.getDeletedAt() == null && u.isEnabled())
                        .orElseThrow(
                                () -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Utilisateur introuvable"));

        ensureGroupMemberships(me.getId());

        String channelId = directChannelId(me.getId(), peerId);
        Optional<ChatChannel> existing = chatChannelRepository.findById(channelId);
        ChatChannel channel;
        if (existing.isPresent()) {
            channel = existing.get();
        } else {
            channel =
                    ChatChannel.builder()
                            .id(channelId)
                            .name(peer.getNomComplet())
                            .description("Discussion privée")
                            .channelType(ChatChannelType.DIRECT)
                            .createdBy(me.getId())
                            .membersCount(2)
                            .build();
            chatChannelRepository.save(channel);
            chatChannelMemberRepository.save(
                    ChatChannelMember.builder().channelId(channelId).userId(me.getId()).build());
            chatChannelMemberRepository.save(
                    ChatChannelMember.builder().channelId(channelId).userId(peerId).build());
        }
        return toChannelDto(channel, me.getId());
    }

    @Transactional(readOnly = true)
    public List<ChatMessageDto> listMessages(String channelId) {
        Utilisateur user = requireUser();
        requireMembership(channelId, user.getId());
        List<ChatMessage> all = chatMessageRepository.findByChannelIdOrdered(channelId);
        List<ChatMessage> slice =
                all.size() <= MAX_HISTORY ? all : all.subList(all.size() - MAX_HISTORY, all.size());
        return slice.stream().map(this::toMessageDto).toList();
    }

    @Transactional
    public ChatMessageDto postMessage(String channelId, ChatMessageCreateRequest request) {
        Utilisateur user = requireUser();
        ChatChannel channel = requireMembership(channelId, user.getId());

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
                        .messageType(ChatMessageType.TEXT)
                        .body(body)
                        .build();

        ChatMessageDto dto = toMessageDto(chatMessageRepository.save(message));
        broadcast(channelId, dto);
        return dto;
    }

    @Transactional
    public ChatMessageDto uploadMessage(
            String channelId, MultipartFile file, String caption, Integer durationSeconds) {
        Utilisateur user = requireUser();
        ChatChannel channel = requireMembership(channelId, user.getId());
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Fichier requis");
        }

        String originalName =
                file.getOriginalFilename() != null && !file.getOriginalFilename().isBlank()
                        ? file.getOriginalFilename().trim()
                        : "fichier";
        String mime =
                file.getContentType() != null
                        ? file.getContentType().toLowerCase(Locale.ROOT)
                        : "application/octet-stream";
        // strip codecs suffix e.g. audio/webm;codecs=opus
        int semi = mime.indexOf(';');
        if (semi > 0) {
            mime = mime.substring(0, semi).trim();
        }
        long size = file.getSize();

        ChatMessageType type;
        long max;
        if (IMAGE_MIME.contains(mime) || isImageExtension(originalName)) {
            type = ChatMessageType.IMAGE;
            max = maxImageBytes;
            if (!IMAGE_MIME.contains(mime)) {
                mime = guessImageMime(originalName);
            }
        } else if (PDF_MIME.contains(mime) || originalName.toLowerCase(Locale.ROOT).endsWith(".pdf")) {
            type = ChatMessageType.PDF;
            max = maxPdfBytes;
            mime = "application/pdf";
        } else if (AUDIO_MIME.contains(mime) || isAudioExtension(originalName)) {
            type = ChatMessageType.AUDIO;
            max = maxAudioBytes;
            if (!AUDIO_MIME.contains(mime)) {
                mime = guessAudioMime(originalName);
            }
        } else {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Type de fichier non autorisé (image, PDF ou audio)");
        }
        if (size <= 0 || size > max) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Fichier trop volumineux (max " + (max / (1024 * 1024)) + " Mo)");
        }

        String storageKey;
        try (InputStream in = file.getInputStream()) {
            storageKey = documentStorage.store("chat/" + originalName, mime, in, size);
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Stockage impossible");
        }

        String body = sanitizeBody(caption);
        if (body.isEmpty()) {
            body = null;
        }

        Integer duration =
                type == ChatMessageType.AUDIO && durationSeconds != null && durationSeconds > 0
                        ? durationSeconds
                        : null;

        ChatMessage message =
                ChatMessage.builder()
                        .channel(channel)
                        .authorId(user.getId())
                        .authorName(resolveAuthorName(user))
                        .authorRole(user.getRole() != null ? user.getRole().name() : "STAFF")
                        .messageType(type)
                        .body(body)
                        .storageKey(storageKey)
                        .fileName(originalName)
                        .fileSize(size)
                        .mimeType(mime)
                        .durationSeconds(duration)
                        .build();

        ChatMessageDto dto = toMessageDto(chatMessageRepository.save(message));
        broadcast(channelId, dto);
        return dto;
    }

    @Transactional
    public void markChannelRead(String channelId) {
        Utilisateur user = requireUser();
        requireMembership(channelId, user.getId());
        ChatChannelRead row =
                chatChannelReadRepository
                        .findByUserIdAndChannelId(user.getId(), channelId)
                        .orElseGet(
                                () ->
                                        ChatChannelRead.builder()
                                                .userId(user.getId())
                                                .channelId(channelId)
                                                .build());
        row.setLastReadAt(LocalDateTime.now());
        chatChannelReadRepository.save(row);
    }

    @Transactional(readOnly = true)
    public ResponseEntity<Resource> downloadFile(Long messageId) {
        Utilisateur user = requireUser();
        ChatMessage message =
                chatMessageRepository
                        .findById(messageId)
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Message introuvable"));
        if (message.getChannel() == null || message.getStorageKey() == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Fichier introuvable");
        }
        requireMembership(message.getChannel().getId(), user.getId());

        byte[] bytes;
        try {
            bytes = documentStorage.load(message.getStorageKey());
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Fichier introuvable");
        }

        MediaType mediaType =
                message.getMimeType() != null
                        ? MediaType.parseMediaType(message.getMimeType())
                        : MediaType.APPLICATION_OCTET_STREAM;
        String disposition =
                message.getMessageType() == ChatMessageType.IMAGE
                                || message.getMessageType() == ChatMessageType.AUDIO
                        ? "inline"
                        : "attachment";
        String fileName = message.getFileName() != null ? message.getFileName() : "fichier";

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition + "; filename=\"" + sanitizeHeader(fileName) + "\"")
                .contentType(mediaType)
                .contentLength(bytes.length)
                .body(new ByteArrayResource(bytes));
    }

    private void broadcast(String channelId, ChatMessageDto dto) {
        List<Long> members = chatChannelMemberRepository.findUserIdsByChannelId(channelId);
        chatRealtimeHub.broadcastToUsers(members, dto);
    }

    private void ensureGroupMemberships(Long userId) {
        for (String groupId : List.of("accueil-medecins", "techniciens-medecins", "general")) {
            if (!chatChannelRepository.existsById(groupId)) {
                continue;
            }
            if (!chatChannelMemberRepository.existsByChannelIdAndUserId(groupId, userId)) {
                chatChannelMemberRepository.save(
                        ChatChannelMember.builder().channelId(groupId).userId(userId).build());
                chatChannelRepository
                        .findById(groupId)
                        .ifPresent(
                                c -> {
                                    int count = (int) chatChannelMemberRepository.countByChannelId(groupId);
                                    c.setMembersCount(count);
                                    chatChannelRepository.save(c);
                                });
            }
        }
    }

    private ChatChannel requireMembership(String channelId, Long userId) {
        if (isSeededGroup(channelId)) {
            ensureGroupMemberships(userId);
        }
        ChatChannel channel = requireChannel(channelId);
        if (!chatChannelMemberRepository.existsByChannelIdAndUserId(channelId, userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Accès au canal refusé");
        }
        return channel;
    }

    private static boolean isSeededGroup(String channelId) {
        return "accueil-medecins".equals(channelId)
                || "techniciens-medecins".equals(channelId)
                || "general".equals(channelId);
    }

    private ChatChannel requireChannel(String channelId) {
        if (channelId == null || channelId.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Canal invalide");
        }
        return chatChannelRepository
                .findById(channelId.trim())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Canal introuvable"));
    }

    private Utilisateur requireUser() {
        Utilisateur user = SecurityUtils.currentUserOrNull();
        if (user == null || user.getId() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentification requise");
        }
        return user;
    }

    private static String directChannelId(Long a, Long b) {
        long min = Math.min(a, b);
        long max = Math.max(a, b);
        return "dm-" + min + "-" + max;
    }

    private static String sanitizeBody(String raw) {
        if (raw == null) {
            return "";
        }
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

    private static boolean isImageExtension(String name) {
        String lower = name.toLowerCase(Locale.ROOT);
        return lower.endsWith(".jpg")
                || lower.endsWith(".jpeg")
                || lower.endsWith(".png")
                || lower.endsWith(".webp")
                || lower.endsWith(".gif");
    }

    private static boolean isAudioExtension(String name) {
        String lower = name.toLowerCase(Locale.ROOT);
        return lower.endsWith(".webm")
                || lower.endsWith(".ogg")
                || lower.endsWith(".mp3")
                || lower.endsWith(".m4a")
                || lower.endsWith(".wav");
    }

    private static String guessImageMime(String name) {
        String lower = name.toLowerCase(Locale.ROOT);
        if (lower.endsWith(".png")) return "image/png";
        if (lower.endsWith(".webp")) return "image/webp";
        if (lower.endsWith(".gif")) return "image/gif";
        return "image/jpeg";
    }

    private static String guessAudioMime(String name) {
        String lower = name.toLowerCase(Locale.ROOT);
        if (lower.endsWith(".ogg")) return "audio/ogg";
        if (lower.endsWith(".mp3")) return "audio/mpeg";
        if (lower.endsWith(".m4a") || lower.endsWith(".mp4")) return "audio/mp4";
        if (lower.endsWith(".wav")) return "audio/wav";
        return "audio/webm";
    }

    private static String sanitizeHeader(String name) {
        return name.replace("\"", "").replace("\r", "").replace("\n", "");
    }

    private ChatChannelDto toChannelDto(ChatChannel channel, Long currentUserId) {
        int count = (int) chatChannelMemberRepository.countByChannelId(channel.getId());
        LocalDateTime since =
                chatChannelReadRepository
                        .findByUserIdAndChannelId(currentUserId, channel.getId())
                        .map(ChatChannelRead::getLastReadAt)
                        .orElse(null);
        int unread =
                (int)
                        Math.min(
                                Integer.MAX_VALUE,
                                since == null
                                        ? chatChannelReadRepository.countUnreadAll(
                                                channel.getId(), currentUserId)
                                        : chatChannelReadRepository.countUnreadSince(
                                                channel.getId(), currentUserId, since));
        ChatChannelDto.ChatChannelDtoBuilder b =
                ChatChannelDto.builder()
                        .id(channel.getId())
                        .name(channel.getName())
                        .description(channel.getDescription() != null ? channel.getDescription() : "")
                        .membersCount(count)
                        .unreadCount(unread)
                        .type(
                                channel.getChannelType() != null
                                        ? channel.getChannelType().name()
                                        : ChatChannelType.GROUP.name());

        if (channel.getChannelType() == ChatChannelType.DIRECT) {
            List<Long> members = chatChannelMemberRepository.findUserIdsByChannelId(channel.getId());
            Long peerId =
                    members.stream().filter(id -> !id.equals(currentUserId)).findFirst().orElse(null);
            if (peerId != null) {
                utilisateurRepository
                        .findById(peerId)
                        .ifPresent(
                                peer -> {
                                    b.peerUserId(String.valueOf(peer.getId()));
                                    b.peerName(peer.getNomComplet());
                                    b.peerEmail(peer.getEmail());
                                    b.name(peer.getNomComplet());
                                });
            }
        }
        return b.build();
    }

    private ChatMessageDto toMessageDto(ChatMessage message) {
        String channelId = message.getChannel() != null ? message.getChannel().getId() : null;
        String createdAt =
                message.getCreatedAt() != null
                        ? ISO.format(message.getCreatedAt().atZone(ZoneOffset.systemDefault()).toInstant())
                        : null;
        ChatMessageType type =
                message.getMessageType() != null ? message.getMessageType() : ChatMessageType.TEXT;
        String fileUrl =
                message.getId() != null && message.getStorageKey() != null
                        ? "/api/chat/files/" + message.getId()
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
                .messageType(type.name())
                .body(message.getBody())
                .createdAt(createdAt)
                .fileName(message.getFileName())
                .fileSize(message.getFileSize())
                .mimeType(message.getMimeType())
                .fileUrl(fileUrl)
                .durationSeconds(message.getDurationSeconds())
                .build();
    }
}
