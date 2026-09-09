package com.crm.medicare.service;

import com.crm.medicare.common.CorrelationIdFilter;
import com.crm.medicare.dto.SystemStatusDto;
import com.crm.medicare.ml.FraudMlClient;
import java.time.Instant;
import java.time.ZoneId;
import javax.sql.DataSource;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class SystemStatusService {

    private final DataSource dataSource;
    private final FraudMlClient fraudMlClient;
    private final Environment environment;

    @Value("${radiocrm.app.version:1.0.0-SNAPSHOT}")
    private String version;

    @Value("${radiocrm.centre.nom:}")
    private String centreNom;

    @Value("${radiocrm.centre.ville:}")
    private String centreVille;

    public SystemStatusDto snapshot() {
        String api = "UP";
        String database = probeDatabase();
        String ml = probeMl();
        String status = overall(api, database);
        return SystemStatusDto.builder()
                .version(version)
                .profile(String.join(",", environment.getActiveProfiles()))
                .timestamp(Instant.now().atZone(ZoneId.of("Africa/Casablanca")).toString())
                .api(api)
                .database(database)
                .ml(ml)
                .websocket("UP")
                .centreNom(centreNom)
                .centreVille(centreVille)
                .correlationId(CorrelationIdFilter.currentOrUnknown())
                .status(status)
                .build();
    }

    /** Réponse publique : pas de profil, pas de correlationId. */
    public SystemStatusDto publicHealth() {
        String api = "UP";
        String database = probeDatabase();
        return SystemStatusDto.builder()
                .api(api)
                .database(database)
                .status(overall(api, database))
                .build();
    }

    private static String overall(String api, String database) {
        if ("UP".equals(api) && "UP".equals(database)) {
            return "UP";
        }
        if ("DOWN".equals(api) || "DOWN".equals(database)) {
            return "DOWN".equals(api) && "DOWN".equals(database) ? "DOWN" : "DEGRADED";
        }
        return "DEGRADED";
    }

    private String probeDatabase() {
        try (var conn = dataSource.getConnection()) {
            return conn.isValid(2) ? "UP" : "DOWN";
        } catch (Exception ex) {
            return "DOWN";
        }
    }

    private String probeMl() {
        if (!fraudMlClient.isEnabled()) {
            return "DISABLED";
        }
        try {
            var node = fraudMlClient.health();
            if (node != null
                    && (node.path("ok").asBoolean(false)
                            || "ok".equalsIgnoreCase(node.path("status").asText("")))) {
                return "UP";
            }
            return "DOWN";
        } catch (Exception ex) {
            return "DOWN";
        }
    }
}
