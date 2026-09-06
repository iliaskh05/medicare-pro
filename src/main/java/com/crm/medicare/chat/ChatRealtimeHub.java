package com.crm.medicare.chat;

import com.crm.medicare.dto.ChatMessageDto;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArraySet;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

/** Sessions WebSocket indexées par userId — broadcast aux membres d'un canal. */
@Component
@Slf4j
public class ChatRealtimeHub {

    private final ObjectMapper objectMapper;
    private final Map<Long, Set<WebSocketSession>> sessionsByUser = new ConcurrentHashMap<>();

    public ChatRealtimeHub(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public void register(Long userId, WebSocketSession session) {
        if (userId == null || session == null) {
            return;
        }
        sessionsByUser.computeIfAbsent(userId, id -> new CopyOnWriteArraySet<>()).add(session);
    }

    public void unregister(Long userId, WebSocketSession session) {
        if (userId == null) {
            return;
        }
        Set<WebSocketSession> set = sessionsByUser.get(userId);
        if (set == null) {
            return;
        }
        set.remove(session);
        if (set.isEmpty()) {
            sessionsByUser.remove(userId, set);
        }
    }

    public void broadcastToUsers(Iterable<Long> userIds, ChatMessageDto message) {
        if (message == null || userIds == null) {
            return;
        }
        final String payload;
        try {
            payload = objectMapper.writeValueAsString(message);
        } catch (IOException e) {
            log.warn("Chat WS serialize failed: {}", e.getMessage());
            return;
        }
        TextMessage text = new TextMessage(payload);
        for (Long userId : userIds) {
            Set<WebSocketSession> sessions = sessionsByUser.get(userId);
            if (sessions == null) {
                continue;
            }
            for (WebSocketSession session : sessions) {
                if (session == null || !session.isOpen()) {
                    continue;
                }
                try {
                    synchronized (session) {
                        session.sendMessage(text);
                    }
                } catch (IOException e) {
                    log.debug("Chat WS send failed user={}: {}", userId, e.getMessage());
                }
            }
        }
    }
}
