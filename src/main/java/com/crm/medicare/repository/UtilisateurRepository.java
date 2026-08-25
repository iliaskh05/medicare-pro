package com.crm.medicare.repository;

import com.crm.medicare.entity.RoleUtilisateur;
import com.crm.medicare.entity.Utilisateur;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface UtilisateurRepository extends JpaRepository<Utilisateur, Long> {

    Optional<Utilisateur> findByEmail(String email);

    boolean existsByEmail(String email);

    List<Utilisateur> findByRoleOrderByNomCompletAsc(RoleUtilisateur role);
}
