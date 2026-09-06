package com.crm.medicare.controller;

import com.crm.medicare.service.ProfileAvatarService;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping({"/api/me", "/api/v1/me"})
@RequiredArgsConstructor
public class MeController {

    private final ProfileAvatarService profileAvatarService;

    @GetMapping("/avatar")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Resource> avatar() {
        return profileAvatarService.downloadAvatar();
    }

    @PostMapping("/avatar")
    @PreAuthorize("isAuthenticated()")
    public Map<String, String> uploadAvatar(@RequestPart("file") MultipartFile file) {
        String url = profileAvatarService.uploadAvatar(file);
        return Map.of("avatarUrl", url);
    }
}
