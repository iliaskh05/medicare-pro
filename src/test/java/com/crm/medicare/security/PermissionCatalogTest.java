package com.crm.medicare.security;

import static org.assertj.core.api.Assertions.assertThat;

import com.crm.medicare.entity.RoleUtilisateur;
import org.junit.jupiter.api.Test;

class PermissionCatalogTest {

    @Test
    void directeurHasPatientAndAuditPermissions() {
        assertThat(PermissionCatalog.forRole(RoleUtilisateur.DIRECTEUR))
                .contains(
                        PermissionCatalog.PATIENT_READ,
                        PermissionCatalog.PATIENT_CREATE,
                        PermissionCatalog.AUDIT_READ,
                        PermissionCatalog.USER_MANAGE);
    }

    @Test
    void secretariatCannotValidateReports() {
        assertThat(PermissionCatalog.forRole(RoleUtilisateur.SECRETARIAT))
                .contains(
                        PermissionCatalog.PATIENT_CREATE,
                        PermissionCatalog.EXAM_CREATE,
                        PermissionCatalog.PAYMENT_CREATE,
                        PermissionCatalog.DOCUMENT_READ,
                        PermissionCatalog.DOCUMENT_DOWNLOAD)
                .doesNotContain(PermissionCatalog.REPORT_VALIDATE, PermissionCatalog.AUDIT_READ);
    }

    @Test
    void radiologueCanValidateButNotPay() {
        assertThat(PermissionCatalog.forRole(RoleUtilisateur.RADIOLOGUE))
                .contains(
                        PermissionCatalog.REPORT_VALIDATE,
                        PermissionCatalog.WORKLIST_ASSIGN,
                        PermissionCatalog.DOCUMENT_READ,
                        PermissionCatalog.DOCUMENT_DOWNLOAD)
                .doesNotContain(PermissionCatalog.PAYMENT_CREATE);
    }

    @Test
    void directeurHasDocumentAndSettingsPermissions() {
        assertThat(PermissionCatalog.forRole(RoleUtilisateur.DIRECTEUR))
                .contains(
                        PermissionCatalog.DOCUMENT_READ,
                        PermissionCatalog.DOCUMENT_DOWNLOAD,
                        PermissionCatalog.NOTIFICATION_MANAGE,
                        PermissionCatalog.SETTINGS_READ,
                        PermissionCatalog.SETTINGS_WRITE);
        assertThat(PermissionCatalog.WORKLIST_READ).isEqualTo(PermissionCatalog.EXAM_READ);
        assertThat(PermissionCatalog.FRAUD_READ).isEqualTo(PermissionCatalog.FRAUD_REVIEW);
        assertThat(PermissionCatalog.APPOINTMENT_READ).isEqualTo(PermissionCatalog.EXAM_READ);
        assertThat(PermissionCatalog.PAYMENT_READ).isEqualTo(PermissionCatalog.INVOICE_READ);
    }
}
