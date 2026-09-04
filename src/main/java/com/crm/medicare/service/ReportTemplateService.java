package com.crm.medicare.service;

import com.crm.medicare.common.ApiException;
import com.crm.medicare.entity.ReportTemplate;
import com.crm.medicare.repository.ReportTemplateRepository;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ReportTemplateService {

    private final ReportTemplateRepository templateRepository;
    private final AuditService auditService;

    @Transactional(readOnly = true)
    public List<Map<String, Object>> list(String modalite, boolean activeOnly) {
        List<ReportTemplate> rows;
        if (modalite != null && !modalite.isBlank()) {
            rows = templateRepository.findByActiveTrueAndModaliteIgnoreCaseOrderByLabelAsc(modalite.trim());
        } else if (activeOnly) {
            rows = templateRepository.findByActiveTrueOrderByLabelAsc();
        } else {
            rows = templateRepository.findAll();
        }
        return rows.stream().map(this::toDto).toList();
    }

    @Transactional
    public Map<String, Object> create(Map<String, Object> body) {
        String code = required(body, "code");
        if (templateRepository.findByCodeIgnoreCase(code).isPresent()) {
            throw ApiException.conflict("template_duplicate", "Code modèle déjà utilisé");
        }
        ReportTemplate t = new ReportTemplate();
        apply(t, body, true);
        t.setCode(code.trim());
        ReportTemplate saved = templateRepository.save(t);
        auditService.record(
                AuditService.SETTINGS_UPDATE,
                "ReportTemplate",
                String.valueOf(saved.getId()),
                Map.of("action", "create", "code", saved.getCode()));
        return toDto(saved);
    }

    @Transactional
    public Map<String, Object> patch(Long id, Map<String, Object> body) {
        ReportTemplate t =
                templateRepository.findById(id).orElseThrow(() -> ApiException.notFound("Modèle introuvable"));
        apply(t, body, false);
        ReportTemplate saved = templateRepository.save(t);
        auditService.record(
                AuditService.SETTINGS_UPDATE,
                "ReportTemplate",
                String.valueOf(saved.getId()),
                Map.of("action", "patch"));
        return toDto(saved);
    }

    private void apply(ReportTemplate t, Map<String, Object> body, boolean creating) {
        if (creating || body.containsKey("label")) {
            t.setLabel(required(body, "label").trim());
        }
        if (body.containsKey("modalite")) {
            t.setModalite(body.get("modalite") != null ? String.valueOf(body.get("modalite")).trim() : null);
        }
        if (body.containsKey("catalogueId") && body.get("catalogueId") != null) {
            t.setCatalogueId(Long.valueOf(String.valueOf(body.get("catalogueId"))));
        }
        if (body.containsKey("indication")) {
            t.setIndication(asText(body.get("indication")));
        }
        if (body.containsKey("technique")) {
            t.setTechnique(asText(body.get("technique")));
        }
        if (body.containsKey("resultats")) {
            t.setResultats(asText(body.get("resultats")));
        }
        if (body.containsKey("conclusion")) {
            t.setConclusion(asText(body.get("conclusion")));
        }
        if (body.containsKey("active")) {
            t.setActive(Boolean.TRUE.equals(body.get("active")));
        } else if (creating) {
            t.setActive(true);
        }
    }

    private Map<String, Object> toDto(ReportTemplate t) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", t.getId());
        m.put("code", t.getCode());
        m.put("label", t.getLabel());
        m.put("modalite", t.getModalite());
        m.put("catalogueId", t.getCatalogueId());
        m.put("indication", t.getIndication());
        m.put("technique", t.getTechnique());
        m.put("resultats", t.getResultats());
        m.put("conclusion", t.getConclusion());
        m.put("active", t.isActive());
        return m;
    }

    private static String required(Map<String, Object> body, String key) {
        Object v = body.get(key);
        if (v == null || String.valueOf(v).isBlank()) {
            throw ApiException.badRequest(key + " obligatoire");
        }
        return String.valueOf(v);
    }

    private static String asText(Object v) {
        return v == null ? null : String.valueOf(v);
    }
}
