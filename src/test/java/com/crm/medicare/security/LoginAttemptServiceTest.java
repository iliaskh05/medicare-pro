package com.crm.medicare.security;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class LoginAttemptServiceTest {

    @Test
    void locksAfterFiveFailures() {
        LoginAttemptService service = new LoginAttemptService();
        String email = "test@example.com";
        for (int i = 0; i < 4; i++) {
            service.onFailure(email);
            assertThat(service.isLocked(email)).isFalse();
        }
        service.onFailure(email);
        assertThat(service.isLocked(email)).isTrue();
        service.onSuccess(email);
        assertThat(service.isLocked(email)).isFalse();
    }
}
