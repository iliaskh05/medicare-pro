package com.crm.medicare.storage;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class LocalDocumentStorage implements DocumentStorage {

    private final Path root;

    public LocalDocumentStorage(@Value("${radiocrm.upload-dir:./data/uploads}") String uploadDir) {
        this.root = Path.of(uploadDir).toAbsolutePath().normalize();
    }

    @Override
    public String store(String suggestedFileName, String contentType, InputStream content, long size)
            throws IOException {
        Files.createDirectories(root);
        String ext = extension(suggestedFileName);
        boolean chatPrefix =
                suggestedFileName != null
                        && (suggestedFileName.startsWith("chat/")
                                || suggestedFileName.startsWith("chat\\"));
        boolean avatarPrefix =
                suggestedFileName != null
                        && (suggestedFileName.startsWith("avatars/")
                                || suggestedFileName.startsWith("avatars\\"));
        String folder = chatPrefix ? "chat/" : avatarPrefix ? "avatars/" : "";
        String key = folder + UUID.randomUUID() + (ext.isEmpty() ? "" : "." + ext);
        Path target = resolve(key);
        Files.createDirectories(target.getParent() != null ? target.getParent() : root);
        Files.copy(content, target);
        return key;
    }

    @Override
    public byte[] load(String storageKey) throws IOException {
        return Files.readAllBytes(resolve(storageKey));
    }

    @Override
    public void delete(String storageKey) throws IOException {
        Files.deleteIfExists(resolve(storageKey));
    }

    private Path resolve(String storageKey) {
        Path target = root.resolve(storageKey).normalize();
        if (!target.startsWith(root)) {
            throw new IllegalArgumentException("Clé de stockage invalide");
        }
        return target;
    }

    private static String extension(String name) {
        if (name == null) {
            return "";
        }
        int dot = name.lastIndexOf('.');
        if (dot < 0 || dot == name.length() - 1) {
            return "";
        }
        return name.substring(dot + 1).toLowerCase();
    }
}
