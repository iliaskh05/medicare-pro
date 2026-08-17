package com.crm.medicare.workflow;

import com.crm.medicare.common.ApiException;
import com.crm.medicare.entity.EtatPatient;
import java.util.EnumMap;
import java.util.EnumSet;
import java.util.Map;
import java.util.Set;
import org.springframework.stereotype.Component;

@Component
public class WorkflowEngine {

    private static final Map<EncounterStatus, Set<EncounterStatus>> ENCOUNTER =
            new EnumMap<>(EncounterStatus.class);
    private static final Map<ReportStatus, Set<ReportStatus>> REPORT = new EnumMap<>(ReportStatus.class);
    private static final Map<InvoiceStatus, Set<InvoiceStatus>> INVOICE = new EnumMap<>(InvoiceStatus.class);

    static {
        ENCOUNTER.put(
                EncounterStatus.SCHEDULED,
                EnumSet.of(
                        EncounterStatus.ARRIVED,
                        EncounterStatus.WAITING,
                        EncounterStatus.CANCELLED,
                        EncounterStatus.NO_SHOW));
        ENCOUNTER.put(
                EncounterStatus.ARRIVED,
                EnumSet.of(
                        EncounterStatus.WAITING,
                        EncounterStatus.PREPARING,
                        EncounterStatus.CANCELLED,
                        EncounterStatus.NO_SHOW,
                        EncounterStatus.SCHEDULED));
        ENCOUNTER.put(
                EncounterStatus.WAITING,
                EnumSet.of(
                        EncounterStatus.PREPARING,
                        EncounterStatus.IN_PROGRESS,
                        EncounterStatus.ARRIVED,
                        EncounterStatus.CANCELLED,
                        EncounterStatus.NO_SHOW));
        ENCOUNTER.put(
                EncounterStatus.PREPARING,
                EnumSet.of(EncounterStatus.IN_PROGRESS, EncounterStatus.WAITING, EncounterStatus.CANCELLED));
        ENCOUNTER.put(
                EncounterStatus.IN_PROGRESS,
                EnumSet.of(EncounterStatus.COMPLETED, EncounterStatus.PREPARING));
        ENCOUNTER.put(
                EncounterStatus.COMPLETED,
                EnumSet.of(EncounterStatus.REPORT_PENDING, EncounterStatus.DISCHARGED));
        ENCOUNTER.put(EncounterStatus.REPORT_PENDING, EnumSet.of(EncounterStatus.VALIDATED));
        ENCOUNTER.put(
                EncounterStatus.VALIDATED,
                EnumSet.of(EncounterStatus.DISCHARGED, EncounterStatus.REPORT_PENDING));
        ENCOUNTER.put(EncounterStatus.DISCHARGED, EnumSet.noneOf(EncounterStatus.class));
        ENCOUNTER.put(EncounterStatus.CANCELLED, EnumSet.noneOf(EncounterStatus.class));
        ENCOUNTER.put(EncounterStatus.NO_SHOW, EnumSet.of(EncounterStatus.SCHEDULED));

        REPORT.put(ReportStatus.DRAFT, EnumSet.of(ReportStatus.IN_REVIEW, ReportStatus.DRAFT));
        REPORT.put(ReportStatus.IN_REVIEW, EnumSet.of(ReportStatus.VALIDATED, ReportStatus.DRAFT));
        REPORT.put(ReportStatus.VALIDATED, EnumSet.of(ReportStatus.AMENDED));
        REPORT.put(ReportStatus.AMENDED, EnumSet.of(ReportStatus.VALIDATED, ReportStatus.IN_REVIEW));

        INVOICE.put(InvoiceStatus.DRAFT, EnumSet.of(InvoiceStatus.ISSUED, InvoiceStatus.CANCELLED));
        INVOICE.put(
                InvoiceStatus.ISSUED,
                EnumSet.of(InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.PAID, InvoiceStatus.CANCELLED));
        INVOICE.put(
                InvoiceStatus.PARTIALLY_PAID,
                EnumSet.of(InvoiceStatus.PAID, InvoiceStatus.CANCELLED, InvoiceStatus.REFUNDED));
        INVOICE.put(InvoiceStatus.PAID, EnumSet.of(InvoiceStatus.REFUNDED));
        INVOICE.put(InvoiceStatus.CANCELLED, EnumSet.noneOf(InvoiceStatus.class));
        INVOICE.put(InvoiceStatus.REFUNDED, EnumSet.noneOf(InvoiceStatus.class));
    }

    public EncounterStatus transitionEncounter(EncounterStatus from, EncounterStatus to) {
        return transition("encounter", from, to, ENCOUNTER.getOrDefault(from, Set.of()));
    }

    public ReportStatus transitionReport(ReportStatus from, ReportStatus to) {
        return transition("report", from, to, REPORT.getOrDefault(from, Set.of()));
    }

    public InvoiceStatus transitionInvoice(InvoiceStatus from, InvoiceStatus to) {
        return transition("invoice", from, to, INVOICE.getOrDefault(from, Set.of()));
    }

    public boolean canTransitionEncounter(EncounterStatus from, EncounterStatus to) {
        return from == to || ENCOUNTER.getOrDefault(from, Set.of()).contains(to);
    }

    public EncounterStatus fromEtatPatient(EtatPatient etat) {
        if (etat == null) {
            return EncounterStatus.SCHEDULED;
        }
        return switch (etat) {
            case attendu -> EncounterStatus.SCHEDULED;
            case arrive -> EncounterStatus.ARRIVED;
            case retard, attente_longue -> EncounterStatus.WAITING;
        };
    }

    public EtatPatient toEtatPatient(EncounterStatus status) {
        if (status == null) {
            return EtatPatient.attendu;
        }
        return switch (status) {
            case SCHEDULED -> EtatPatient.attendu;
            case ARRIVED -> EtatPatient.arrive;
            case WAITING, PREPARING, IN_PROGRESS -> EtatPatient.attente_longue;
            case COMPLETED, REPORT_PENDING, VALIDATED, DISCHARGED -> EtatPatient.arrive;
            case CANCELLED, NO_SHOW -> EtatPatient.attendu;
        };
    }

    private <T extends Enum<T>> T transition(String domain, T from, T to, Set<T> allowed) {
        if (from == null || to == null) {
            throw ApiException.badRequest("Transition " + domain + " : état manquant");
        }
        if (from == to) {
            return to;
        }
        if (!allowed.contains(to)) {
            throw ApiException.conflict(
                    "invalid_transition",
                    "Transition " + domain + " interdite : " + from + " → " + to);
        }
        return to;
    }
}
