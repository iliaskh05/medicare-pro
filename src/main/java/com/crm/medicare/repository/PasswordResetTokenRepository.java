package com.crm.medicare.repository;

import com.crm.medicare.entity.PasswordResetToken;
import com.crm.medicare.entity.Utilisateur;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, Long> {

    Optional<PasswordResetToken> findByToken(String token);

    void deleteByUtilisateur(Utilisateur utilisateur);

    void deleteByToken(String token);
}
