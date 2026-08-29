package com.crm.medicare.dto;

import java.util.List;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class AuditDemoStatusDto {
    private boolean loaded;
    private int count;
    private List<String> operationIds;
}
