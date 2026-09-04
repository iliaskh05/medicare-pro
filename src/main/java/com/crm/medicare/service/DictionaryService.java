package com.crm.medicare.service;

import com.crm.medicare.common.ApiException;
import com.crm.medicare.entity.DictionaryAnatomicalZone;
import com.crm.medicare.entity.DictionaryPathology;
import com.crm.medicare.entity.DictionaryPathologyFamily;
import com.crm.medicare.repository.DictionaryAnatomicalZoneRepository;
import com.crm.medicare.repository.DictionaryPathologyFamilyRepository;
import com.crm.medicare.repository.DictionaryPathologyRepository;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class DictionaryService {

    private final DictionaryAnatomicalZoneRepository zoneRepository;
    private final DictionaryPathologyFamilyRepository familyRepository;
    private final DictionaryPathologyRepository pathologyRepository;

    @Transactional(readOnly = true)
    public List<Map<String, Object>> listZones(boolean activeOnly) {
        return (activeOnly ? zoneRepository.findByActiveTrueOrderByLabelAsc() : zoneRepository.findAllByOrderByLabelAsc())
                .stream()
                .map(this::zoneDto)
                .toList();
    }

    @Transactional
    public Map<String, Object> createZone(Map<String, Object> body) {
        String code = required(body, "code");
        if (zoneRepository.findByCodeIgnoreCase(code).isPresent()) {
            throw ApiException.conflict("dict_zone_duplicate", "Code zone déjà utilisé");
        }
        DictionaryAnatomicalZone z = new DictionaryAnatomicalZone();
        z.setCode(code.trim());
        z.setLabel(required(body, "label").trim());
        z.setActive(body.get("active") == null || Boolean.TRUE.equals(body.get("active")));
        return zoneDto(zoneRepository.save(z));
    }

    @Transactional
    public Map<String, Object> patchZone(Long id, Map<String, Object> body) {
        DictionaryAnatomicalZone z =
                zoneRepository.findById(id).orElseThrow(() -> ApiException.notFound("Zone introuvable"));
        if (body.containsKey("label") && body.get("label") != null) {
            z.setLabel(String.valueOf(body.get("label")).trim());
        }
        if (body.containsKey("active")) {
            z.setActive(Boolean.TRUE.equals(body.get("active")));
        }
        return zoneDto(zoneRepository.save(z));
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> listFamilies(boolean activeOnly) {
        return (activeOnly
                        ? familyRepository.findByActiveTrueOrderByLabelAsc()
                        : familyRepository.findAllByOrderByLabelAsc())
                .stream()
                .map(this::familyDto)
                .toList();
    }

    @Transactional
    public Map<String, Object> createFamily(Map<String, Object> body) {
        String code = required(body, "code");
        if (familyRepository.findByCodeIgnoreCase(code).isPresent()) {
            throw ApiException.conflict("dict_family_duplicate", "Code famille déjà utilisé");
        }
        DictionaryPathologyFamily f = new DictionaryPathologyFamily();
        f.setCode(code.trim());
        f.setLabel(required(body, "label").trim());
        f.setActive(body.get("active") == null || Boolean.TRUE.equals(body.get("active")));
        return familyDto(familyRepository.save(f));
    }

    @Transactional
    public Map<String, Object> patchFamily(Long id, Map<String, Object> body) {
        DictionaryPathologyFamily f =
                familyRepository.findById(id).orElseThrow(() -> ApiException.notFound("Famille introuvable"));
        if (body.containsKey("label") && body.get("label") != null) {
            f.setLabel(String.valueOf(body.get("label")).trim());
        }
        if (body.containsKey("active")) {
            f.setActive(Boolean.TRUE.equals(body.get("active")));
        }
        return familyDto(familyRepository.save(f));
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> listPathologies(Long familyId, String q) {
        String query = q != null && !q.isBlank() ? q.trim() : null;
        return pathologyRepository.search(familyId, query).stream().map(this::pathologyDto).toList();
    }

    @Transactional
    public Map<String, Object> createPathology(Map<String, Object> body) {
        String code = required(body, "code");
        if (pathologyRepository.findByCodeIgnoreCase(code).isPresent()) {
            throw ApiException.conflict("dict_pathology_duplicate", "Code pathologie déjà utilisé");
        }
        DictionaryPathology p = new DictionaryPathology();
        p.setCode(code.trim());
        p.setLabel(required(body, "label").trim());
        p.setActive(body.get("active") == null || Boolean.TRUE.equals(body.get("active")));
        if (body.get("familyId") != null) {
            Long familyId = Long.valueOf(String.valueOf(body.get("familyId")));
            p.setFamily(
                    familyRepository
                            .findById(familyId)
                            .orElseThrow(() -> ApiException.notFound("Famille introuvable")));
        }
        return pathologyDto(pathologyRepository.save(p));
    }

    @Transactional
    public Map<String, Object> patchPathology(Long id, Map<String, Object> body) {
        DictionaryPathology p =
                pathologyRepository.findById(id).orElseThrow(() -> ApiException.notFound("Pathologie introuvable"));
        if (body.containsKey("label") && body.get("label") != null) {
            p.setLabel(String.valueOf(body.get("label")).trim());
        }
        if (body.containsKey("active")) {
            p.setActive(Boolean.TRUE.equals(body.get("active")));
        }
        if (body.containsKey("familyId")) {
            Object raw = body.get("familyId");
            if (raw == null) {
                p.setFamily(null);
            } else {
                Long familyId = Long.valueOf(String.valueOf(raw));
                p.setFamily(
                        familyRepository
                                .findById(familyId)
                                .orElseThrow(() -> ApiException.notFound("Famille introuvable")));
            }
        }
        return pathologyDto(pathologyRepository.save(p));
    }

    private Map<String, Object> zoneDto(DictionaryAnatomicalZone z) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", z.getId());
        m.put("code", z.getCode());
        m.put("label", z.getLabel());
        m.put("active", z.isActive());
        return m;
    }

    private Map<String, Object> familyDto(DictionaryPathologyFamily f) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", f.getId());
        m.put("code", f.getCode());
        m.put("label", f.getLabel());
        m.put("active", f.isActive());
        return m;
    }

    private Map<String, Object> pathologyDto(DictionaryPathology p) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", p.getId());
        m.put("code", p.getCode());
        m.put("label", p.getLabel());
        m.put("active", p.isActive());
        m.put("familyId", p.getFamily() != null ? p.getFamily().getId() : null);
        m.put("familyLabel", p.getFamily() != null ? p.getFamily().getLabel() : null);
        return m;
    }

    private static String required(Map<String, Object> body, String key) {
        Object v = body != null ? body.get(key) : null;
        if (v == null || String.valueOf(v).isBlank()) {
            throw ApiException.badRequest(key + " obligatoire");
        }
        return String.valueOf(v);
    }
}
