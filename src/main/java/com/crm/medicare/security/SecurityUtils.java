package com.crm.medicare.security;

import com.crm.medicare.entity.Utilisateur;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

public final class SecurityUtils {

    private SecurityUtils() {}

    public static Utilisateur currentUserOrNull() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null) {
            return null;
        }
        Object principal = authentication.getPrincipal();
        if (principal instanceof Utilisateur utilisateur) {
            return utilisateur;
        }
        return null;
    }

    public static String currentEmailOr(String fallback) {
        Utilisateur user = currentUserOrNull();
        if (user != null && user.getEmail() != null) {
            return user.getEmail();
        }
        return fallback;
    }
}
