package com.crm.medicare.service;

import com.crm.medicare.entity.Examen;
import com.crm.medicare.entity.Modalite;
import com.crm.medicare.entity.Patient;
import com.crm.medicare.repository.ExamenRepository;
import com.lowagie.text.Document;
import com.lowagie.text.DocumentException;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.FontFactory;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.text.Normalizer;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class FactureService {

    private static final DateTimeFormatter DATE_FMT =
            DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

    private final ExamenRepository examenRepository;

    public record FacturePdf(byte[] content, String filename) {}

    @Transactional(readOnly = true)
    public FacturePdf genererFacturePdf(Long examenId) {
        Examen examen =
                examenRepository
                        .findByIdWithPatient(examenId)
                        .orElseThrow(
                                () ->
                                        new ResponseStatusException(
                                                HttpStatus.NOT_FOUND, "Examen introuvable"));

        Patient patient = examen.getPatient();
        String patientNom = patient != null ? nullToEmpty(patient.getNomComplet()) : "Patient";
        BigDecimal montant = resolveMontant(examen);

        try {
            byte[] pdf = buildPdf(examen, patient, patientNom, montant);
            String filename = "facture_" + sanitizeFilename(patientNom) + ".pdf";
            return new FacturePdf(pdf, filename);
        } catch (DocumentException ex) {
            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR, "Impossible de générer la facture PDF");
        }
    }

    private byte[] buildPdf(Examen examen, Patient patient, String patientNom, BigDecimal montant)
            throws DocumentException {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        Document document = new Document();
        PdfWriter.getInstance(document, baos);
        document.open();

        Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 16, Color.DARK_GRAY);
        Font labelFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 11, Color.BLACK);
        Font valueFont = FontFactory.getFont(FontFactory.HELVETICA, 11, Color.BLACK);
        Font smallFont = FontFactory.getFont(FontFactory.HELVETICA, 9, Color.GRAY);

        Paragraph header = new Paragraph("Centre d'Imagerie Bentachfine", titleFont);
        header.setAlignment(Element.ALIGN_CENTER);
        header.setSpacingAfter(4f);
        document.add(header);

        Paragraph sub =
                new Paragraph("Facture d'examen — RadioCRM", smallFont);
        sub.setAlignment(Element.ALIGN_CENTER);
        sub.setSpacingAfter(18f);
        document.add(sub);

        PdfPTable table = new PdfPTable(2);
        table.setWidthPercentage(100);
        table.setWidths(new float[] {38f, 62f});
        table.setSpacingBefore(8f);

        addRow(table, "Patient", patientNom, labelFont, valueFont);
        addRow(
                table,
                "CIN",
                patient != null ? nullToEmpty(patient.getCin()) : "—",
                labelFont,
                valueFont);
        addRow(table, "N° séjour", nullToEmpty(examen.getNumSejour()), labelFont, valueFont);
        addRow(
                table,
                "Type d'examen",
                firstNonBlank(examen.getDescription(), modaliteLabel(examen.getModalite())),
                labelFont,
                valueFont);
        addRow(
                table,
                "Modalité",
                modaliteLabel(examen.getModalite()),
                labelFont,
                valueFont);
        addRow(
                table,
                "Date",
                examen.getDateExamen() != null ? DATE_FMT.format(examen.getDateExamen()) : "—",
                labelFont,
                valueFont);
        addRow(
                table,
                "Montant",
                String.format(Locale.FRANCE, "%.2f DH", montant),
                labelFont,
                valueFont);

        document.add(table);

        Paragraph footer =
                new Paragraph(
                        "Document généré automatiquement — montant indicatif selon la modalité.",
                        smallFont);
        footer.setSpacingBefore(24f);
        footer.setAlignment(Element.ALIGN_CENTER);
        document.add(footer);

        document.close();
        return baos.toByteArray();
    }

    private static void addRow(
            PdfPTable table, String label, String value, Font labelFont, Font valueFont) {
        PdfPCell c1 = new PdfPCell(new Phrase(label, labelFont));
        PdfPCell c2 = new PdfPCell(new Phrase(value == null || value.isBlank() ? "—" : value, valueFont));
        c1.setPadding(8f);
        c2.setPadding(8f);
        c1.setBorderColor(Color.LIGHT_GRAY);
        c2.setBorderColor(Color.LIGHT_GRAY);
        table.addCell(c1);
        table.addCell(c2);
    }

    /**
     * Montants fictifs par modalité (fallback si aucun montant en base).
     */
    static BigDecimal montantFictif(Modalite modalite) {
        if (modalite == null) {
            return BigDecimal.valueOf(200);
        }
        return switch (modalite) {
            case IRM -> BigDecimal.valueOf(500);
            case Scanner -> BigDecimal.valueOf(300);
            case Mammographie -> BigDecimal.valueOf(250);
            case Radiologie -> BigDecimal.valueOf(150);
            case Échographie -> BigDecimal.valueOf(200);
        };
    }

    private static BigDecimal resolveMontant(Examen examen) {
        if (examen.getMontant() != null && examen.getMontant().compareTo(BigDecimal.ZERO) > 0) {
            return examen.getMontant();
        }
        return montantFictif(examen.getModalite());
    }

    private static String modaliteLabel(Modalite modalite) {
        return modalite != null ? modalite.name() : "—";
    }

    private static String firstNonBlank(String primary, String fallback) {
        if (primary != null && !primary.isBlank()) {
            return primary.trim();
        }
        return fallback;
    }

    private static String nullToEmpty(String value) {
        return value == null ? "" : value.trim();
    }

    /** Nom de fichier ASCII sûr pour Content-Disposition. */
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
}
