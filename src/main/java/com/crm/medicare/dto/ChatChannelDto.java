package com.crm.medicare.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatChannelDto {

    private String id;
    private String name;
    private String description;
    private int membersCount;
    /** GROUP | DIRECT */
    private String type;
    /** Pour un DM : id du pair */
    private String peerUserId;
    private String peerName;
    private String peerEmail;
    private int unreadCount;
}
