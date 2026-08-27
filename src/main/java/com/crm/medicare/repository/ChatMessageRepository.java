package com.crm.medicare.repository;

import com.crm.medicare.entity.ChatMessage;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {

    @Query(
            """
            SELECT m FROM ChatMessage m
            WHERE m.channel.id = :channelId
            ORDER BY m.createdAt ASC, m.id ASC
            """)
    List<ChatMessage> findByChannelIdOrdered(@Param("channelId") String channelId);

    long countByChannel_Id(String channelId);

    @Query(
            """
            SELECT COUNT(DISTINCT m.authorId) FROM ChatMessage m
            WHERE m.channel.id = :channelId
            """)
    long countDistinctAuthorsByChannelId(@Param("channelId") String channelId);
}
