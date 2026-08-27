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
                java.util.Arrays.stream(resources)
                        .map(Resource::getFilename)
                        .sorted(
                                java.util.Comparator.comparingInt(
                                        name -> {
                                            int start = name.indexOf('V') + 1;
                                            int end = name.indexOf("__");
                                            return Integer.parseInt(name.substring(start, end));
                                        }))
                        .toList();

        assertThat(names)
                .containsExactly(
                        "V1__baseline_existing_schema.sql",
                        "V2__rbac_audit_patient_workflow.sql",
                        "V3__schema_hardening.sql",
                        "V4__ris_operations.sql",
                        "V5__appointments_resources.sql",
                        "V6__waiting_room_arrived_at.sql",
                        "V7__worklist_indexes.sql",
                        "V8__reports_versioned.sql",
                        "V9__invoices_payments.sql",
                        "V10__insurance.sql",
                        "V11__imaging_studies.sql",
                        "V12__notifications_rbac_aliases.sql",
                        "V13__app_settings_payment_source.sql",
                        "V14__examen_resource_payment_source.sql",
                        "V15__catalogue_demo_import.sql",
                        "V16__chat_messaging.sql");

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
        assertThat(v3).doesNotContain("TRUNCATE TABLE");

        String v4 = read(resources, "V4__ris_operations.sql");
        assertThat(v4)
                .contains("catalogue_examens")
                .contains("paiements_examen")
                .contains("documents_examen")
                .doesNotContain("CREATE TABLE IF NOT EXISTS appointments")
                .doesNotContain("DROP TABLE")
                .doesNotContain("TRUNCATE TABLE");

        String v5 = read(resources, "V5__appointments_resources.sql");
        assertThat(v5)
                .contains("CREATE TABLE IF NOT EXISTS resources")
                .contains("CREATE TABLE IF NOT EXISTS appointments")
                .contains("CREATE TABLE IF NOT EXISTS appointment_status_history")
                .doesNotContain("DROP TABLE")
                .doesNotContain("TRUNCATE TABLE");

        String v6 = read(resources, "V6__waiting_room_arrived_at.sql");
        assertThat(v6).contains("arrived_at").doesNotContain("DROP TABLE").doesNotContain("TRUNCATE TABLE");

        String v7 = read(resources, "V7__worklist_indexes.sql");
        assertThat(v7)
                .contains("idx_examens_date_modalite")
                .contains("idx_examens_radiologue_date")
                .doesNotContain("DROP TABLE")
                .doesNotContain("TRUNCATE TABLE");

        String v8 = read(resources, "V8__reports_versioned.sql");
        assertThat(v8)
                .contains("CREATE TABLE IF NOT EXISTS reports")
                .contains("CREATE TABLE IF NOT EXISTS report_versions")
                .contains("report_validations")
                .contains("report_amendments")
                .doesNotContain("DROP TABLE")
                .doesNotContain("TRUNCATE TABLE");

        String v9 = read(resources, "V9__invoices_payments.sql");
        assertThat(v9)
                .contains("CREATE TABLE IF NOT EXISTS invoices")
                .contains("CREATE TABLE IF NOT EXISTS invoice_items")
                .contains("CREATE TABLE IF NOT EXISTS payments")
                .contains("CREATE TABLE IF NOT EXISTS refunds")
                .doesNotContain("DROP TABLE")
                .doesNotContain("TRUNCATE TABLE");

        String v10 = read(resources, "V10__insurance.sql");
        assertThat(v10)
                .contains("CREATE TABLE IF NOT EXISTS insurance_providers")
                .contains("CREATE TABLE IF NOT EXISTS insurance_plans")
                .contains("CREATE TABLE IF NOT EXISTS coverage_rules")
                .contains("insurance_plan_id")
                .contains("etablissement")
                .doesNotContain("DROP TABLE")
                .doesNotContain("TRUNCATE TABLE");

        String v11 = read(resources, "V11__imaging_studies.sql");
        assertThat(v11)
                .contains("CREATE TABLE IF NOT EXISTS imaging_studies")
                .contains("CREATE TABLE IF NOT EXISTS imaging_series")
                .contains("CREATE TABLE IF NOT EXISTS imaging_instances")
                .doesNotContain("DROP TABLE")
                .doesNotContain("TRUNCATE TABLE");

        String v12 = read(resources, "V12__notifications_rbac_aliases.sql");
        assertThat(v12)
                .contains("CREATE TABLE IF NOT EXISTS notifications")
                .contains("CREATE TABLE IF NOT EXISTS notification_attempts")
                .contains("role_aliases")
                .doesNotContain("DROP TABLE")
                .doesNotContain("TRUNCATE TABLE");

        String v13 = read(resources, "V13__app_settings_payment_source.sql");
        assertThat(v13)
                .contains("CREATE TABLE IF NOT EXISTS app_settings")
                .contains("source_type")
                .contains("source_id")
                .doesNotContain("DROP TABLE")
                .doesNotContain("TRUNCATE TABLE");

        String v14 = read(resources, "V14__examen_resource_payment_source.sql");
        assertThat(v14)
                .contains("resource_id")
                .contains("idx_examens_resource_id")
                .contains("idx_paiements_examen_source")
                .contains("display.worklist")
                .doesNotContain("DROP TABLE")
                .doesNotContain("TRUNCATE TABLE");

        String v15 = read(resources, "V15__catalogue_demo_import.sql");
        assertThat(v15)
                .contains("national_reference_price")
                .contains("data_import_jobs")
                .contains("demo_dataset_markers")
                .doesNotContain("DROP TABLE")
                .doesNotContain("TRUNCATE TABLE");
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
