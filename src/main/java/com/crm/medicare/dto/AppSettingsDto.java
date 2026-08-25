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
public class AppSettingsDto {
    @Builder.Default
    private Map<String, String> settings = new LinkedHashMap<>();
}
