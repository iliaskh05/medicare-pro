package com.crm.medicare.controller;

import com.crm.medicare.service.UserPreferenceService;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping({"/api/preferences", "/api/v1/preferences"})
@RequiredArgsConstructor
public class UserPreferenceController {

    private final UserPreferenceService userPreferenceService;

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public Map<String, Object> list() {
        return userPreferenceService.listMine();
    }

    @GetMapping("/{key}")
    @PreAuthorize("isAuthenticated()")
    public Map<String, Object> get(@PathVariable String key) {
        return userPreferenceService.getMine(key);
    }

    @PutMapping("/{key}")
    @PreAuthorize("isAuthenticated()")
    public Map<String, Object> put(@PathVariable String key, @RequestBody Map<String, Object> body) {
        return userPreferenceService.putMine(key, body);
    }
}
