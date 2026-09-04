package com.crm.medicare.service;

import com.crm.medicare.dto.DocumentItemDto;
import com.crm.medicare.entity.DocumentExamen;
import com.crm.medicare.entity.DocumentType;
import com.crm.medicare.entity.Examen;
import com.crm.medicare.entity.Patient;
import com.crm.medicare.entity.Utilisateur;
import com.crm.medicare.repository.DocumentExamenRepository;
import com.crm.medicare.repository.ExamenRepository;
import com.crm.medicare.repository.PatientRepository;
import com.crm.medicare.security.SecurityUtils;
import com.crm.medicare.storage.DocumentStorage;
import java.io.IOException;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class DocumentStorageService {

    private static final Set<String> ALLOWED_EXT =
            Set.of("jpg", "jpeg", "png", "pdf", "dcm", "dicom");

    private final DocumentExamenRepository documentRepository;
    private final ExamenRepository examenRepository;
    private final PatientRepository patientRepository;
    private final DocumentStorage documentStorage;

    @Transactional(readOnly = true)
    public List<DocumentItemDto> listForPatient(Long patientId) {
        return documentRepository.findByPatientIdOrderByCreatedAtDesc(patientId).stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<DocumentItemDto> listForExamen(Long examenId) {
        return documentRepository.findByExamenIdOrderByCreatedAtDesc(examenId).stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional
    public DocumentItemDto store(Long patientId, Long examenId, String type, MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Fichier manquant");
        }
        String original = file.getOriginalFilename() != null ? file.getOriginalFilename() : "fichier";
        String ext = extension(original);
        if (!ALLOWED_EXT.contains(ext)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Type de fichier non autorisé (jpg, png, pdf, dcm)");
        }

        Patient patient =
                patientRepository
                        .findByIdAndDeletedAtIsNull(patientId)
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Patient introuvable"));
        Examen examen = null;
        if (examenId != null) {
            examen =
                    examenRepository
                            .findByIdWithPatient(examenId)
                            .orElseThrow(
                                    () -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Examen introuvable"));
            if (examen.getPatient() == null || !examen.getPatient().getId().equals(patientId)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "L'examen n'appartient pas à ce patient");
            }
        }

        String storageKey;
        try {
            storageKey =
                    documentStorage.store(
                            original,
                            file.getContentType(),
                            file.getInputStream(),
                            file.getSize());
        } catch (IOException ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Impossible d'enregistrer le fichier");
        }

        DocumentType docType = DocumentType.normalize(type);
        Utilisateur actor = SecurityUtils.currentUserOrNull();
        DocumentExamen doc = new DocumentExamen();
        doc.setPatient(patient);
        doc.setExamen(examen);
        doc.setType(docType.name());
        doc.setNomOriginal(original);
        doc.setContentType(file.getContentType() != null ? file.getContentType() : "application/octet-stream");
        doc.setTaille(file.getSize());
        doc.setStoragePath(storageKey);
        doc.setCreatedBy(actor != null ? actor.getNomComplet() : null);
        return toDto(documentRepository.save(doc));
    }

    @Transactional(readOnly = true)
    public DocumentExamen load(Long id) {
        return documentRepository
                .findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Document introuvable"));
    }

    public byte[] readBytes(DocumentExamen doc) {
        try {
            return documentStorage.load(doc.getStoragePath());
        } catch (IOException ex) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Fichier introuvable sur le disque");
        }
    }

    @Transactional
    public void delete(Long id) {
        DocumentExamen doc = load(id);
        String path = doc.getStoragePath();
        documentRepository.delete(doc);
        try {
            if (path != null && !path.isBlank()) {
                documentStorage.delete(path);
            }
        } catch (IOException ignored) {
            // DB row already removed; orphan file is acceptable for MVP
        }
    }

    /** DTO sans chemin filesystem. */
    public DocumentItemDto toDto(DocumentExamen doc) {
        return DocumentItemDto.builder()
                .id(doc.getId())
                .examenId(doc.getExamen() != null ? doc.getExamen().getId() : null)
                .patientId(doc.getPatient() != null ? doc.getPatient().getId() : null)
                .type(doc.getType())
                .nomOriginal(doc.getNomOriginal())
                .contentType(doc.getContentType())
                .taille(doc.getTaille())
                .createdAt(doc.getCreatedAt())
                .createdBy(doc.getCreatedBy())
                .build();
    }

    private static String extension(String name) {
        int dot = name.lastIndexOf('.');
        if (dot < 0 || dot == name.length() - 1) {
            return "";
        }
        return name.substring(dot + 1).toLowerCase(Locale.ROOT);
    }
}
