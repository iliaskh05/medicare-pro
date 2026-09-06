package com.crm.medicare.repository;

import com.crm.medicare.entity.RoleUtilisateur;
import com.crm.medicare.entity.Utilisateur;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface UtilisateurRepository extends JpaRepository<Utilisateur, Long> {

    Optional<Utilisateur> findByEmail(String email);

    boolean existsByEmail(String email);

    List<Utilisateur> findByRoleOrderByNomCompletAsc(RoleUtilisateur role);

    @Query(
            """
            SELECT u FROM Utilisateur u
            WHERE u.deletedAt IS NULL
              AND u.enabled = true
              AND u.id <> :excludeId
              AND (
                LOWER(u.nomComplet) LIKE LOWER(CONCAT('%', :q, '%'))
                OR LOWER(u.email) LIKE LOWER(CONCAT('%', :q, '%'))
              )
            ORDER BY u.nomComplet ASC
            """)
    List<Utilisateur> searchActiveDirectory(
            @Param("q") String q, @Param("excludeId") Long excludeId);

    @Query(
            """
            SELECT u FROM Utilisateur u
            WHERE u.deletedAt IS NULL AND u.enabled = true
            """)
    List<Utilisateur> findAllActive();
}
