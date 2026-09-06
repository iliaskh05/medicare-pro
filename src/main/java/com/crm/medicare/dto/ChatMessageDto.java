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
    /** TEXT | IMAGE | PDF | AUDIO */
    private String messageType;
    private String body;
    private String createdAt;
    private String fileName;
    private Long fileSize;
    private String mimeType;
    /** URL relative API pour télécharger / afficher le fichier (auth JWT requise). */
    private String fileUrl;
    private Integer durationSeconds;
}
