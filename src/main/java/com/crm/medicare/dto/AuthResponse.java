package com.crm.medicare.dto;

import com.crm.medicare.entity.RoleUtilisateur;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuthResponse {

    private String token;

    private UtilisateurInfo utilisateur;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UtilisateurInfo {
        private Long id;
        private String nom;
        private RoleUtilisateur role;
    }
}
