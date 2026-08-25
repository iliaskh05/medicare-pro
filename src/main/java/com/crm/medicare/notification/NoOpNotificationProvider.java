package com.crm.medicare.notification;

import org.springframework.stereotype.Component;

/** Provider no-op : enregistre une tentative SUCCESS sans envoi réel. */
@Component
public class NoOpNotificationProvider implements NotificationProvider {
    @Override
    public String channel() {
        return "LOG";
    }

    @Override
    public void send(String recipient, String subject, String body) {
        // intentional no-op — secrets providers hors Git
    }
}
