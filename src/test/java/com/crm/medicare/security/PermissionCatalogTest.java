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
                .contains(PermissionCatalog.PATIENT_CREATE, PermissionCatalog.EXAM_CREATE)
                .doesNotContain(PermissionCatalog.REPORT_VALIDATE, PermissionCatalog.AUDIT_READ);
    }

    @Test
    void radiologueCanValidateButNotPay() {
        assertThat(PermissionCatalog.forRole(RoleUtilisateur.RADIOLOGUE))
                .contains(PermissionCatalog.REPORT_VALIDATE, PermissionCatalog.WORKLIST_ASSIGN)
                .doesNotContain(PermissionCatalog.PAYMENT_CREATE);
    }
}
