package com.crm.medicare.controller;

import com.crm.medicare.entity.MedecinReferent;
import com.crm.medicare.repository.MedecinReferentRepository;
import com.crm.medicare.security.PermissionCatalog;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping({"/api/medecins", "/api/v1/medecins"})
@RequiredArgsConstructor
public class MedecinReferentController {

    private final MedecinReferentRepository medecinReferentRepository;

    @GetMapping
    @PreAuthorize("hasAuthority('" + PermissionCatalog.EXAM_READ + "')")
    public List<MedecinReferent> getAllMedecins() {
        return medecinReferentRepository.findAll();
    }
}
