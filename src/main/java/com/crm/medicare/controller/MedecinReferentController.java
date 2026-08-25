package com.crm.medicare.controller;

import com.crm.medicare.common.ApiException;
import com.crm.medicare.dto.MedecinReferentWriteRequest;
import com.crm.medicare.dto.MedecinStatsDto;
import com.crm.medicare.entity.MedecinReferent;
import com.crm.medicare.repository.ExamenRepository;
import com.crm.medicare.repository.MedecinReferentRepository;
import com.crm.medicare.security.PermissionCatalog;
import java.time.LocalDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping({"/api/medecins", "/api/v1/medecins"})
@RequiredArgsConstructor
public class MedecinReferentController {

    private final MedecinReferentRepository medecinReferentRepository;
    private final ExamenRepository examenRepository;

    @GetMapping
    @PreAuthorize("hasAuthority('" + PermissionCatalog.EXAM_READ + "')")
    public List<MedecinReferent> getAllMedecins() {
        return medecinReferentRepository.findAll();
    }

    @GetMapping("/prescripteurs")
    @PreAuthorize("hasAuthority('" + PermissionCatalog.EXAM_READ + "')")
    public List<MedecinReferent> prescripteurs() {
        return medecinReferentRepository.findByActifTrueOrderByNomAsc();
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('" + PermissionCatalog.EXAM_READ + "')")
    public MedecinReferent get(@PathVariable Long id) {
        return medecinReferentRepository
                .findById(id)
                .orElseThrow(() -> ApiException.notFound("Médecin introuvable"));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('" + PermissionCatalog.USER_MANAGE + "')")
    public ResponseEntity<MedecinReferent> create(@RequestBody MedecinReferentWriteRequest request) {
        if (request == null || request.getNom() == null || request.getNom().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "nom obligatoire");
        }
        MedecinReferent m = new MedecinReferent();
        apply(m, request, true);
        return ResponseEntity.status(HttpStatus.CREATED).body(medecinReferentRepository.save(m));
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasAuthority('" + PermissionCatalog.USER_MANAGE + "')")
    public MedecinReferent patch(
            @PathVariable Long id, @RequestBody MedecinReferentWriteRequest request) {
        MedecinReferent m =
                medecinReferentRepository
                        .findById(id)
                        .orElseThrow(() -> ApiException.notFound("Médecin introuvable"));
        apply(m, request, false);
        return medecinReferentRepository.save(m);
    }

    @GetMapping("/{id}/stats")
    @PreAuthorize("hasAuthority('" + PermissionCatalog.EXAM_READ + "')")
    public MedecinStatsDto stats(@PathVariable Long id) {
        if (!medecinReferentRepository.existsById(id)) {
            throw ApiException.notFound("Médecin introuvable");
        }
        long count = examenRepository.countByPrescripteurId(id);
        LocalDateTime last = count == 0 ? null : examenRepository.findLastExamenAtByPrescripteurId(id);
        return MedecinStatsDto.builder().examensCount(count).lastExamenAt(last).build();
    }

    private static void apply(MedecinReferent m, MedecinReferentWriteRequest request, boolean creating) {
        if (request == null) {
            return;
        }
        if (request.getNom() != null && !request.getNom().isBlank()) {
            m.setNom(request.getNom().trim());
        } else if (creating) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "nom obligatoire");
        }
        if (request.getTelephone() != null) {
            m.setTelephone(blankToNull(request.getTelephone()));
        }
        if (request.getEmail() != null) {
            m.setEmail(blankToNull(request.getEmail()));
        }
        if (request.getSpecialite() != null) {
            m.setSpecialite(blankToNull(request.getSpecialite()));
        }
        if (request.getAdresse() != null) {
            m.setAdresse(blankToNull(request.getAdresse()));
        }
        if (request.getVille() != null) {
            m.setVille(blankToNull(request.getVille()));
        }
        if (request.getQuartier() != null) {
            m.setQuartier(blankToNull(request.getQuartier()));
        }
        if (request.getEtablissement() != null) {
            m.setEtablissement(blankToNull(request.getEtablissement()));
        }
        if (request.getActif() != null) {
            m.setActif(request.getActif());
        } else if (creating) {
            m.setActif(true);
        }
    }

    private static String blankToNull(String v) {
        return v == null || v.isBlank() ? null : v.trim();
    }
}
