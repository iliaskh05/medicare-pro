package com.crm.medicare.dto;

import com.crm.medicare.entity.RoleUtilisateur;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RegisterRequest {

    private String nomComplet;

    private String email;

    private String motDePasse;

    private RoleUtilisateur role;
}
