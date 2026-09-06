package com.crm.medicare.chat;

import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

@Component
@RequiredArgsConstructor
public class ChatWebSocketHandler extends TextWebSocketHandler {

    private final ChatRealtimeHub hub;

    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        Long userId = userId(session);
        if (userId != null) {
            hub.register(userId, session);
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        Long userId = userId(session);
        if (userId != null) {
            hub.unregister(userId, session);
        }
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) {
        // Client → server : ping éventuellement ; pas de commandes métier
        String payload = message.getPayload();
        if ("ping".equalsIgnoreCase(payload)) {
            try {
                session.sendMessage(new TextMessage("pong"));
            } catch (Exception ignored) {
                /* ignore */
            }
        }
    }

    private static Long userId(WebSocketSession session) {
        Map<String, Object> attrs = session.getAttributes();
        Object raw = attrs.get(ChatWebSocketAuthInterceptor.ATTR_USER_ID);
        if (raw instanceof Long id) {
            return id;
        }
        if (raw instanceof Number n) {
            return n.longValue();
        }
        return null;
    }
}
