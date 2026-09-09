package com.crm.medicare.repository;

import com.crm.medicare.entity.ChatChannelRead;
import java.time.LocalDateTime;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ChatChannelReadRepository extends JpaRepository<ChatChannelRead, ChatChannelRead.Pk> {

    Optional<ChatChannelRead> findByUserIdAndChannelId(Long userId, String channelId);

    /** Tous les messages des autres (jamais lu). */
    @Query(
            """
            SELECT COUNT(m) FROM ChatMessage m
            WHERE m.channel.id = :channelId
              AND m.authorId <> :userId
            """)
    long countUnreadAll(
            @Param("channelId") String channelId, @Param("userId") Long userId);

    /** Messages des autres après une date de lecture. */
    @Query(
            """
            SELECT COUNT(m) FROM ChatMessage m
            WHERE m.channel.id = :channelId
              AND m.authorId <> :userId
              AND m.createdAt > :since
            """)
    long countUnreadSince(
            @Param("channelId") String channelId,
            @Param("userId") Long userId,
            @Param("since") LocalDateTime since);
}
