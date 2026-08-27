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
}
