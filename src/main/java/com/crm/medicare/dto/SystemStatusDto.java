package com.crm.medicare.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SystemStatusDto {

    private String version;
    private String profile;
    private String timestamp;
    private String api;
    private String database;
    private String ml;
    private String websocket;
    private String centreNom;
    private String centreVille;
    private String correlationId;
    /** UP | DEGRADED | DOWN — jamais de secrets. */
    private String status;
}
