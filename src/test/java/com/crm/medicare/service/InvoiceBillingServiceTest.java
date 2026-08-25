package com.crm.medicare.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.crm.medicare.common.ApiException;
import com.crm.medicare.dto.InvoiceCreateRequest;
import com.crm.medicare.dto.InvoiceDto;
import com.crm.medicare.dto.InvoicePaymentRequest;
import com.crm.medicare.dto.InvoiceRefundRequest;
import com.crm.medicare.dto.WorklistCreateRequest;
import com.crm.medicare.entity.CatalogueExamen;
import com.crm.medicare.entity.MedecinReferent;
import com.crm.medicare.entity.Modalite;
import com.crm.medicare.repository.CatalogueExamenRepository;
import com.crm.medicare.repository.MedecinReferentRepository;
import com.crm.medicare.repository.PatientRepository;
import com.crm.medicare.workflow.InvoiceStatus;
import java.math.BigDecimal;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class InvoiceBillingServiceTest {

    @Autowired private InvoiceBillingService invoiceBillingService;
    @Autowired private WorklistService worklistService;
    @Autowired private PatientRepository patientRepository;
    @Autowired private MedecinReferentRepository medecinReferentRepository;
    @Autowired private CatalogueExamenRepository catalogueExamenRepository;

    @Test
    void createPartialThenFullPaymentAndIdempotent() {
        Long patientId = ensurePatient("INV111111");
        InvoiceCreateRequest create = new InvoiceCreateRequest();
        create.setPatientId(patientId);
        create.setActe("IRM Lombaire");
        create.setMontant(new BigDecimal("1000.00"));
        create.setAcompte(new BigDecimal("400.00"));
        create.setModePaiement("especes");

        InvoiceDto invoice = invoiceBillingService.create(create);
        assertThat(invoice.getReference()).startsWith("FAC-");
        assertThat(invoice.getTotal()).isEqualByComparingTo("1000.00");
        assertThat(invoice.getAmountPaid()).isEqualByComparingTo("400.00");
        assertThat(invoice.getStatut()).isEqualTo(InvoiceStatus.PARTIALLY_PAID.name());

        InvoicePaymentRequest pay = new InvoicePaymentRequest();
        pay.setMontant(new BigDecimal("600.00"));
        pay.setMode("carte");
        pay.setIdempotencyKey("pay-key-1");
        InvoiceDto paid = invoiceBillingService.addPayment(Long.valueOf(invoice.getId()), pay);
        assertThat(paid.getStatut()).isEqualTo(InvoiceStatus.PAID.name());
        assertThat(paid.getReste()).isEqualByComparingTo("0");

        InvoiceDto again = invoiceBillingService.addPayment(Long.valueOf(invoice.getId()), pay);
        assertThat(again.getAmountPaid()).isEqualByComparingTo("1000.00");
    }

    @Test
    void cancelIssuedThenRejectPayment() {
        Long patientId = ensurePatient("INV222222");
        InvoiceCreateRequest create = new InvoiceCreateRequest();
        create.setPatientId(patientId);
        create.setActe("Scanner");
        create.setMontant(new BigDecimal("500.00"));
        InvoiceDto invoice = invoiceBillingService.create(create);

        InvoiceDto cancelled = invoiceBillingService.cancel(Long.valueOf(invoice.getId()));
        assertThat(cancelled.getStatut()).isEqualTo(InvoiceStatus.CANCELLED.name());

        InvoicePaymentRequest pay = new InvoicePaymentRequest();
        pay.setMontant(new BigDecimal("10.00"));
        assertThatThrownBy(() -> invoiceBillingService.addPayment(Long.valueOf(invoice.getId()), pay))
                .isInstanceOf(ApiException.class);
    }

    @Test
    void refundPaidInvoice() {
        Long patientId = ensurePatient("INV333333");
        InvoiceCreateRequest create = new InvoiceCreateRequest();
        create.setPatientId(patientId);
        create.setActe("Echo");
        create.setMontant(new BigDecimal("200.00"));
        create.setAcompte(new BigDecimal("200.00"));
        InvoiceDto invoice = invoiceBillingService.create(create);
        assertThat(invoice.getStatut()).isEqualTo(InvoiceStatus.PAID.name());

        InvoiceRefundRequest refund = new InvoiceRefundRequest();
        refund.setMontant(new BigDecimal("50.00"));
        refund.setReason("Erreur de caisse");
        InvoiceDto refunded = invoiceBillingService.refund(Long.valueOf(invoice.getId()), refund);
        assertThat(refunded.getStatut()).isEqualTo(InvoiceStatus.REFUNDED.name());
        assertThat(refunded.getAmountRefunded()).isEqualByComparingTo("50.00");
    }

    @Test
    void overpayRejected() {
        Long patientId = ensurePatient("INV444444");
        InvoiceCreateRequest create = new InvoiceCreateRequest();
        create.setPatientId(patientId);
        create.setActe("Radio");
        create.setMontant(new BigDecimal("100.00"));
        InvoiceDto invoice = invoiceBillingService.create(create);

        InvoicePaymentRequest pay = new InvoicePaymentRequest();
        pay.setMontant(new BigDecimal("150.00"));
        assertThatThrownBy(() -> invoiceBillingService.addPayment(Long.valueOf(invoice.getId()), pay))
                .isInstanceOf(ResponseStatusException.class);
    }

    @Test
    void emptyListIsEmpty() {
        assertThat(invoiceBillingService.list()).isEmpty();
    }

    @Test
    void createIgnoresFrontendMontantWhenCataloguePriceExists() {
        CatalogueExamen acte = new CatalogueExamen();
        acte.setNom("IRM Lombaire catalogue");
        acte.setCode("IRM-LOMB-TEST");
        acte.setModalite(Modalite.IRM);
        acte.setPrix(new BigDecimal("1800.00"));
        acte.setDureeMinutes(40);
        acte.setActif(true);
        acte = catalogueExamenRepository.save(acte);

        MedecinReferent doctor = new MedecinReferent();
        doctor.setNom("Dr Catalogue Invoice");
        doctor = medecinReferentRepository.save(doctor);

        Long patientId = ensurePatient("INV555555");
        WorklistCreateRequest examReq = new WorklistCreateRequest();
        examReq.setPatientId(patientId);
        examReq.setCatalogueId(acte.getId());
        examReq.setSalle("Salle 2 — IRM");
        examReq.setDateHeure("2026-08-26T10:00");
        examReq.setPrescripteurId(String.valueOf(doctor.getId()));
        var exam = worklistService.create(examReq);

        InvoiceCreateRequest create = new InvoiceCreateRequest();
        create.setPatientId(patientId);
        create.setExamenId(Long.valueOf(exam.getId()));
        create.setMontant(new BigDecimal("1.00")); // tentative client — doit être ignorée
        create.setModePaiement("especes");

        InvoiceDto invoice = invoiceBillingService.create(create);
        assertThat(invoice.getTotal()).isEqualByComparingTo("1800.00");

        // Snapshot stabilité : changer le catalogue ne doit pas réécrire une facture déjà créée
        acte.setPrix(new BigDecimal("9999.00"));
        catalogueExamenRepository.save(acte);
        assertThat(invoiceBillingService.get(Long.valueOf(invoice.getId())).getTotal())
                .isEqualByComparingTo("1800.00");
    }

    private Long ensurePatient(String cin) {
        MedecinReferent doctor = new MedecinReferent();
        doctor.setNom("Dr Invoice");
        doctor = medecinReferentRepository.save(doctor);
        WorklistCreateRequest req = new WorklistCreateRequest();
        req.setNom("TEST");
        req.setPrenom("Invoice");
        req.setCin(cin);
        req.setNaissance("1990-01-01");
        req.setSexe("M");
        req.setTelephone("0600000000");
        req.setTypeExamen("IRM");
        req.setModalite("IRM");
        req.setSalle("Salle 2 — IRM");
        req.setDateHeure("2026-08-25T09:00");
        req.setPrescripteurId(String.valueOf(doctor.getId()));
        worklistService.create(req);
        return patientRepository.findByCinIgnoreCaseAndDeletedAtIsNull(cin).orElseThrow().getId();
    }
}
