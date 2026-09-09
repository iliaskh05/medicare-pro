package com.crm.medicare.security;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class LanOriginTest {

    @Test
    void privateRfc1918HostsAreAccepted() {
        assertThat(SecurityConfig.isPrivateLanHost("192.168.1.10")).isTrue();
        assertThat(SecurityConfig.isPrivateLanHost("10.0.0.5")).isTrue();
        assertThat(SecurityConfig.isPrivateLanHost("172.16.0.2")).isTrue();
        assertThat(SecurityConfig.isPrivateLanHost("172.31.255.1")).isTrue();
    }

    @Test
    void publicHostsAreRejected() {
        assertThat(SecurityConfig.isPrivateLanHost("8.8.8.8")).isFalse();
        assertThat(SecurityConfig.isPrivateLanHost("1.1.1.1")).isFalse();
        assertThat(SecurityConfig.isPrivateLanHost("172.32.0.1")).isFalse();
    }
}
