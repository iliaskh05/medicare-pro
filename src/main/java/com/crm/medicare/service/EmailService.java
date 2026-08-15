package com.crm.medicare.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username:}")
    private String mailFrom;

    @Async
    public void envoyerEmailBienvenue(String email, String nomComplet, String role) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            if (mailFrom != null && !mailFrom.isBlank() && !mailFrom.startsWith("VOTRE_")) {
                message.setFrom(mailFrom);
            }
            message.setTo(email);
            message.setSubject("Bienvenue sur RadioCRM - Vos accès");
            message.setText(
                    """
                    Bonjour %s,

                    Bienvenue sur RadioCRM, la plateforme du Centre d'Imagerie Bentachfine.

                    Votre compte a été créé avec le rôle : %s.

                    Vous pouvez dès à présent vous connecter avec votre adresse e-mail professionnelle
                    pour accéder à la worklist, aux dossiers patients et aux outils du centre.

                    Cordialement,
                    L'équipe RadioCRM
                    Centre d'Imagerie Bentachfine
                    """
                            .formatted(nomComplet, role));

            mailSender.send(message);
            log.info("E-mail de bienvenue envoyé à {}", email);
        } catch (Exception ex) {
            // L'échec SMTP ne doit pas bloquer l'inscription.
            log.warn("Échec d'envoi de l'e-mail de bienvenue à {}: {}", email, ex.getMessage());
        }
    }

    @Async
    public void envoyerEmailResetPassword(String email, String resetLink) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            if (mailFrom != null && !mailFrom.isBlank() && !mailFrom.startsWith("VOTRE_")) {
                message.setFrom(mailFrom);
            }
            message.setTo(email);
            message.setSubject("RadioCRM — Réinitialisation de votre mot de passe");
            message.setText(
                    """
                    Bonjour,

                    Une demande de réinitialisation de mot de passe a été effectuée pour votre compte RadioCRM
                    (Centre d'Imagerie Bentachfine).

                    Cliquez sur le lien ci-dessous (valide 1 heure) pour choisir un nouveau mot de passe :
                    %s

                    Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail.

                    Cordialement,
                    L'équipe RadioCRM
                    """
                            .formatted(resetLink));

            mailSender.send(message);
            log.info("E-mail de reset password envoyé à {}", email);
        } catch (Exception ex) {
            log.warn("Échec d'envoi de l'e-mail de reset à {}: {}", email, ex.getMessage());
        }
    }
}
