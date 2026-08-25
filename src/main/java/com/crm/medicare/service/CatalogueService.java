package com.crm.medicare.service;

import com.crm.medicare.dto.CatalogueExamenWriteRequest;
import com.crm.medicare.entity.CatalogueExamen;
import com.crm.medicare.entity.Modalite;
import com.crm.medicare.repository.CatalogueExamenRepository;
import java.math.BigDecimal;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class CatalogueService {

    private final CatalogueExamenRepository repository;

    @Transactional(readOnly = true)
    public List<CatalogueExamen> list(boolean actifsOnly) {
        return actifsOnly ? repository.findByActifTrueOrderByNomAsc() : repository.findAllByOrderByNomAsc();
    }

    @Transactional
    public CatalogueExamen create(CatalogueExamenWriteRequest request) {
        CatalogueExamen row = new CatalogueExamen();
        apply(row, request, true);
        return repository.save(row);
    }

    @Transactional
    public CatalogueExamen update(Long id, CatalogueExamenWriteRequest request) {
        CatalogueExamen row =
                repository
                        .findById(id)
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Acte introuvable"));
        apply(row, request, false);
        return repository.save(row);
    }

    /**
     * Upsert by business code. When {@code updateExisting} is false and code exists, returns existing
     * unchanged (INITIALIZATION mode).
     */
    @Transactional
    public CatalogueExamen upsertByCode(CatalogueExamenWriteRequest request, boolean updateExisting) {
        if (request == null || isBlank(request.getCode())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "code obligatoire pour upsert");
        }
        String code = request.getCode().trim();
        var existing = repository.findByCodeIgnoreCase(code);
        if (existing.isPresent()) {
            if (!updateExisting) {
                return existing.get();
            }
            CatalogueExamen row = existing.get();
            apply(row, request, false);
            row.setCode(code);
            return repository.save(row);
        }
        CatalogueExamen row = new CatalogueExamen();
        apply(row, request, true);
        row.setCode(code);
        return repository.save(row);
    }

    private void apply(CatalogueExamen row, CatalogueExamenWriteRequest request, boolean creating) {
        if (request == null || isBlank(request.getNom()) || isBlank(request.getModalite())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "nom et modalite obligatoires");
        }
        row.setNom(request.getNom().trim());
        if (request.getCode() != null) {
            row.setCode(blankToNull(request.getCode()));
        }
        try {
            row.setModalite(Modalite.valueOf(request.getModalite().trim()));
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "modalite invalide");
        }
        row.setCategorie(blankToNull(request.getCategorie()));
        row.setBodyRegion(blankToNull(request.getBodyRegion()));
        row.setDureeMinutes(request.getDureeMinutes());
        BigDecimal prix = request.getPrix() != null ? request.getPrix() : BigDecimal.ZERO;
        if (prix.compareTo(BigDecimal.ZERO) < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "prix invalide");
        }
        row.setPrix(prix);
        if (request.getCurrency() != null && !request.getCurrency().isBlank()) {
            row.setCurrency(request.getCurrency().trim().toUpperCase());
        } else if (creating) {
            row.setCurrency("MAD");
        }
        if (request.getNationalReferencePrice() != null) {
            if (request.getNationalReferencePrice().compareTo(BigDecimal.ZERO) < 0) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "nationalReferencePrice invalide");
            }
            row.setNationalReferencePrice(request.getNationalReferencePrice());
        }
        row.setReferenceSource(blankToNull(request.getReferenceSource()));
        if (request.getReferenceDate() != null) {
            row.setReferenceDate(request.getReferenceDate());
        }
        if (request.getMarketIndicative() != null) {
            row.setMarketIndicative(request.getMarketIndicative());
        } else if (creating) {
            row.setMarketIndicative(true);
        }
        if (request.getContrastRequired() != null) {
            row.setContrastRequired(request.getContrastRequired());
        }
        row.setContrastType(blankToNull(request.getContrastType()));
        if (request.getSedationRequired() != null) {
            row.setSedationRequired(request.getSedationRequired());
        }
        row.setDescription(blankToNull(request.getDescription()));
        row.setPreparation(blankToNull(request.getPreparation()));
        if (request.getActif() != null) {
            row.setActif(request.getActif());
        } else if (creating) {
            row.setActif(true);
        }
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private static String blankToNull(String value) {
        return isBlank(value) ? null : value.trim();
    }
}
