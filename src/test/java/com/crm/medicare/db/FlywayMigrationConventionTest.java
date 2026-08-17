package com.crm.medicare.db;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;

class FlywayMigrationConventionTest {

    @Test
    void versionedMigrationsAreSequentialAndDoNotCreateDeferredDomainTables() throws IOException {
        Resource[] resources =
                new PathMatchingResourcePatternResolver().getResources("classpath:db/migration/V*.sql");
        List<String> names =
                java.util.Arrays.stream(resources).map(Resource::getFilename).sorted().toList();

        assertThat(names)
                .containsExactly(
                        "V1__baseline_existing_schema.sql",
                        "V2__rbac_audit_patient_workflow.sql",
                        "V3__schema_hardening.sql");

        String v3 = read(resources, "V3__schema_hardening.sql");
        assertThat(v3)
                .doesNotContain("CREATE TABLE IF NOT EXISTS appointments")
                .doesNotContain("CREATE TABLE IF NOT EXISTS waiting_queue")
                .doesNotContain("CREATE TABLE IF NOT EXISTS invoices")
                .doesNotContain("CREATE TABLE IF NOT EXISTS payments")
                .doesNotContain("CREATE TABLE IF NOT EXISTS imaging_studies")
                .doesNotContain("CREATE TABLE IF NOT EXISTS notifications")
                .doesNotContain("CREATE TABLE IF NOT EXISTS fraud_alerts");
        assertThat(v3).doesNotContain("DROP TABLE");
        assertThat(v3).doesNotContain("TRUNCATE");
    }

    private static String read(Resource[] resources, String filename) throws IOException {
        for (Resource resource : resources) {
            if (filename.equals(resource.getFilename())) {
                try (InputStream in = resource.getInputStream()) {
                    return new String(in.readAllBytes(), StandardCharsets.UTF_8);
                }
            }
        }
        throw new AssertionError("Missing migration " + filename);
    }
}
