package com.crm.medicare.service;

import com.crm.medicare.entity.Examen;
import com.crm.medicare.entity.Invoice;
import com.crm.medicare.entity.InvoiceItem;
import com.crm.medicare.entity.Modalite;
import com.crm.medicare.entity.Paiement;
import com.crm.medicare.entity.Patient;
import com.crm.medicare.repository.ExamenRepository;
import com.crm.medicare.repository.InvoiceRepository;
import com.lowagie.text.Document;
import com.lowagie.text.DocumentException;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.FontFactory;
import com.lowagie.text.Image;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.Rectangle;
import com.lowagie.text.pdf.Barcode128;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfPageEventHelper;
import com.lowagie.text.pdf.PdfWriter;
import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.text.Normalizer;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class FactureService {

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
    private static final DateTimeFormatter DATE_ONLY = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final Color PRIMARY = new Color(15, 107, 120);
    private static final Color BORDER = new Color(226, 232, 240);
    private static final Color MUTED = new Color(100, 116, 139);
    private static final Color TEXT = new Color(15, 23, 42);

    private final ExamenRepository examenRepository;
    private final InvoiceRepository invoiceRepository;
    private final String centreNom;
    private final String centreAdresse;
    private final String centreTelephone;
    private final String centreEmail;
    private final String centreVille;
    private final String centreIce;
    private final String centreIf;
    private final String centreTaxePro;

    public FactureService(
            ExamenRepository examenRepository,
            InvoiceRepository invoiceRepository,
            @Value("${radiocrm.centre.nom:Centre d'Imagerie Bentachfine}") String centreNom,
            @Value("${radiocrm.centre.adresse:}") String centreAdresse,
            @Value("${radiocrm.centre.telephone:}") String centreTelephone,
            @Value("${radiocrm.centre.email:}") String centreEmail,
            @Value("${radiocrm.centre.ville:Témara}") String centreVille,
            @Value("${radiocrm.centre.ice:}") String centreIce,
            @Value("${radiocrm.centre.if:}") String centreIf,
            @Value("${radiocrm.centre.taxe_professionnelle:}") String centreTaxePro) {
        this.examenRepository = examenRepository;
        this.invoiceRepository = invoiceRepository;
        this.centreNom = centreNom;
        this.centreAdresse = centreAdresse;
        this.centreTelephone = centreTelephone;
        this.centreEmail = centreEmail;
        this.centreVille = centreVille;
        this.centreIce = centreIce;
        this.centreIf = centreIf;
        this.centreTaxePro = centreTaxePro;
    }

    public record FacturePdf(byte[] content, String filename) {}

    @Transactional(readOnly = true)
    public FacturePdf genererFacturePdf(Long examenId) {
        var invoices = invoiceRepository.findByExamenId(examenId);
        if (!invoices.isEmpty()) {
            return genererFacturePdfByInvoice(invoices.get(0).getId());
        }
        Examen examen = load(examenId);
        Patient patient = examen.getPatient();
        String patientNom = patient != null ? nullToEmpty(patient.getNomComplet()) : "Patient";
        try {
            byte[] pdf = buildInvoicePdf(examen, patient);
            return new FacturePdf(pdf, "FACTURE_" + sanitizeFilename(patientNom) + ".pdf");
        } catch (DocumentException ex) {
            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR, "Impossible de générer la facture PDF");
        }
    }

    @Transactional(readOnly = true)
    public FacturePdf genererFacturePdfByInvoice(Long invoiceId) {
        Invoice invoice =
                invoiceRepository
                        .findByIdWithDetails(invoiceId)
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Facture introuvable"));
        Patient patient = invoice.getPatient();
        String patientNom = patient != null ? nullToEmpty(patient.getNomComplet()) : "Patient";
        String ref = invoice.getReference() != null ? invoice.getReference() : String.valueOf(invoice.getId());
        try {
            byte[] pdf = buildInvoicePdfFromLedger(invoice, patient);
            return new FacturePdf(
                    pdf, "FACTURE_" + sanitizeFilename(ref) + "_" + sanitizeFilename(patientNom) + ".pdf");
        } catch (DocumentException ex) {
            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR, "Impossible de générer la facture PDF");
        }
    }

    @Transactional(readOnly = true)
    public FacturePdf genererCompteRenduPdf(Long examenId) {
        Examen examen = load(examenId);
        Patient patient = examen.getPatient();
        String patientNom = patient != null ? nullToEmpty(patient.getNomComplet()) : "Patient";
        try {
            byte[] pdf = buildReportPdf(examen, patient);
            return new FacturePdf(pdf, "compte_rendu_" + sanitizeFilename(patientNom) + ".pdf");
        } catch (DocumentException ex) {
            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR, "Impossible de générer le compte rendu PDF");
        }
    }

    private Examen load(Long examenId) {
        return examenRepository
                .findByIdWithPatient(examenId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Examen introuvable"));
    }

    private byte[] buildInvoicePdf(Examen examen, Patient patient) throws DocumentException {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        Document document = new Document(PageSize.A4, 48, 48, 56, 64);
        PdfWriter writer = PdfWriter.getInstance(document, baos);
        writer.setPageEvent(new FooterEvent(centreLine(), legalFooter()));
        document.open();

        Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 16, PRIMARY);
        Font headingFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 11, TEXT);
        Font labelFont = FontFactory.getFont(FontFactory.HELVETICA, 8, MUTED);
        Font valueFont = FontFactory.getFont(FontFactory.HELVETICA, 10, TEXT);
        Font smallFont = FontFactory.getFont(FontFactory.HELVETICA, 8, MUTED);
        Font moneyFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 11, TEXT);

        addCentreHeader(document, titleFont, smallFont);

        Paragraph docTitle = new Paragraph("FACTURE", headingFont);
        docTitle.setSpacingBefore(8f);
        document.add(docTitle);
        Paragraph examHint =
                new Paragraph(
                        "Maroc · MAD — facture commerciale (mentions CGI). Non certifiée DGI / Fatourati.",
                        smallFont);
        examHint.setSpacingAfter(10f);
        document.add(examHint);

        String numero = invoiceNumber(examen);
        PdfPTable meta = twoCol();
        addKV(meta, "N° facture", numero, labelFont, valueFont);
        addKV(
                meta,
                "Date",
                examen.getDateExamen() != null ? DATE_ONLY.format(examen.getDateExamen()) : "—",
                labelFont,
                valueFont);
        addKV(meta, "N° séjour", nullToEmpty(examen.getNumSejour()), labelFont, valueFont);
        addKV(meta, "Statut", paiementLabel(examen.getPaiement()), labelFont, valueFont);
        document.add(meta);

        document.add(section("PATIENT", headingFont));
        PdfPTable patientTable = twoCol();
        addKV(patientTable, "Nom", patient != null ? nullToEmpty(patient.getNomComplet()) : "—", labelFont, valueFont);
        addKV(patientTable, "CIN", patient != null ? nullToEmpty(patient.getCin()) : "—", labelFont, valueFont);
        addKV(
                patientTable,
                "N° dossier",
                patient != null ? nullToEmpty(patient.getNumeroDossier()) : "—",
                labelFont,
                valueFont);
        addKV(
                patientTable,
                "Date de naissance",
                patient != null && patient.getDateNaissance() != null
                        ? DATE_ONLY.format(patient.getDateNaissance())
                        : "—",
                labelFont,
                valueFont);
        document.add(patientTable);

        document.add(section("PRESTATIONS", headingFont));
        PdfPTable lines = new PdfPTable(4);
        lines.setWidthPercentage(100);
        lines.setWidths(new float[] {46f, 18f, 12f, 24f});
        headerCell(lines, "Acte");
        headerCell(lines, "Modalité");
        headerCell(lines, "Qté");
        headerCell(lines, "Montant");
        bodyCell(lines, firstNonBlank(examen.getDescription(), modaliteLabel(examen.getModalite())), Element.ALIGN_LEFT);
        bodyCell(lines, modaliteLabel(examen.getModalite()), Element.ALIGN_LEFT);
        bodyCell(lines, "1", Element.ALIGN_CENTER);
        bodyCell(lines, money(resolveMontant(examen)), Element.ALIGN_RIGHT);
        document.add(lines);

        BigDecimal total = resolveMontant(examen);
        BigDecimal avance = examen.getAcompte() != null ? examen.getAcompte() : BigDecimal.ZERO;
        BigDecimal reste = total.subtract(avance);
        if (reste.signum() < 0) {
            reste = BigDecimal.ZERO;
        }

        PdfPTable totals = new PdfPTable(2);
        totals.setWidthPercentage(46);
        totals.setHorizontalAlignment(Element.ALIGN_RIGHT);
        totals.setSpacingBefore(14f);
        totals.setWidths(new float[] {55f, 45f});
        addTotalRow(totals, "Total", money(total), labelFont, moneyFont);
        addTotalRow(totals, "Avance", money(avance), labelFont, valueFont);
        addTotalRow(totals, "Reste à payer", money(reste), labelFont, moneyFont);
        document.add(totals);

        Paragraph note =
                new Paragraph(
                        total.signum() == 0
                                ? "Aucun tarif n'est enregistré pour cet acte. Le montant affiché n'est pas estimé."
                                : "Merci de votre confiance.",
                        smallFont);
        note.setSpacingBefore(22f);
        document.add(note);

        document.close();
        return baos.toByteArray();
    }

    private byte[] buildInvoicePdfFromLedger(Invoice invoice, Patient patient) throws DocumentException {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        Document document = new Document(PageSize.A4, 48, 48, 52, 72);
        PdfWriter writer = PdfWriter.getInstance(document, baos);
        writer.setPageEvent(new FooterEvent(centreLine(), commercialDisclaimer()));
        document.open();

        Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 16, PRIMARY);
        Font headingFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 11, TEXT);
        Font labelFont = FontFactory.getFont(FontFactory.HELVETICA, 8, MUTED);
        Font valueFont = FontFactory.getFont(FontFactory.HELVETICA, 10, TEXT);
        Font smallFont = FontFactory.getFont(FontFactory.HELVETICA, 8, MUTED);
        Font moneyFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 11, TEXT);
        Font bannerFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 14, PRIMARY);

        addCentreHeader(document, titleFont, smallFont);

        boolean avoir = "CREDIT_NOTE".equals(invoice.getDocumentKind());
        Paragraph docTitle = new Paragraph(avoir ? "AVOIR" : "FACTURE", bannerFont);
        docTitle.setSpacingBefore(4f);
        document.add(docTitle);
        Paragraph hint =
                new Paragraph(
                        "Maroc · MAD · mentions CGI art. 145 — document imprimable (architecture e-facture 2026, non transmis à Fatourati / DGI)",
                        smallFont);
        hint.setSpacingAfter(10f);
        document.add(hint);

        PdfPTable parties = twoCol();
        parties.addCell(partyBox("VENDEUR", sellerBlock(invoice), labelFont, valueFont));
        parties.addCell(partyBox("CLIENT", buyerBlock(invoice, patient), labelFont, valueFont));
        parties.setSpacingAfter(10f);
        document.add(parties);

        PdfPTable meta = twoCol();
        addKV(
                meta,
                "N° facture",
                firstNonBlank(invoice.getReference(), String.valueOf(invoice.getId())),
                labelFont,
                valueFont);
        addKV(meta, "Série", firstNonBlank(invoice.getSeries(), "FAC"), labelFont, valueFont);
        addKV(
                meta,
                "Date d'émission",
                invoice.getIssuedAt() != null ? DATE_ONLY.format(invoice.getIssuedAt()) : "—",
                labelFont,
                valueFont);
        addKV(
                meta,
                "Date de prestation",
                invoice.getServiceDate() != null ? DATE_ONLY.format(invoice.getServiceDate().atStartOfDay()) : "—",
                labelFont,
                valueFont);
        addKV(meta, "Devise", "MAD", labelFont, valueFont);
        addKV(meta, "Statut", invoiceStatutLabel(invoice), labelFont, valueFont);
        document.add(meta);

        document.add(section("PRESTATIONS", headingFont));
        PdfPTable lines = new PdfPTable(6);
        lines.setWidthPercentage(100);
        lines.setWidths(new float[] {34f, 8f, 14f, 12f, 14f, 18f});
        headerCell(lines, "Désignation");
        headerCell(lines, "Qté");
        headerCell(lines, "PU HT");
        headerCell(lines, "Taux TVA");
        headerCell(lines, "TVA");
        headerCell(lines, "Total TTC");
        if (invoice.getItems() != null) {
            for (InvoiceItem item : invoice.getItems()) {
                String designation = item.getLabel();
                String code = coalesce(item.getCode(), item.getModalite());
                if (!isBlank(code)) {
                    designation = designation + " [" + code + "]";
                }
                bodyCell(lines, designation, Element.ALIGN_LEFT);
                bodyCell(
                        lines,
                        item.getQuantity() != null ? item.getQuantity().stripTrailingZeros().toPlainString() : "1",
                        Element.ALIGN_CENTER);
                bodyCell(lines, money(item.getUnitPrice()), Element.ALIGN_RIGHT);
                bodyCell(lines, percent(item.getVatRate()), Element.ALIGN_RIGHT);
                bodyCell(lines, money(item.getVatAmount()), Element.ALIGN_RIGHT);
                bodyCell(
                        lines,
                        money(item.getTotalTtc() != null ? item.getTotalTtc() : item.getLineTotal()),
                        Element.ALIGN_RIGHT);
            }
        }
        document.add(lines);

        PdfPTable bottom = new PdfPTable(2);
        bottom.setWidthPercentage(100);
        bottom.setSpacingBefore(14f);
        bottom.setWidths(new float[] {40f, 60f});

        PdfPCell qrCell = new PdfPCell();
        qrCell.setBorder(Rectangle.NO_BORDER);
        qrCell.setVerticalAlignment(Element.ALIGN_BOTTOM);
        Image barcode = barcodeImage(writer, firstNonBlank(invoice.getReference(), String.valueOf(invoice.getId())));
        if (barcode != null) {
            qrCell.addElement(barcode);
            Paragraph qrCaption = new Paragraph("Code-barres interne (non DGI)", smallFont);
            qrCaption.setSpacingBefore(4f);
            qrCell.addElement(qrCaption);
        }
        bottom.addCell(qrCell);

        PdfPTable totals = new PdfPTable(2);
        totals.setWidthPercentage(100);
        totals.setWidths(new float[] {55f, 45f});
        addTotalRow(totals, "Total HT", money(invoice.getTotalHt()), labelFont, valueFont);
        addTotalRow(totals, "TVA", money(invoice.getTotalTva()), labelFont, valueFont);
        if (invoice.getRemise() != null && invoice.getRemise().signum() > 0) {
            addTotalRow(totals, "Remise", money(invoice.getRemise()), labelFont, valueFont);
        }
        addTotalRow(totals, "Total TTC", money(invoice.getTotal()), labelFont, moneyFont);
        addTotalRow(totals, "Payé", money(invoice.getAmountPaid()), labelFont, valueFont);
        addTotalRow(totals, "Reste dû", money(invoice.reste()), labelFont, moneyFont);
        PdfPCell totCell = new PdfPCell(totals);
        totCell.setBorder(Rectangle.NO_BORDER);
        bottom.addCell(totCell);
        document.add(bottom);

        Paragraph pay =
                new Paragraph(
                        "Mode de paiement : "
                                + modeLabel(invoice.getModePaiement())
                                + (isBlank(invoice.getPaymentTerms()) ? "" : " — " + invoice.getPaymentTerms().trim()),
                        smallFont);
        pay.setSpacingBefore(16f);
        document.add(pay);

        Paragraph note = new Paragraph(cgiMentions(invoice), smallFont);
        note.setSpacingBefore(10f);
        document.add(note);

        if (!isBlank(invoice.getElectronicHash())) {
            String hash = invoice.getElectronicHash().trim();
            Paragraph hashLine =
                    new Paragraph(
                            "Empreinte locale SHA-256 : "
                                    + (hash.length() > 16 ? hash.substring(0, 16) + "…" : hash)
                                    + " — intégrité interne, pas un identifiant DGI.",
                            smallFont);
            hashLine.setSpacingBefore(6f);
            document.add(hashLine);
        }

        document.close();
        return baos.toByteArray();
    }

    private byte[] buildReportPdf(Examen examen, Patient patient) throws DocumentException {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        Document document = new Document(PageSize.A4, 48, 48, 56, 64);
        PdfWriter writer = PdfWriter.getInstance(document, baos);
        writer.setPageEvent(new FooterEvent(centreLine(), "Compte rendu d'imagerie médicale"));
        document.open();

        Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 16, PRIMARY);
        Font headingFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 11, TEXT);
        Font labelFont = FontFactory.getFont(FontFactory.HELVETICA, 8, MUTED);
        Font valueFont = FontFactory.getFont(FontFactory.HELVETICA, 10, TEXT);
        Font bodyFont = FontFactory.getFont(FontFactory.HELVETICA, 10, TEXT);
        Font smallFont = FontFactory.getFont(FontFactory.HELVETICA, 8, MUTED);

        addCentreHeader(document, titleFont, smallFont);

        Paragraph docTitle = new Paragraph("COMPTE RENDU D'IMAGERIE MÉDICALE", headingFont);
        docTitle.setSpacingBefore(8f);
        docTitle.setSpacingAfter(10f);
        document.add(docTitle);

        PdfPTable meta = twoCol();
        addKV(meta, "Patient", patient != null ? nullToEmpty(patient.getNomComplet()) : "—", labelFont, valueFont);
        addKV(
                meta,
                "Date de naissance",
                patient != null && patient.getDateNaissance() != null
                        ? DATE_ONLY.format(patient.getDateNaissance())
                        : "—",
                labelFont,
                valueFont);
        addKV(
                meta,
                "N° dossier",
                patient != null ? nullToEmpty(patient.getNumeroDossier()) : "—",
                labelFont,
                valueFont);
        addKV(
                meta,
                "Date de l'examen",
                examen.getDateExamen() != null ? DATE_FMT.format(examen.getDateExamen()) : "—",
                labelFont,
                valueFont);
        addKV(
                meta,
                "Examen",
                firstNonBlank(examen.getDescription(), modaliteLabel(examen.getModalite())),
                labelFont,
                valueFont);
        addKV(meta, "Modalité", modaliteLabel(examen.getModalite()), labelFont, valueFont);
        addKV(
                meta,
                "Médecin prescripteur",
                firstNonBlank(examen.getPrescripteurNom(), examen.getMedecin()),
                labelFont,
                valueFont);
        addKV(meta, "N° document", "CR-" + yearOf(examen.getDateExamen()) + "-" + padId(examen.getId()), labelFont, valueFont);
        document.add(meta);

        addReportSection(document, "INDICATION", examen.getIndication(), headingFont, bodyFont);
        addReportSection(document, "TECHNIQUE", examen.getTechnique(), headingFont, bodyFont);
        addReportSection(document, "OBSERVATIONS", examen.getResultats(), headingFont, bodyFont);
        addReportSection(document, "CONCLUSION", examen.getConclusion(), headingFont, bodyFont);

        boolean structured =
                !isBlank(examen.getIndication())
                        || !isBlank(examen.getTechnique())
                        || !isBlank(examen.getResultats())
                        || !isBlank(examen.getConclusion());
        if (!structured) {
            addReportSection(document, "COMPTE RENDU", examen.getCompteRendu(), headingFont, bodyFont);
        }

        if (isBlank(examen.getIndication())
                && isBlank(examen.getTechnique())
                && isBlank(examen.getResultats())
                && isBlank(examen.getConclusion())
                && isBlank(examen.getCompteRendu())) {
            Paragraph empty = new Paragraph("Aucun contenu rédigé pour cet examen.", smallFont);
            empty.setSpacingBefore(16f);
            document.add(empty);
        }

        Paragraph sign = new Paragraph();
        sign.setSpacingBefore(28f);
        sign.add(new Phrase("Radiologue : " + firstNonBlank(examen.getMedecin(), "—") + "\n", valueFont));
        sign.add(
                new Phrase(
                        "Date : "
                                + (examen.getDateExamen() != null ? DATE_ONLY.format(examen.getDateExamen()) : "—"),
                        valueFont));
        document.add(sign);

        document.close();
        return baos.toByteArray();
    }

    private void addCentreHeader(Document document, Font titleFont, Font smallFont) throws DocumentException {
        Paragraph header = new Paragraph(centreNom, titleFont);
        header.setAlignment(Element.ALIGN_LEFT);
        document.add(header);
        Paragraph sub = new Paragraph(centreLine(), smallFont);
        sub.setSpacingAfter(6f);
        document.add(sub);
        PdfPTable line = new PdfPTable(1);
        line.setWidthPercentage(100);
        PdfPCell cell = new PdfPCell();
        cell.setFixedHeight(2f);
        cell.setBackgroundColor(PRIMARY);
        cell.setBorder(Rectangle.NO_BORDER);
        line.addCell(cell);
        line.setSpacingAfter(12f);
        document.add(line);
    }

    private String centreLine() {
        StringBuilder sb = new StringBuilder();
        if (!isBlank(centreAdresse)) {
            sb.append(centreAdresse.trim());
        }
        if (!isBlank(centreVille)) {
            if (!sb.isEmpty()) {
                sb.append(" · ");
            }
            sb.append(centreVille.trim());
        }
        if (!isBlank(centreTelephone)) {
            if (!sb.isEmpty()) {
                sb.append(" · ");
            }
            sb.append(centreTelephone.trim());
        }
        if (!isBlank(centreEmail)) {
            if (!sb.isEmpty()) {
                sb.append(" · ");
            }
            sb.append(centreEmail.trim());
        }
        if (!isBlank(centreIce)) {
            if (!sb.isEmpty()) {
                sb.append(" · ");
            }
            sb.append("ICE ").append(centreIce.trim());
        }
        if (!isBlank(centreIf)) {
            if (!sb.isEmpty()) {
                sb.append(" · ");
            }
            sb.append("IF ").append(centreIf.trim());
        }
        if (!isBlank(centreTaxePro)) {
            if (!sb.isEmpty()) {
                sb.append(" · ");
            }
            sb.append("TP ").append(centreTaxePro.trim());
        }
        return sb.isEmpty() ? centreNom : sb.toString();
    }

    private String legalFooter() {
        return commercialDisclaimer();
    }

    private static String commercialDisclaimer() {
        return "Facture commerciale imprimable — non certifiée DGI / Fatourati";
    }

    private String cgiMentions(Invoice invoice) {
        String configured = invoice != null ? coalesce(invoice.getLegalMentions()) : "";
        if (!isBlank(configured)) {
            return configured;
        }
        return "TVA non applicable — art. 91 du CGI (prestations de soins), sauf mention contraire. "
                + "Document établi conformément aux mentions de l'art. 145 du CGI. "
                + "Ce PDF n'est pas une facture électronique validée par la DGI.";
    }

    private String sellerBlock(Invoice invoice) {
        StringBuilder sb = new StringBuilder();
        appendLine(sb, centreNom);
        appendLine(sb, centreAdresse);
        appendLine(sb, centreVille);
        if (!isBlank(centreTelephone)) {
            appendLine(sb, "Tél. " + centreTelephone.trim());
        }
        if (!isBlank(centreEmail)) {
            appendLine(sb, centreEmail.trim());
        }
        String ice = coalesce(invoice != null ? invoice.getSellerIce() : null, centreIce);
        String ident = coalesce(invoice != null ? invoice.getSellerIf() : null, centreIf);
        String tp = coalesce(invoice != null ? invoice.getSellerTaxeProfessionnelle() : null, centreTaxePro);
        if (!isBlank(ice)) {
            appendLine(sb, "ICE " + ice);
        }
        if (!isBlank(ident)) {
            appendLine(sb, "IF " + ident);
        }
        if (!isBlank(tp)) {
            appendLine(sb, "TP " + tp);
        }
        return sb.isEmpty() ? "—" : sb.toString();
    }

    private static String buyerBlock(Invoice invoice, Patient patient) {
        StringBuilder sb = new StringBuilder();
        appendLine(sb, patient != null ? patient.getNomComplet() : null);
        if (patient != null && !isBlank(patient.getCin())) {
            appendLine(sb, "CIN " + patient.getCin().trim());
        }
        if (patient != null && !isBlank(patient.getNumeroDossier())) {
            appendLine(sb, "Dossier " + patient.getNumeroDossier().trim());
        }
        if (invoice != null && !isBlank(invoice.getCustomerIce())) {
            appendLine(sb, "ICE " + invoice.getCustomerIce().trim());
        }
        if (invoice != null && !isBlank(invoice.getCustomerIf())) {
            appendLine(sb, "IF " + invoice.getCustomerIf().trim());
        }
        return sb.isEmpty() ? "—" : sb.toString();
    }

    private static void appendLine(StringBuilder sb, String line) {
        if (isBlank(line)) {
            return;
        }
        if (!sb.isEmpty()) {
            sb.append('\n');
        }
        sb.append(line.trim());
    }

    private static PdfPCell partyBox(String title, String body, Font titleFont, Font bodyFont) {
        PdfPCell cell = new PdfPCell();
        cell.setBorderColor(BORDER);
        cell.setPadding(9f);
        cell.addElement(new Phrase(title, titleFont));
        Paragraph p = new Paragraph(isBlank(body) ? "—" : body, bodyFont);
        p.setSpacingBefore(4f);
        p.setLeading(13f);
        cell.addElement(p);
        return cell;
    }

    private static Image barcodeImage(PdfWriter writer, String code) {
        if (isBlank(code) || writer == null) {
            return null;
        }
        try {
            Barcode128 barcode = new Barcode128();
            barcode.setCode(code.trim());
            barcode.setCodeType(Barcode128.CODE128);
            barcode.setBarHeight(28f);
            barcode.setX(0.8f);
            barcode.setAltText(code.trim());
            barcode.setFont(null);
            return barcode.createImageWithBarcode(writer.getDirectContent(), TEXT, MUTED);
        } catch (Exception ex) {
            return null;
        }
    }

    private static String invoiceStatutLabel(Invoice invoice) {
        if (invoice == null || invoice.getStatut() == null) {
            return "—";
        }
        return switch (invoice.getStatut()) {
            case DRAFT -> "Brouillon";
            case ISSUED -> "Émise";
            case PARTIALLY_PAID -> "Partiellement payée";
            case PAID -> "Payée";
            case CANCELLED -> "Annulée";
            case CREDIT_NOTE -> "Avoir";
            case REFUNDED -> "Remboursée";
        };
    }

    private static String modeLabel(String mode) {
        if (isBlank(mode)) {
            return "—";
        }
        return switch (mode.trim().toLowerCase(Locale.ROOT)) {
            case "especes", "espèces", "cash" -> "Espèces";
            case "carte", "carte bancaire", "cb" -> "Carte bancaire";
            case "cheque", "chèque" -> "Chèque";
            case "virement" -> "Virement";
            default -> mode.trim();
        };
    }

    private static String percent(BigDecimal rate) {
        BigDecimal value = rate != null ? rate : BigDecimal.ZERO;
        return value.stripTrailingZeros().toPlainString().replace('.', ',') + " %";
    }

    private static String coalesce(String... values) {
        if (values == null) {
            return "";
        }
        for (String value : values) {
            if (value != null && !value.isBlank() && !"—".equals(value.trim())) {
                return value.trim();
            }
        }
        return "";
    }

    private static Paragraph section(String title, Font headingFont) {
        Paragraph p = new Paragraph(title, headingFont);
        p.setSpacingBefore(14f);
        p.setSpacingAfter(6f);
        return p;
    }

    private static void addReportSection(Document document, String title, String body, Font heading, Font font)
            throws DocumentException {
        if (isBlank(body)) {
            return;
        }
        document.add(section(title, heading));
        Paragraph p = new Paragraph(body.trim(), font);
        p.setLeading(15f);
        document.add(p);
    }

    private static PdfPTable twoCol() throws DocumentException {
        PdfPTable table = new PdfPTable(2);
        table.setWidthPercentage(100);
        table.setWidths(new float[] {50f, 50f});
        return table;
    }

    private static void addKV(PdfPTable table, String label, String value, Font labelFont, Font valueFont) {
        PdfPCell cell = new PdfPCell();
        cell.setBorderColor(BORDER);
        cell.setPadding(8f);
        cell.addElement(new Phrase(label.toUpperCase(Locale.ROOT), labelFont));
        cell.addElement(new Phrase(value == null || value.isBlank() ? "—" : value, valueFont));
        table.addCell(cell);
    }

    private static void headerCell(PdfPTable table, String text) {
        Font font = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8, Color.WHITE);
        PdfPCell cell = new PdfPCell(new Phrase(text, font));
        cell.setBackgroundColor(PRIMARY);
        cell.setPadding(7f);
        cell.setBorderColor(PRIMARY);
        table.addCell(cell);
    }

    private static void bodyCell(PdfPTable table, String text, int align) {
        Font font = FontFactory.getFont(FontFactory.HELVETICA, 9, TEXT);
        PdfPCell cell = new PdfPCell(new Phrase(text == null || text.isBlank() ? "—" : text, font));
        cell.setPadding(7f);
        cell.setBorderColor(BORDER);
        cell.setHorizontalAlignment(align);
        table.addCell(cell);
    }

    private static void addTotalRow(PdfPTable table, String label, String value, Font labelFont, Font valueFont) {
        PdfPCell c1 = new PdfPCell(new Phrase(label, labelFont));
        PdfPCell c2 = new PdfPCell(new Phrase(value, valueFont));
        c1.setBorderColor(BORDER);
        c2.setBorderColor(BORDER);
        c1.setPadding(6f);
        c2.setPadding(6f);
        c2.setHorizontalAlignment(Element.ALIGN_RIGHT);
        table.addCell(c1);
        table.addCell(c2);
    }

    private static String invoiceNumber(Examen examen) {
        return "FAC-" + yearOf(examen.getDateExamen()) + "-" + padId(examen.getId());
    }

    private static String yearOf(LocalDateTime date) {
        return date != null ? String.valueOf(date.getYear()) : "0000";
    }

    private static String padId(Long id) {
        if (id == null) {
            return "000000";
        }
        return String.format("%06d", id);
    }

    private static String paiementLabel(Paiement paiement) {
        if (paiement == null) {
            return "Non payée";
        }
        return switch (paiement) {
            case paye -> "Payée";
            case cote -> "Partiellement payée";
            case impaye -> "Non payée";
        };
    }

    private static BigDecimal resolveMontant(Examen examen) {
        return examen.getMontant() != null ? examen.getMontant() : BigDecimal.ZERO;
    }

    private static String money(BigDecimal amount) {
        BigDecimal value = amount != null ? amount : BigDecimal.ZERO;
        return String.format(Locale.FRANCE, "%,.2f MAD", value);
    }

    private static String modaliteLabel(Modalite modalite) {
        return modalite != null ? modalite.name() : "—";
    }

    private static String firstNonBlank(String primary, String fallback) {
        if (primary != null && !primary.isBlank()) {
            return primary.trim();
        }
        return fallback == null || fallback.isBlank() ? "—" : fallback.trim();
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private static String nullToEmpty(String value) {
        return value == null ? "" : value.trim();
    }

    static String sanitizeFilename(String name) {
        String normalized =
                Normalizer.normalize(nullToEmpty(name), Normalizer.Form.NFD)
                        .replaceAll("\\p{M}+", "")
                        .replaceAll("[^a-zA-Z0-9._-]+", "_")
                        .replaceAll("_+", "_")
                        .replaceAll("^_|_$", "");
        if (normalized.isBlank()) {
            return "patient";
        }
        return normalized.length() > 60 ? normalized.substring(0, 60) : normalized;
    }

    private static final class FooterEvent extends PdfPageEventHelper {
        private final String left;
        private final String right;

        private FooterEvent(String left, String right) {
            this.left = left;
            this.right = right;
        }

        @Override
        public void onEndPage(PdfWriter writer, Document document) {
            PdfPTable footer = new PdfPTable(2);
            footer.setTotalWidth(document.right() - document.left());
            Font font = FontFactory.getFont(FontFactory.HELVETICA, 7, MUTED);
            PdfPCell a = new PdfPCell(new Phrase(left, font));
            PdfPCell b =
                    new PdfPCell(
                            new Phrase(right + "  ·  p. " + writer.getPageNumber(), font));
            a.setBorder(Rectangle.TOP);
            b.setBorder(Rectangle.TOP);
            a.setBorderColor(BORDER);
            b.setBorderColor(BORDER);
            a.setPaddingTop(6f);
            b.setPaddingTop(6f);
            b.setHorizontalAlignment(Element.ALIGN_RIGHT);
            footer.addCell(a);
            footer.addCell(b);
            footer.writeSelectedRows(0, -1, document.left(), 36, writer.getDirectContent());
        }
    }
}
