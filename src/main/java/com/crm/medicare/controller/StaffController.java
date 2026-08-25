package com.crm.medicare.controller;

import com.crm.medicare.entity.RoleUtilisateur;
import com.crm.medicare.entity.Utilisateur;
import com.crm.medicare.repository.UtilisateurRepository;
import com.crm.medicare.security.PermissionCatalog;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
public class StaffController {

    private final UtilisateurRepository utilisateurRepository;

    /** Radiologues actifs — filtre worklist/agenda par id stable. */
    @GetMapping({"/api/staff/radiologues", "/api/v1/staff/radiologues"})
    @PreAuthorize("hasAuthority('" + PermissionCatalog.EXAM_READ + "')")
    public List<Map<String, String>> radiologues() {
        return utilisateurRepository.findByRoleOrderByNomCompletAsc(RoleUtilisateur.RADIOLOGUE).stream()
                .filter(u -> u.isEnabled())
                .map(
                        u ->
                                Map.of(
                                        "id", String.valueOf(u.getId()),
                                        "nomComplet", u.getNomComplet() != null ? u.getNomComplet() : ""))
                .toList();
    }
}
