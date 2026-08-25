package com.crm.medicare.service;

import com.crm.medicare.entity.AppNotification;
import com.crm.medicare.entity.NotificationAttempt;
import com.crm.medicare.notification.NotificationProvider;
import com.crm.medicare.repository.AppNotificationRepository;
import com.crm.medicare.repository.NotificationAttemptRepository;
import java.time.LocalDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationService {

    private final AppNotificationRepository notificationRepository;
    private final NotificationAttemptRepository attemptRepository;
    private final List<NotificationProvider> providers;

    /** Publie après commit métier — ne propage pas les erreurs provider. */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void publish(
            String channel,
            String recipient,
            String subject,
            String body,
            String entityType,
            String entityId) {
        if (recipient == null || recipient.isBlank() || body == null || body.isBlank()) {
            return;
        }
        AppNotification n = new AppNotification();
        n.setChannel(channel != null ? channel : "LOG");
        n.setRecipient(recipient.trim());
        n.setSubject(subject);
        n.setBody(body);
        n.setEntityType(entityType);
        n.setEntityId(entityId);
        n.setStatus("PENDING");
        final AppNotification saved = notificationRepository.save(n);

        NotificationProvider provider =
                providers.stream()
                        .filter(p -> p.channel().equalsIgnoreCase(saved.getChannel()))
                        .findFirst()
                        .orElseGet(
                                () ->
                                        providers.stream()
                                                .findFirst()
                                                .orElse(null));
        NotificationAttempt attempt = new NotificationAttempt();
        attempt.setNotificationId(saved.getId());
        attempt.setAttemptNo(1);
        try {
            if (provider != null) {
                provider.send(saved.getRecipient(), saved.getSubject(), saved.getBody());
            }
            attempt.setStatus("SUCCESS");
            saved.setStatus("SENT");
            saved.setSentAt(LocalDateTime.now());
        } catch (Exception ex) {
            log.warn("Notification FAILED id={} : {}", saved.getId(), ex.getMessage());
            attempt.setStatus("FAILED");
            attempt.setErrorMessage(
                    ex.getMessage() != null && ex.getMessage().length() > 1000
                            ? ex.getMessage().substring(0, 1000)
                            : ex.getMessage());
            saved.setStatus("FAILED");
        }
        attemptRepository.save(attempt);
        notificationRepository.save(saved);
    }
}
