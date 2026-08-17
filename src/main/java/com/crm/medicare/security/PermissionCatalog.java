package com.crm.medicare.security;

import com.crm.medicare.entity.RoleUtilisateur;
import java.util.Collections;
import java.util.EnumMap;
import java.util.Map;
import java.util.Set;

/**
 * Permissions Spring Security (`hasAuthority`).
 * Le masquage UI est dans {@code src/lib/rbac.ts} (resource:action) — les deux
 * matrices doivent rester alignées ; l'autorisation réelle est celle-ci.
 */
public final class PermissionCatalog {

    public static final String PATIENT_READ = "PATIENT_READ";
    public static final String PATIENT_CREATE = "PATIENT_CREATE";
    public static final String PATIENT_UPDATE = "PATIENT_UPDATE";
    public static final String EXAM_READ = "EXAM_READ";
    public static final String EXAM_CREATE = "EXAM_CREATE";
    public static final String EXAM_UPDATE = "EXAM_UPDATE";
    public static final String WORKLIST_ASSIGN = "WORKLIST_ASSIGN";
    public static final String REPORT_READ = "REPORT_READ";
    public static final String REPORT_WRITE = "REPORT_WRITE";
    public static final String REPORT_VALIDATE = "REPORT_VALIDATE";
    public static final String REPORT_AMEND = "REPORT_AMEND";
    public static final String INVOICE_READ = "INVOICE_READ";
    public static final String INVOICE_CREATE = "INVOICE_CREATE";
    public static final String PAYMENT_CREATE = "PAYMENT_CREATE";
    public static final String AUDIT_READ = "AUDIT_READ";
    public static final String FRAUD_REVIEW = "FRAUD_REVIEW";
    public static final String USER_MANAGE = "USER_MANAGE";

    private static final Set<String> ALL =
            Set.of(
                    PATIENT_READ,
                    PATIENT_CREATE,
                    PATIENT_UPDATE,
                    EXAM_READ,
                    EXAM_CREATE,
                    EXAM_UPDATE,
                    WORKLIST_ASSIGN,
                    REPORT_READ,
                    REPORT_WRITE,
                    REPORT_VALIDATE,
                    REPORT_AMEND,
                    INVOICE_READ,
                    INVOICE_CREATE,
                    PAYMENT_CREATE,
                    AUDIT_READ,
                    FRAUD_REVIEW,
                    USER_MANAGE);

    private static final Set<String> ACCUEIL =
            Set.of(
                    PATIENT_READ,
                    PATIENT_CREATE,
                    PATIENT_UPDATE,
                    EXAM_READ,
                    EXAM_CREATE,
                    EXAM_UPDATE,
                    INVOICE_READ,
                    INVOICE_CREATE);

    private static final Set<String> RADIOLOGUE =
            Set.of(
                    PATIENT_READ,
                    EXAM_READ,
                    EXAM_UPDATE,
                    WORKLIST_ASSIGN,
                    REPORT_READ,
                    REPORT_WRITE,
                    REPORT_VALIDATE,
                    REPORT_AMEND);

    private static final Set<String> MANIPULATEUR =
            Set.of(PATIENT_READ, EXAM_READ, EXAM_UPDATE, WORKLIST_ASSIGN);

    private static final Set<String> CAISSIER =
            Set.of(PATIENT_READ, INVOICE_READ, INVOICE_CREATE, PAYMENT_CREATE);

    private static final Set<String> COMPTABLE = Set.of(PATIENT_READ, INVOICE_READ);

    private static final Set<String> AUDITEUR =
            Set.of(PATIENT_READ, EXAM_READ, REPORT_READ, INVOICE_READ, AUDIT_READ, FRAUD_REVIEW);

    private static final Map<RoleUtilisateur, Set<String>> BY_ROLE;

    static {
        EnumMap<RoleUtilisateur, Set<String>> map = new EnumMap<>(RoleUtilisateur.class);
        map.put(RoleUtilisateur.DIRECTEUR, ALL);
        map.put(RoleUtilisateur.RADIOLOGUE, RADIOLOGUE);
        map.put(RoleUtilisateur.MANIPULATEUR, MANIPULATEUR);
        map.put(RoleUtilisateur.SECRETARIAT, ACCUEIL);
        BY_ROLE = Collections.unmodifiableMap(map);
    }

    private PermissionCatalog() {}

    public static Set<String> forRole(RoleUtilisateur role) {
        if (role == null) {
            return Set.of();
        }
        return BY_ROLE.getOrDefault(role, Set.of());
    }

    public static Set<String> all() {
        return ALL;
    }
}
