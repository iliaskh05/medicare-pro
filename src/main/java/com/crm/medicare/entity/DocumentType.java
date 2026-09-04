package com.crm.medicare.entity;

/** Types de documents normalisés à l'upload. */
public enum DocumentType {
    PRESCRIPTION,
    REPORT,
    INVOICE,
    RECEIPT,
    INSURANCE,
    OTHER;

    public static DocumentType normalize(String raw) {
        if (raw == null || raw.isBlank()) {
            return OTHER;
        }
        String v = raw.trim().toUpperCase().replace('-', '_').replace(' ', '_');
        return switch (v) {
            case "PRESCRIPTION", "ORDONNANCE", "RX" -> PRESCRIPTION;
            case "REPORT", "COMPTE_RENDU", "CR", "COMPTE-RENDU" -> REPORT;
            case "INVOICE", "FACTURE" -> INVOICE;
            case "RECEIPT", "RECU", "REÇU", "ACQUITTE" -> RECEIPT;
            case "INSURANCE", "MUTUELLE", "ASSURANCE" -> INSURANCE;
            case "CIN", "ID", "IDENTITE", "IDENTITY" -> OTHER;
            case "IMAGERIE", "DICOM", "IMAGE", "OTHER", "DOCUMENT", "AUTRE" -> OTHER;
            default -> {
                try {
                    yield DocumentType.valueOf(v);
                } catch (IllegalArgumentException ex) {
                    yield OTHER;
                }
            }
        };
    }
}
