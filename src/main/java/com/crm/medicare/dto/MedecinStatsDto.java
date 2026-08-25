package com.crm.medicare.dto;

import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MedecinStatsDto {
    private long examensCount;
    private LocalDateTime lastExamenAt;
}
