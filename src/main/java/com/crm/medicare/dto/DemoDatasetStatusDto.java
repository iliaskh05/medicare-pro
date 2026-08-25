package com.crm.medicare.dto;

import java.util.LinkedHashMap;
import java.util.Map;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DemoDatasetStatusDto {
    private boolean loaded;
    @Builder.Default
    private Map<String, Long> countsByType = new LinkedHashMap<>();
    private long totalMarkers;
}
