package com.crm.medicare.notification;

/** Provider pluggable (EMAIL / SMS / WHATSAPP). Échec ≠ rollback métier. */
public interface NotificationProvider {
    String channel();

    void send(String recipient, String subject, String body) throws Exception;
}
