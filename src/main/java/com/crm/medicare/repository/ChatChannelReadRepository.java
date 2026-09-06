package com.crm.medicare.repository;

import com.crm.medicare.entity.ChatChannelRead;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ChatChannelReadRepository extends JpaRepository<ChatChannelRead, ChatChannelRead.Pk> {

    Optional<ChatChannelRead> findByUserIdAndChannelId(Long userId, String channelId);

    @Query(
            """
            SELECT COUNT(m) FROM ChatMessage m
            WHERE m.channel.id = :channelId
              AND m.authorId <> :userId
              AND (:since IS NULL OR m.createdAt > :since)
            """)
    long countUnread(
            @Param("channelId") String channelId,
            @Param("userId") Long userId,
            @Param("since") java.time.LocalDateTime since);
}
