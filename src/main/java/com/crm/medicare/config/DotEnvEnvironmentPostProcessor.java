package com.crm.medicare.config;

import java.io.BufferedReader;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.HashMap;
import java.util.Map;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.core.Ordered;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;

/**
 * Charge un fichier {@code .env} à la racine du projet (dev local) sans dépendre
 * d'une lib tierce. N'écrase pas les variables déjà définies dans l'OS.
 */
public class DotEnvEnvironmentPostProcessor implements EnvironmentPostProcessor, Ordered {

    @Override
    public void postProcessEnvironment(ConfigurableEnvironment environment, SpringApplication application) {
        Path envFile = Path.of(System.getProperty("user.dir"), ".env");
        if (!Files.isRegularFile(envFile)) {
            return;
        }
        Map<String, Object> values = new HashMap<>();
        try (BufferedReader reader = Files.newBufferedReader(envFile, StandardCharsets.UTF_8)) {
            String line;
            while ((line = reader.readLine()) != null) {
                String trimmed = line.trim();
                if (trimmed.isEmpty() || trimmed.startsWith("#")) {
                    continue;
                }
                int eq = trimmed.indexOf('=');
                if (eq <= 0) {
                    continue;
                }
                String key = trimmed.substring(0, eq).trim();
                String value = trimmed.substring(eq + 1).trim();
                if ((value.startsWith("\"") && value.endsWith("\""))
                        || (value.startsWith("'") && value.endsWith("'"))) {
                    value = value.substring(1, value.length() - 1);
                }
                if (environment.getProperty(key) == null && System.getenv(key) == null) {
                    values.put(key, value);
                }
            }
        } catch (IOException ignored) {
            return;
        }
        if (!values.isEmpty()) {
            environment.getPropertySources().addFirst(new MapPropertySource("dotenvFile", values));
        }
    }

    @Override
    public int getOrder() {
        return Ordered.HIGHEST_PRECEDENCE + 10;
    }
}
