package com.crm.medicare.chat;

import com.crm.medicare.entity.Utilisateur;
import com.crm.medicare.security.JwtUtils;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.http.server.ServletServerHttpRequest;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;

@Component
@RequiredArgsConstructor
public class ChatWebSocketAuthInterceptor implements HandshakeInterceptor {

    public static final String ATTR_USER_ID = "chatUserId";

    private final JwtUtils jwtUtils;
    private final UserDetailsService userDetailsService;

    @Override
    public boolean beforeHandshake(
            ServerHttpRequest request,
            ServerHttpResponse response,
            WebSocketHandler wsHandler,
            Map<String, Object> attributes) {
        String token = null;
        if (request instanceof ServletServerHttpRequest servletRequest) {
            token = servletRequest.getServletRequest().getParameter("token");
        }
        if (token == null || token.isBlank()) {
            return false;
        }
        try {
            String email = jwtUtils.extractUsername(token);
            if (email == null) {
                return false;
            }
            var details = userDetailsService.loadUserByUsername(email);
            if (!jwtUtils.isTokenValid(token, details) || !(details instanceof Utilisateur user)) {
                return false;
            }
            if (user.getId() == null) {
                return false;
            }
            attributes.put(ATTR_USER_ID, user.getId());
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    @Override
    public void afterHandshake(
            ServerHttpRequest request,
            ServerHttpResponse response,
            WebSocketHandler wsHandler,
            Exception exception) {
        /* no-op */
    }
}
