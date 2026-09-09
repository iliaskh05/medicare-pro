package com.crm.medicare.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

@Component
@Profile("prod")
@Order(0)
public class ProdSafetyValidator implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(ProdSafetyValidator.class);

    @Value("${radiocrm.jwt.secret:}")
    private String jwtSecret;

    @Value("${spring.datasource.password:}")
    private String dbPassword;

    @Override
    public void run(ApplicationArguments args) {
        if (jwtSecret == null || jwtSecret.isBlank() || jwtSecret.length() < 32) {
            throw new IllegalStateException(
                    "Production refuse de démarrer : RADIOCRM_JWT_SECRET est obligatoire (au moins 32 caractères).");
        }
        if (dbPassword == null || dbPassword.isBlank() || "postgres".equals(dbPassword) || "change-me".equals(dbPassword)) {
            throw new IllegalStateException(
                    "Production refuse de démarrer : DB_PASSWORD doit être défini et ne pas être un mot de passe par défaut.");
        }
        log.info("Contrôles de sécurité production OK (JWT et mot de passe base non triviaux).");
    }
}
