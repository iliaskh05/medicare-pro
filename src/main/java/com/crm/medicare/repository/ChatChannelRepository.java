package com.crm.medicare.repository;

import com.crm.medicare.entity.ChatChannel;
import com.crm.medicare.entity.ChatChannelType;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ChatChannelRepository extends JpaRepository<ChatChannel, String> {

    @Query(
            """
            SELECT c FROM ChatChannel c
            WHERE c.id IN (
                SELECT m.channelId FROM ChatChannelMember m WHERE m.userId = :userId
            )
            ORDER BY c.channelType ASC, c.name ASC
            """)
    List<ChatChannel> findAllForUser(@Param("userId") Long userId);

    Optional<ChatChannel> findByIdAndChannelType(String id, ChatChannelType type);
}
