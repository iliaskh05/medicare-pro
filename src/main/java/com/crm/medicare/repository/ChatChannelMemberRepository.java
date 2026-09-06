package com.crm.medicare.repository;

import com.crm.medicare.entity.ChatChannelMember;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ChatChannelMemberRepository extends JpaRepository<ChatChannelMember, ChatChannelMember.Pk> {

    boolean existsByChannelIdAndUserId(String channelId, Long userId);

    long countByChannelId(String channelId);

    List<ChatChannelMember> findByChannelId(String channelId);

    List<ChatChannelMember> findByUserId(Long userId);

    @Query(
            """
            SELECT m.userId FROM ChatChannelMember m
            WHERE m.channelId = :channelId
            """)
    List<Long> findUserIdsByChannelId(@Param("channelId") String channelId);
}
