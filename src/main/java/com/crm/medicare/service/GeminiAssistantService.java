package com.crm.medicare.service;

import com.crm.medicare.dto.AssistantChatRequest;
import com.crm.medicare.dto.AssistantChatResponse;
import com.crm.medicare.entity.Utilisateur;
import com.crm.medicare.security.SecurityUtils;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Locale;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class GeminiAssistantService {

    private static final Logger log = LoggerFactory.getLogger(GeminiAssistantService.class);

    private final ObjectMapper objectMapper;

    private final HttpClient httpClient =
            HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();

    @Value("${radiocrm.gemini.enabled:true}")
    private boolean enabled;

    @Value("${radiocrm.gemini.api-key:}")
    private String apiKey;

    @Value("${radiocrm.gemini.model:gemini-2.0-flash}")
    private String model;

    @Value("${radiocrm.gemini.api-base:https://generativelanguage.googleapis.com/v1beta}")
    private String apiBase;

    @Value("${radiocrm.centre.nom:Centre d'Imagerie}")
    private String centreNom;

    @Value("${radiocrm.centre.ville:Témara}")
    private String centreVille;

    public boolean isConfigured() {
        return enabled && apiKey != null && !apiKey.isBlank();
    }

    public AssistantChatResponse chat(AssistantChatRequest request) {
        String message = request.getMessage() == null ? "" : request.getMessage().trim();
        if (message.isEmpty()) {
            return AssistantChatResponse.builder()
                    .intent("empty")
                    .gemini(false)
                    .text("Posez une question sur RadioCRM (navigation, patients, facturation, imagerie…).")
                    .build();
        }

        if (!isConfigured()) {
            return AssistantChatResponse.builder()
                    .intent("unconfigured")
                    .gemini(false)
                    .text("")
                    .build();
        }

        try {
            String text = callGemini(message, request.getPathname(), request.getRole());
            if (text == null || text.isBlank()) {
                return AssistantChatResponse.builder().intent("empty_model").gemini(false).text("").build();
            }
            return AssistantChatResponse.builder()
                    .intent("gemini")
                    .gemini(true)
                    .text(text.trim())
                    .build();
        } catch (Exception ex) {
            log.warn("Gemini assistant error: {}", ex.toString());
            return AssistantChatResponse.builder().intent("error").gemini(false).text("").build();
        }
    }

    private String callGemini(String userMessage, String pathname, String role) throws Exception {
        return callGeminiWithModel(userMessage, pathname, role, model);
    }

    private String callGeminiWithModel(
            String userMessage, String pathname, String role, String modelName) throws Exception {
        String url =
                apiBase.replaceAll("/$", "")
                        + "/models/"
                        + modelName
                        + ":generateContent?key="
                        + apiKey;

        ObjectNode root = objectMapper.createObjectNode();
        ObjectNode system = root.putObject("system_instruction");
        ArrayNode sysParts = system.putArray("parts");
        sysParts.addObject().put("text", buildSystemPrompt(pathname, role));

        ArrayNode contents = root.putArray("contents");
        ObjectNode user = contents.addObject();
        user.put("role", "user");
        ArrayNode parts = user.putArray("parts");
        parts.addObject().put("text", userMessage);

        ObjectNode generation = root.putObject("generationConfig");
        generation.put("temperature", 0.4);
        generation.put("maxOutputTokens", 1024);

        HttpRequest httpRequest =
                HttpRequest.newBuilder()
                        .uri(URI.create(url))
                        .timeout(Duration.ofSeconds(30))
                        .header("Content-Type", "application/json")
                        .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(root)))
                        .build();

        HttpResponse<String> response =
                httpClient.send(httpRequest, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() >= 400) {
            log.warn("Gemini HTTP {} model={} : {}", response.statusCode(), modelName, abbreviate(response.body()));
            if ((response.statusCode() == 404 || response.statusCode() == 400)
                    && !"gemini-flash-latest".equals(modelName)
                    && !"gemini-3.6-flash".equals(modelName)) {
                // Repli vers le modèle recommandé / alias latest
                String fallback =
                        "gemini-3.6-flash".equals(modelName) ? "gemini-flash-latest" : "gemini-3.6-flash";
                return callGeminiWithModel(userMessage, pathname, role, fallback);
            }
            if (response.statusCode() == 404 && "gemini-3.6-flash".equals(modelName)) {
                return callGeminiWithModel(userMessage, pathname, role, "gemini-flash-latest");
            }
            throw new IllegalStateException("Gemini status " + response.statusCode());
        }

        JsonNode tree = objectMapper.readTree(response.body());
        JsonNode candidates = tree.path("candidates");
        if (!candidates.isArray() || candidates.isEmpty()) {
            return "";
        }
        JsonNode partsNode = candidates.get(0).path("content").path("parts");
        if (!partsNode.isArray()) {
            return "";
        }
        StringBuilder sb = new StringBuilder();
        for (JsonNode part : partsNode) {
            if (part.hasNonNull("text")) {
                sb.append(part.get("text").asText());
            }
        }
        return sb.toString();
    }

    private String buildSystemPrompt(String pathname, String role) {
        Utilisateur user = SecurityUtils.currentUserOrNull();
        String userLabel =
                user != null && user.getNomComplet() != null
                        ? user.getNomComplet()
                        : "utilisateur connecté";
        String roleLabel = role == null || role.isBlank() ? "staff" : role.toLowerCase(Locale.ROOT);
        String path = pathname == null || pathname.isBlank() ? "/" : pathname;

        return """
                Tu es l'Assistant RadioCRM du %s (%s).
                Tu aides le personnel (accueil, manipulateurs, radiologues, direction) à utiliser
                la plateforme de gestion du centre d'imagerie médicale.

                Contexte session :
                - Utilisateur : %s
                - Rôle UI : %s
                - Page ouverte : %s

                Pages principales :
                - /dashboard : KPI, tension planning, alertes
                - /patients : dossiers patients, nouveau patient, mutuelle
                - /facturation : factures MAD, paiements, export comptable
                - /imagerie : examens par modalité
                - /viewer : visionneuse + calque IA (aide, pas diagnostic)
                - /audit : anomalies / conformité (direction)
                - /medecins : médecins référents
                - /chat : messagerie interne équipe
                - /whatsapp : rappels patients

                Règles strictes :
                1. Réponds en français, clair, concis (markdown léger autorisé).
                2. Guide sur l'usage RadioCRM ; ne invente pas de résultats médicaux ni de diagnostics.
                3. Si on demande d'ouvrir une page, indique le chemin et décris brièvement l'écran.
                4. Ne divulgue jamais de secrets, clés API, mots de passe ou données patients inventées.
                5. Si la question est hors sujet, recentre poliment sur RadioCRM.
                """
                .formatted(centreNom, centreVille, userLabel, roleLabel, path);
    }

    private static String abbreviate(String body) {
        if (body == null) {
            return "";
        }
        return body.length() <= 300 ? body : body.substring(0, 300) + "…";
    }
}
