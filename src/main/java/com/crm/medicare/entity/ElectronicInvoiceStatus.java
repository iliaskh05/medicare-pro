package com.crm.medicare.entity;

/**
 * Statut de transmission électronique. Distinct du statut comptable {@code InvoiceStatus}.
 * Aucune API DGI n'est appelée — architecture préparatoire uniquement.
 */
public enum ElectronicInvoiceStatus {
    DRAFT,
    ISSUED,
    TRANSMISSION_PENDING,
    TRANSMITTED,
    ACCEPTED,
    REJECTED,
    CANCELLED
}
