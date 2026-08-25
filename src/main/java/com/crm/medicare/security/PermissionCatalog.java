package com.crm.medicare.security;

import com.crm.medicare.entity.RoleUtilisateur;
import java.util.Collections;
import java.util.EnumMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

/**
 * Permissions Spring Security ({@code hasAuthority}).
 * Le masquage UI est dans {@code src/lib/rbac.ts} — l'autorisation réelle est ici.
 *
 * <p>Aliases métier (même valeur JWT que la permission canonique) pour lisibilité API :
 * APPOINTMENT_* ↔ EXAM_*, PAYMENT_READ ↔ INVOICE_READ, WORKLIST_READ ↔ EXAM_READ.
 */
public final class PermissionCatalog {

    public static final String PATIENT_READ = "PATIENT_READ";
    public static final String PATIENT_CREATE = "PATIENT_CREATE";
    public static final String PATIENT_UPDATE = "PATIENT_UPDATE";
    public static final String PATIENT_WRITE = PATIENT_UPDATE;

    public static final String EXAM_READ = "EXAM_READ";
    public static final String EXAM_CREATE = "EXAM_CREATE";
    public static final String EXAM_UPDATE = "EXAM_UPDATE";
    public static final String EXAM_WRITE = EXAM_UPDATE;

    public static final String APPOINTMENT_READ = EXAM_READ;
    public static final String APPOINTMENT_CREATE = EXAM_CREATE;
    public static final String APPOINTMENT_UPDATE = EXAM_UPDATE;
    public static final String APPOINTMENT_WRITE = EXAM_UPDATE;

    public static final String WORKLIST_ASSIGN = "WORKLIST_ASSIGN";
    public static final String WORKLIST_READ = EXAM_READ;

    public static final String REPORT_READ = "REPORT_READ";
    public static final String REPORT_WRITE = "REPORT_WRITE";
    public static final String REPORT_VALIDATE = "REPORT_VALIDATE";
    public static final String REPORT_AMEND = "REPORT_AMEND";

    public static final String INVOICE_READ = "INVOICE_READ";
    public static final String INVOICE_CREATE = "INVOICE_CREATE";
    public static final String INVOICE_WRITE = INVOICE_CREATE;
    public static final String PAYMENT_CREATE = "PAYMENT_CREATE";
    public static final String PAYMENT_READ = INVOICE_READ;
    public static final String PAYMENT_WRITE = PAYMENT_CREATE;

    public static final String DOCUMENT_READ = "DOCUMENT_READ";
    public static final String DOCUMENT_DOWNLOAD = "DOCUMENT_DOWNLOAD";
    public static final String DOCUMENT_WRITE = "DOCUMENT_WRITE";

    public static final String SETTINGS_READ = "SETTINGS_READ";
    public static final String SETTINGS_WRITE = "SETTINGS_WRITE";

    public static final String AUDIT_READ = "AUDIT_READ";
    public static final String FRAUD_REVIEW = "FRAUD_REVIEW";
    public static final String FRAUD_READ = FRAUD_REVIEW;
    public static final String USER_MANAGE = "USER_MANAGE";
    public static final String NOTIFICATION_MANAGE = "NOTIFICATION_MANAGE";

    private static final Set<String> ALL = Set.copyOf(baseAll());

    private static Set<String> baseAll() {
        Set<String> s = new HashSet<>();
        s.add(PATIENT_READ);
        s.add(PATIENT_CREATE);
        s.add(PATIENT_UPDATE);
        s.add(EXAM_READ);
        s.add(EXAM_CREATE);
        s.add(EXAM_UPDATE);
        s.add(WORKLIST_ASSIGN);
        s.add(REPORT_READ);
        s.add(REPORT_WRITE);
        s.add(REPORT_VALIDATE);
        s.add(REPORT_AMEND);
        s.add(INVOICE_READ);
        s.add(INVOICE_CREATE);
        s.add(PAYMENT_CREATE);
        s.add(DOCUMENT_READ);
        s.add(DOCUMENT_DOWNLOAD);
        s.add(DOCUMENT_WRITE);
        s.add(SETTINGS_READ);
        s.add(SETTINGS_WRITE);
        s.add(AUDIT_READ);
        s.add(FRAUD_REVIEW);
        s.add(USER_MANAGE);
        s.add(NOTIFICATION_MANAGE);
        return s;
    }

    private static final Set<String> ACCUEIL =
            Set.of(
                    PATIENT_READ,
                    PATIENT_CREATE,
                    PATIENT_UPDATE,
                    EXAM_READ,
                    EXAM_CREATE,
                    EXAM_UPDATE,
                    INVOICE_READ,
                    INVOICE_CREATE,
                    PAYMENT_CREATE,
                    DOCUMENT_READ,
                    DOCUMENT_DOWNLOAD,
                    DOCUMENT_WRITE,
                    SETTINGS_READ);

    private static final Set<String> RADIOLOGUE =
            Set.of(
                    PATIENT_READ,
                    EXAM_READ,
                    EXAM_UPDATE,
                    WORKLIST_ASSIGN,
                    REPORT_READ,
                    REPORT_WRITE,
                    REPORT_VALIDATE,
                    REPORT_AMEND,
                    DOCUMENT_READ,
                    DOCUMENT_DOWNLOAD,
                    DOCUMENT_WRITE);

    private static final Set<String> MANIPULATEUR =
            Set.of(PATIENT_READ, EXAM_READ, EXAM_UPDATE, WORKLIST_ASSIGN, DOCUMENT_READ);

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
