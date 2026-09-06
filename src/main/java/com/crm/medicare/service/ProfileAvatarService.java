package com.crm.medicare.service;

import com.crm.medicare.entity.Utilisateur;
import com.crm.medicare.repository.UtilisateurRepository;
import com.crm.medicare.security.SecurityUtils;
import com.crm.medicare.storage.DocumentStorage;
import java.io.IOException;
import java.io.InputStream;
import java.util.Locale;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class ProfileAvatarService {

    private static final Set<String> IMAGE_MIME =
            Set.of("image/jpeg", "image/png", "image/webp", "image/gif");

    private final UtilisateurRepository utilisateurRepository;
    private final DocumentStorage documentStorage;

    @Value("${radiocrm.avatar.max-bytes:2097152}")
    private long maxAvatarBytes;

    @Transactional
    public String uploadAvatar(MultipartFile file) {
        Utilisateur user = requireUser();
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Fichier requis");
        }
        String original =
                file.getOriginalFilename() != null ? file.getOriginalFilename().trim() : "avatar.jpg";
        String mime =
                file.getContentType() != null
                        ? file.getContentType().toLowerCase(Locale.ROOT)
                        : "application/octet-stream";
        int semi = mime.indexOf(';');
        if (semi > 0) mime = mime.substring(0, semi).trim();

        if (!IMAGE_MIME.contains(mime) && !isImageExtension(original)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Formats acceptés : JPEG, PNG, WebP, GIF");
        }
        if (!IMAGE_MIME.contains(mime)) {
            mime = guessImageMime(original);
        }
        long size = file.getSize();
        if (size <= 0 || size > maxAvatarBytes) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Photo trop volumineuse (max " + (maxAvatarBytes / (1024 * 1024)) + " Mo)");
        }

        String previous = user.getAvatarStorageKey();
        String storageKey;
        try (InputStream in = file.getInputStream()) {
            storageKey = documentStorage.store("avatars/" + original, mime, in, size);
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Stockage impossible");
        }
        user.setAvatarStorageKey(storageKey);
        utilisateurRepository.save(user);
        if (previous != null && !previous.isBlank()) {
            try {
                documentStorage.delete(previous);
            } catch (IOException ignored) {
                /* best effort */
            }
        }
        return "/api/me/avatar";
    }

    @Transactional(readOnly = true)
    public ResponseEntity<Resource> downloadAvatar() {
        Utilisateur user = requireUser();
        if (user.getAvatarStorageKey() == null || user.getAvatarStorageKey().isBlank()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Aucune photo de profil");
        }
        byte[] bytes;
        try {
            bytes = documentStorage.load(user.getAvatarStorageKey());
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Photo introuvable");
        }
        String key = user.getAvatarStorageKey().toLowerCase(Locale.ROOT);
        MediaType mediaType = MediaType.IMAGE_JPEG;
        if (key.endsWith(".png")) mediaType = MediaType.IMAGE_PNG;
        else if (key.endsWith(".webp")) mediaType = MediaType.parseMediaType("image/webp");
        else if (key.endsWith(".gif")) mediaType = MediaType.IMAGE_GIF;

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"avatar\"")
                .contentType(mediaType)
                .contentLength(bytes.length)
                .body(new ByteArrayResource(bytes));
    }

    @Transactional(readOnly = true)
    public String currentAvatarUrl() {
        Utilisateur user = requireUser();
        if (user.getAvatarStorageKey() == null || user.getAvatarStorageKey().isBlank()) {
            return null;
        }
        return "/api/me/avatar";
    }

    private Utilisateur requireUser() {
        Utilisateur user = SecurityUtils.currentUserOrNull();
        if (user == null || user.getId() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentification requise");
        }
        return utilisateurRepository
                .findById(user.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Utilisateur introuvable"));
    }

    private static boolean isImageExtension(String name) {
        String lower = name.toLowerCase(Locale.ROOT);
        return lower.endsWith(".jpg")
                || lower.endsWith(".jpeg")
                || lower.endsWith(".png")
                || lower.endsWith(".webp")
                || lower.endsWith(".gif");
    }

    private static String guessImageMime(String name) {
        String lower = name.toLowerCase(Locale.ROOT);
        if (lower.endsWith(".png")) return "image/png";
        if (lower.endsWith(".webp")) return "image/webp";
        if (lower.endsWith(".gif")) return "image/gif";
        return "image/jpeg";
    }
}
