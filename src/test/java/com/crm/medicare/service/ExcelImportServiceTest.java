package com.crm.medicare.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.crm.medicare.dto.ImportPreviewDto;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import org.apache.poi.xssf.usermodel.XSSFRow;
import org.apache.poi.xssf.usermodel.XSSFSheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class ExcelImportServiceTest {

    @Autowired private ExcelImportService excelImportService;

    @Test
    void templateBytesAreNonEmpty() {
        byte[] template = excelImportService.template();
        assertThat(template).isNotEmpty();
        assertThat(template.length).isGreaterThan(100);
    }

    @Test
    void previewFlagsBadModality() throws Exception {
        byte[] workbook = badModalityWorkbook();
        ImportPreviewDto preview =
                excelImportService.preview(
                        new ByteArrayInputStream(workbook),
                        ExcelImportService.MODE_UPDATE,
                        "bad-modality.xlsx");
        assertThat(preview.getRowsInvalid()).isGreaterThan(0);
        assertThat(preview.getErrors())
                .anyMatch(
                        e ->
                                "modalite".equalsIgnoreCase(e.getField())
                                        && e.getMessage() != null
                                        && e.getMessage().toLowerCase().contains("modalite"));
    }

    private static byte[] badModalityWorkbook() throws Exception {
        try (XSSFWorkbook wb = new XSSFWorkbook();
                ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            XSSFSheet exams = wb.createSheet("EXAMS");
            XSSFRow header = exams.createRow(0);
            String[] cols = {
                "code",
                "nom",
                "modalite",
                "categorie",
                "body_region",
                "duree_minutes",
                "prix",
                "currency",
                "contrast_required",
                "contrast_type",
                "sedation_required",
                "description",
                "preparation",
                "actif",
                "note"
            };
            for (int i = 0; i < cols.length; i++) {
                header.createCell(i).setCellValue(cols[i]);
            }
            XSSFRow row = exams.createRow(1);
            row.createCell(0).setCellValue("BAD-MOD-001");
            row.createCell(1).setCellValue("Acte invalide");
            row.createCell(2).setCellValue("PET");
            row.createCell(3).setCellValue("TEST");
            row.createCell(4).setCellValue("Thorax");
            row.createCell(5).setCellValue("10");
            row.createCell(6).setCellValue("100");
            row.createCell(7).setCellValue("MAD");
            row.createCell(8).setCellValue("false");
            row.createCell(9).setCellValue("");
            row.createCell(10).setCellValue("false");
            row.createCell(11).setCellValue("");
            row.createCell(12).setCellValue("");
            row.createCell(13).setCellValue("true");
            row.createCell(14).setCellValue("");
            wb.write(out);
            return out.toByteArray();
        }
    }
}
