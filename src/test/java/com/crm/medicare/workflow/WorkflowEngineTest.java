package com.crm.medicare.workflow;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.crm.medicare.common.ApiException;
import com.crm.medicare.entity.EtatPatient;
import org.junit.jupiter.api.Test;

class WorkflowEngineTest {

    private final WorkflowEngine engine = new WorkflowEngine();

    @Test
    void scheduledToArrivedIsAllowed() {
        assertThat(engine.transitionEncounter(EncounterStatus.SCHEDULED, EncounterStatus.ARRIVED))
                .isEqualTo(EncounterStatus.ARRIVED);
    }

    @Test
    void cannotSkipFromScheduledToValidated() {
        assertThatThrownBy(
                        () -> engine.transitionEncounter(EncounterStatus.SCHEDULED, EncounterStatus.VALIDATED))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("interdite");
    }

    @Test
    void dischargedIsTerminal() {
        assertThat(engine.canTransitionEncounter(EncounterStatus.DISCHARGED, EncounterStatus.ARRIVED))
                .isFalse();
    }

    @Test
    void validatedReportCannotBeSilentlyOverwritten() {
        assertThatThrownBy(() -> engine.transitionReport(ReportStatus.VALIDATED, ReportStatus.DRAFT))
                .isInstanceOf(ApiException.class);
        assertThat(engine.transitionReport(ReportStatus.VALIDATED, ReportStatus.AMENDED))
                .isEqualTo(ReportStatus.AMENDED);
    }

    @Test
    void paidInvoiceCanOnlyBeRefunded() {
        assertThat(engine.transitionInvoice(InvoiceStatus.PAID, InvoiceStatus.REFUNDED))
                .isEqualTo(InvoiceStatus.REFUNDED);
        assertThatThrownBy(() -> engine.transitionInvoice(InvoiceStatus.PAID, InvoiceStatus.DRAFT))
                .isInstanceOf(ApiException.class);
    }

    @Test
    void mapsLegacyWaitingRoomStates() {
        assertThat(engine.fromEtatPatient(EtatPatient.attendu)).isEqualTo(EncounterStatus.SCHEDULED);
        assertThat(engine.fromEtatPatient(EtatPatient.arrive)).isEqualTo(EncounterStatus.ARRIVED);
        assertThat(engine.fromEtatPatient(EtatPatient.retard)).isEqualTo(EncounterStatus.WAITING);
        assertThat(engine.toEtatPatient(EncounterStatus.SCHEDULED)).isEqualTo(EtatPatient.attendu);
    }
}
