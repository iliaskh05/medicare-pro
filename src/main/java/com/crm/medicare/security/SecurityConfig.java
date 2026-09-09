package com.crm.medicare.security;

import com.crm.medicare.common.ApiErrorResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Instant;
import java.util.Arrays;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final UserDetailsService userDetailsService;
    private final ObjectMapper objectMapper;

    @Value("${radiocrm.cors.allowed-origins:http://localhost:8081,http://localhost:5173}")
    private String allowedOrigins;

    @Value("${radiocrm.cors.allow-private-lan:true}")
    private boolean allowPrivateLan;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http.csrf(AbstractHttpConfigurer::disable)
                .cors(Customizer.withDefaults())
                .sessionManagement(
                        session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .exceptionHandling(
                        exceptions ->
                                exceptions
                                        .authenticationEntryPoint(authenticationEntryPoint())
                                        .accessDeniedHandler(accessDeniedHandler()))
                .authorizeHttpRequests(
                        auth ->
                                auth.requestMatchers(
                                                HttpMethod.POST,
                                                "/api/auth/login",
                                                "/api/auth/register",
                                                "/api/v1/auth/login",
                                                "/api/v1/auth/register",
                                                "/api/auth/forgot-password",
                                                "/api/auth/reset-password",
                                                "/api/v1/auth/forgot-password",
                                                "/api/v1/auth/reset-password")
                                        .permitAll()
                                        .requestMatchers(
                                                "/api/system/health",
                                                "/api/v1/system/health",
                                                "/actuator/health",
                                                "/actuator/health/**",
                                                "/actuator/info")
                                        .permitAll()
                                        .requestMatchers("/ws/chat", "/ws/chat/**")
                                        .permitAll()
                                        .requestMatchers(HttpMethod.OPTIONS, "/**")
                                        .permitAll()
                                        .anyRequest()
                                        .authenticated())
                .authenticationProvider(authenticationProvider())
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        List<String> explicit =
                Arrays.stream(allowedOrigins.split(","))
                        .map(String::trim)
                        .filter(s -> !s.isBlank())
                        .toList();
        return request -> {
            CorsConfiguration configuration = new CorsConfiguration();
            String origin = request.getHeader("Origin");
            if (origin != null && isAllowedOrigin(origin, explicit)) {
                configuration.setAllowedOrigins(List.of(origin));
            } else if (origin == null) {
                configuration.setAllowedOrigins(explicit);
            }
            configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
            configuration.setAllowedHeaders(List.of("*"));
            configuration.setExposedHeaders(List.of("Authorization", "X-Correlation-Id"));
            configuration.setAllowCredentials(false);
            configuration.setMaxAge(3600L);
            return configuration;
        };
    }

    private boolean isAllowedOrigin(String origin, List<String> explicit) {
        if (explicit.stream().anyMatch(origin::equalsIgnoreCase)) {
            return true;
        }
        if (!allowPrivateLan) {
            return false;
        }
        try {
            java.net.URI uri = java.net.URI.create(origin);
            String scheme = uri.getScheme();
            String host = uri.getHost();
            if (host == null) {
                return "tauri".equalsIgnoreCase(scheme);
            }
            if ("tauri".equalsIgnoreCase(scheme) || "https://tauri.localhost".equalsIgnoreCase(origin)) {
                return true;
            }
            if ("localhost".equalsIgnoreCase(host) || "127.0.0.1".equals(host) || "::1".equals(host)) {
                return "http".equalsIgnoreCase(scheme) || "https".equalsIgnoreCase(scheme);
            }
            return isPrivateLanHost(host);
        } catch (Exception ex) {
            return false;
        }
    }

    /** RFC1918 + loopback — clients du centre, jamais un wildcard public. */
    static boolean isPrivateLanHost(String host) {
        if (host.startsWith("192.168.")) {
            return true;
        }
        if (host.startsWith("10.")) {
            return true;
        }
        if (host.startsWith("172.")) {
            String[] parts = host.split("\\.");
            if (parts.length >= 2) {
                try {
                    int second = Integer.parseInt(parts[1]);
                    return second >= 16 && second <= 31;
                } catch (NumberFormatException ignored) {
                    return false;
                }
            }
        }
        return false;
    }

    @Bean
    public AuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider();
        provider.setUserDetailsService(userDetailsService);
        provider.setPasswordEncoder(passwordEncoder());
        return provider;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration configuration)
            throws Exception {
        return configuration.getAuthenticationManager();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationEntryPoint authenticationEntryPoint() {
        return (request, response, authException) -> {
            response.setStatus(HttpStatus.UNAUTHORIZED.value());
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            objectMapper.writeValue(
                    response.getOutputStream(),
                    ApiErrorResponse.builder()
                            .timestamp(Instant.now().toString())
                            .status(401)
                            .code("unauthorized")
                            .message("Votre session a expiré. Veuillez vous reconnecter.")
                            .path(request.getRequestURI())
                            .correlationId(com.crm.medicare.common.CorrelationIdFilter.currentOrUnknown())
                            .build());
        };
    }

    @Bean
    public AccessDeniedHandler accessDeniedHandler() {
        return (request, response, accessDeniedException) -> {
            response.setStatus(HttpStatus.FORBIDDEN.value());
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            objectMapper.writeValue(
                    response.getOutputStream(),
                    ApiErrorResponse.builder()
                            .timestamp(Instant.now().toString())
                            .status(403)
                            .code("forbidden")
                            .message("Vous n'avez pas les droits nécessaires pour effectuer cette action.")
                            .path(request.getRequestURI())
                            .correlationId(com.crm.medicare.common.CorrelationIdFilter.currentOrUnknown())
                            .build());
        };
    }
}
