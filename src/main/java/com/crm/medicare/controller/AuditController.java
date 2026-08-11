package com.crm.medicare.controller;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Dashboard fraude — accès Directeur.
 */
@RestController
@RequestMapping("/api/audit/fraude")
@CrossOrigin(origins = "*")
public class AuditController {

    @GetMapping("/anomalies")
    public Map<String, Object> getAnomalies() {
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("totalAnomalies", 0);
        response.put("scoreRisqueMoyen", 0);
        response.put("alertesCritiques", 0);
        response.put("alertesMoyennes", 0);
        response.put("alertesFaibles", 0);
        response.put("anomalies", List.of());
        return response;
    }
}
