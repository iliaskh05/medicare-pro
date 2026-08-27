package com.crm.medicare.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatMessageDto {

    private String id;
    private String channelId;
    private String authorId;
    private String authorName;
    private String authorRole;
    private String body;
    private String createdAt;
}
