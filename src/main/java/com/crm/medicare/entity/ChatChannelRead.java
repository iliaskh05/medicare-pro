package com.crm.medicare.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.io.Serializable;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "chat_channel_reads")
@IdClass(ChatChannelRead.Pk.class)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatChannelRead {

    @Id
    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Id
    @Column(name = "channel_id", length = 64, nullable = false)
    private String channelId;

    @Column(name = "last_read_at", nullable = false)
    private LocalDateTime lastReadAt;

    @PrePersist
    void prePersist() {
        if (lastReadAt == null) {
            lastReadAt = LocalDateTime.now();
        }
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Pk implements Serializable {
        private Long userId;
        private String channelId;
    }
}
