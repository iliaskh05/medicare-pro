package com.crm.medicare.service;

import com.crm.medicare.dto.AuthResponse;
import com.crm.medicare.dto.ForgotPasswordRequest;
import com.crm.medicare.dto.LoginRequest;
import com.crm.medicare.dto.RegisterRequest;
import com.crm.medicare.dto.ResetPasswordRequest;
import com.crm.medicare.entity.PasswordResetToken;
import com.crm.medicare.entity.Utilisateur;
import com.crm.medicare.repository.PasswordResetTokenRepository;
import com.crm.medicare.repository.UtilisateurRepository;
import com.crm.medicare.security.JwtUtils;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class AuthService {

    private static final ZoneId ZONE = ZoneId.of("Africa/Casablanca");

    private final UtilisateurRepository utilisateurRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtUtils jwtUtils;
    private final EmailService emailService;

    @Value("${radiocrm.frontend-base-url:http://localhost:8081}")
    private String frontendBaseUrl;

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        validateRegister(request);

        String email = request.getEmail().trim().toLowerCase();
        if (utilisateurRepository.existsByEmail(email)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Cet email est déjà utilisé");
        }

        Utilisateur utilisateur =
                Utilisateur.builder()
                        .nomComplet(request.getNomComplet().trim())
                        .email(email)
                        .motDePasse(passwordEncoder.encode(request.getMotDePasse()))
                        .role(request.getRole())
                        .build();

        Utilisateur saved = utilisateurRepository.save(utilisateur);

        emailService.envoyerEmailBienvenue(
                saved.getEmail(), saved.getNomComplet(), saved.getRole().name());

        return toAuthResponse(saved);
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        if (request == null || isBlank(request.getEmail()) || isBlank(request.getMotDePasse())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Identifiants invalides");
        }

        String email = request.getEmail().trim().toLowerCase();

        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(email, request.getMotDePasse()));
        } catch (BadCredentialsException ex) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED, "Email ou mot de passe incorrect");
        }

        Utilisateur utilisateur =
                utilisateurRepository
                        .findByEmail(email)
                        .orElseThrow(
                                () ->
                                        new ResponseStatusException(
                                                HttpStatus.UNAUTHORIZED,
                                                "Email ou mot de passe incorrect"));

        return toAuthResponse(utilisateur);
    }

    /**
     * Demande de reset : répond toujours OK (anti-énumération d'emails).
     */
    @Transactional
    public void forgotPassword(ForgotPasswordRequest request) {
        if (request == null || isBlank(request.getEmail())) {
            return;
        }

        String email = request.getEmail().trim().toLowerCase();
        utilisateurRepository
                .findByEmail(email)
                .ifPresent(
                        utilisateur -> {
                            passwordResetTokenRepository.deleteByUtilisateur(utilisateur);

                            String token = UUID.randomUUID().toString().replace("-", "");
                            PasswordResetToken resetToken =
                                    PasswordResetToken.builder()
                                            .token(token)
                                            .utilisateur(utilisateur)
                                            .dateExpiration(LocalDateTime.now(ZONE).plusHours(1))
                                            .build();
                            passwordResetTokenRepository.save(resetToken);

                            String base = frontendBaseUrl.replaceAll("/$", "");
                            String resetLink = base + "/reset-password?token=" + token;
                            emailService.envoyerEmailResetPassword(utilisateur.getEmail(), resetLink);
                        });
    }

    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        if (request == null || isBlank(request.getToken()) || isBlank(request.getNouveauMotDePasse())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "token et nouveauMotDePasse obligatoires");
        }
        if (request.getNouveauMotDePasse().length() < 8) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Le mot de passe doit contenir au moins 8 caractères");
        }

        PasswordResetToken resetToken =
                passwordResetTokenRepository
                        .findByToken(request.getToken().trim())
                        .orElseThrow(
                                () ->
                                        new ResponseStatusException(
                                                HttpStatus.BAD_REQUEST, "Lien de réinitialisation invalide"));

        if (resetToken.getDateExpiration().isBefore(LocalDateTime.now(ZONE))) {
            passwordResetTokenRepository.delete(resetToken);
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Lien de réinitialisation expiré");
        }

        Utilisateur utilisateur = resetToken.getUtilisateur();
        utilisateur.setMotDePasse(passwordEncoder.encode(request.getNouveauMotDePasse()));
        utilisateurRepository.save(utilisateur);
        passwordResetTokenRepository.delete(resetToken);
    }

    private AuthResponse toAuthResponse(Utilisateur utilisateur) {
        String token = jwtUtils.generateToken(utilisateur);
        return AuthResponse.builder()
                .token(token)
                .utilisateur(
                        AuthResponse.UtilisateurInfo.builder()
                                .id(utilisateur.getId())
                                .nom(utilisateur.getNomComplet())
                                .role(utilisateur.getRole())
                                .build())
                .build();
    }

    private void validateRegister(RegisterRequest request) {
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Corps de requête manquant");
        }
        if (isBlank(request.getNomComplet())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "nomComplet obligatoire");
        }
        if (isBlank(request.getEmail())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "email obligatoire");
        }
        if (isBlank(request.getMotDePasse()) || request.getMotDePasse().length() < 8) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "motDePasse obligatoire (8 caractères minimum)");
        }
        if (request.getRole() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "role obligatoire");
        }
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
