package com.crm.medicare.security;

import com.crm.medicare.entity.Utilisateur;
import java.time.Duration;
import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Service;

@Service
public class LoginAttemptService {

    private static final int MAX_ATTEMPTS = 5;
    private static final Duration LOCK_DURATION = Duration.ofMinutes(15);

    private final ConcurrentHashMap<String, Attempt> attempts = new ConcurrentHashMap<>();

    public boolean isLocked(String email) {
        Attempt attempt = attempts.get(normalize(email));
        if (attempt == null || attempt.lockedUntil == null) {
            return false;
        }
        if (Instant.now().isAfter(attempt.lockedUntil)) {
            attempts.remove(normalize(email));
            return false;
        }
        return true;
    }

    public void onSuccess(String email) {
        attempts.remove(normalize(email));
    }

    public void onFailure(String email) {
        String key = normalize(email);
        attempts.compute(
                key,
                (ignored, current) -> {
                    Attempt next = current == null ? new Attempt() : current;
                    next.count += 1;
                    if (next.count >= MAX_ATTEMPTS) {
                        next.lockedUntil = Instant.now().plus(LOCK_DURATION);
                    }
                    return next;
                });
    }

    private static String normalize(String email) {
        return email == null ? "" : email.trim().toLowerCase();
    }

    private static final class Attempt {
        private int count;
        private Instant lockedUntil;
    }
}
