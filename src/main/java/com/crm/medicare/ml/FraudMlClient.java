package com.crm.medicare.ml;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class FraudMlClient {

    private static final Logger log = LoggerFactory.getLogger(FraudMlClient.class);

    private final ObjectMapper objectMapper;

    private final HttpClient httpClient =
            HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();

    @Value("${radiocrm.ml.enabled:false}")
    private boolean enabled;

    @Value("${radiocrm.ml.base-url:http://127.0.0.1:8090}")
    private String baseUrl;

    @Value("${radiocrm.ml.api-key:}")
    private String apiKey;

    @Value("${radiocrm.ml.timeout-ms:15000}")
    private long timeoutMs;

    public boolean isEnabled() {
        return enabled && baseUrl != null && !baseUrl.isBlank();
    }

    public JsonNode score(Map<String, Object> operationPayload) {
        if (!isEnabled()) {
            throw new IllegalStateException("Service ML désactivé (radiocrm.ml.enabled=false)");
        }
        try {
            String body = objectMapper.writeValueAsString(operationPayload);
            HttpRequest.Builder builder =
                    HttpRequest.newBuilder()
                            .uri(URI.create(trimSlash(baseUrl) + "/score"))
                            .timeout(Duration.ofMillis(timeoutMs))
                            .header("Content-Type", "application/json")
                            .header("Accept", "application/json")
                            .POST(HttpRequest.BodyPublishers.ofString(body));
            if (apiKey != null && !apiKey.isBlank()) {
                builder.header("X-API-Key", apiKey);
            }
            HttpResponse<String> response =
                    httpClient.send(builder.build(), HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                log.warn("ML /score HTTP {} — {}", response.statusCode(), truncate(response.body()));
                throw new IllegalStateException("ML service HTTP " + response.statusCode());
            }
            JsonNode root = objectMapper.readTree(response.body());
            if (root.has("data")) {
                return root.get("data");
            }
            return root;
        } catch (IllegalStateException ex) {
            throw ex;
        } catch (Exception ex) {
            log.warn("Appel ML /score échoué: {}", ex.getMessage());
            throw new IllegalStateException("Service ML injoignable", ex);
        }
    }

    public JsonNode health() {
        if (!isEnabled()) {
            return objectMapper.createObjectNode().put("ok", false);
        }
        try {
            HttpRequest request =
                    HttpRequest.newBuilder()
                            .uri(URI.create(trimSlash(baseUrl) + "/health"))
                            .timeout(Duration.ofMillis(5000))
                            .GET()
                            .build();
            HttpResponse<String> response =
                    httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() >= 200 && response.statusCode() < 300) {
                return objectMapper.readTree(response.body());
            }
        } catch (Exception ex) {
            log.debug("ML health check failed: {}", ex.getMessage());
        }
        return objectMapper.createObjectNode().put("ok", false);
    }

    private static String trimSlash(String url) {
        return url.endsWith("/") ? url.substring(0, url.length() - 1) : url;
    }

    private static String truncate(String value) {
        if (value == null) {
            return "";
        }
        return value.length() > 200 ? value.substring(0, 200) + "…" : value;
    }
}
