package com.crm.medicare.service;

import com.crm.medicare.dto.AppSettingsDto;
import com.crm.medicare.entity.AppSetting;
import com.crm.medicare.entity.Utilisateur;
import com.crm.medicare.repository.AppSettingRepository;
import com.crm.medicare.security.SecurityUtils;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class AppSettingsService {

    private final AppSettingRepository appSettingRepository;
    private final AuditService auditService;

    @Transactional(readOnly = true)
    public AppSettingsDto getAll() {
        return toDto(appSettingRepository.findAll());
    }

    @Transactional(readOnly = true)
    public AppSettingsDto getByPrefix(String prefix) {
        if (prefix == null || prefix.isBlank()) {
            return getAll();
        }
        return toDto(appSettingRepository.findByKeyStartingWithOrderByKeyAsc(prefix.trim()));
    }

    @Transactional(readOnly = true)
    public String get(String key, String defaultValue) {
        return appSettingRepository.findById(key).map(AppSetting::getValue).orElse(defaultValue);
    }

    @Transactional
    public AppSettingsDto upsert(Map<String, String> patch) {
        if (patch == null || patch.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Aucun paramètre à enregistrer");
        }
        Utilisateur actor = SecurityUtils.currentUserOrNull();
        String actorName = actor != null ? actor.getNomComplet() : null;
        for (Map.Entry<String, String> e : patch.entrySet()) {
            String key = e.getKey() != null ? e.getKey().trim() : "";
            if (key.isEmpty() || key.length() > 128) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Clé invalide: " + key);
            }
            if (!isAllowedKey(key)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Clé non autorisée: " + key);
            }
            String value = e.getValue() != null ? e.getValue() : "";
            AppSetting row =
                    appSettingRepository
                            .findById(key)
                            .orElseGet(
                                    () -> {
                                        AppSetting s = new AppSetting();
                                        s.setKey(key);
                                        return s;
                                    });
            row.setValue(value);
            row.setUpdatedByName(actorName);
            appSettingRepository.save(row);
        }
        auditService.record(
                AuditService.SETTINGS_UPDATE,
                "AppSettings",
                "batch",
                Map.of("keys", String.join(",", patch.keySet())));
        return getAll();
    }

    private static boolean isAllowedKey(String key) {
        return key.startsWith("centre.")
                || key.startsWith("schedule.")
                || key.startsWith("display.")
                || key.startsWith("medical.")
                || key.startsWith("pricing.")
                || key.startsWith("notification.");
    }

    private static AppSettingsDto toDto(List<AppSetting> rows) {
        Map<String, String> map = new LinkedHashMap<>();
        for (AppSetting row : rows) {
            map.put(row.getKey(), row.getValue());
        }
        return AppSettingsDto.builder().settings(map).build();
    }
}
