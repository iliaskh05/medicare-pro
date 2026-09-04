package com.crm.medicare.service;

import com.crm.medicare.common.ApiException;
import com.crm.medicare.entity.UserPreference;
import com.crm.medicare.entity.Utilisateur;
import com.crm.medicare.repository.UserPreferenceRepository;
import com.crm.medicare.security.SecurityUtils;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class UserPreferenceService {

    private final UserPreferenceRepository preferenceRepository;

    @Transactional(readOnly = true)
    public Map<String, Object> listMine() {
        Long userId = requireUserId();
        Map<String, Object> out = new LinkedHashMap<>();
        for (UserPreference p : preferenceRepository.findByUserIdOrderByPreferenceKeyAsc(userId)) {
            out.put(p.getPreferenceKey(), p.getPreferenceValue());
        }
        return out;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getMine(String key) {
        Long userId = requireUserId();
        return preferenceRepository
                .findByUserIdAndPreferenceKey(userId, key)
                .map(UserPreference::getPreferenceValue)
                .orElse(Map.of());
    }

    @Transactional
    public Map<String, Object> putMine(String key, Map<String, Object> value) {
        if (key == null || key.isBlank()) {
            throw ApiException.badRequest("clé obligatoire");
        }
        Long userId = requireUserId();
        UserPreference pref =
                preferenceRepository
                        .findByUserIdAndPreferenceKey(userId, key)
                        .orElseGet(
                                () -> {
                                    UserPreference p = new UserPreference();
                                    p.setUserId(userId);
                                    p.setPreferenceKey(key.trim());
                                    return p;
                                });
        pref.setPreferenceValue(value != null ? value : Map.of());
        preferenceRepository.save(pref);
        return pref.getPreferenceValue();
    }

    private static Long requireUserId() {
        Utilisateur user = SecurityUtils.currentUserOrNull();
        if (user == null || user.getId() == null) {
            throw ApiException.unauthorized("Authentification requise");
        }
        return user.getId();
    }
}
