package com.crm.medicare.controller;

import com.crm.medicare.dto.DataImportJobDto;
import com.crm.medicare.dto.DemoDatasetStatusDto;
import com.crm.medicare.dto.ImportPreviewDto;
import com.crm.medicare.dto.ImportResultDto;
import com.crm.medicare.security.PermissionCatalog;
import com.crm.medicare.service.DemoDatasetService;
import com.crm.medicare.service.ExcelImportService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping({"/api/admin/data", "/api/v1/admin/data"})
@RequiredArgsConstructor
public class DataAdminController {

    private final ExcelImportService excelImportService;
    private final DemoDatasetService demoDatasetService;

    @GetMapping("/template")
    @PreAuthorize("hasAuthority('" + PermissionCatalog.USER_MANAGE + "')")
    public ResponseEntity<byte[]> template() {
        byte[] bytes = excelImportService.template();
        return ResponseEntity.ok()
                .header(
                        HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"medicare-import-template.xlsx\"")
                .contentType(
                        MediaType.parseMediaType(
                                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .contentLength(bytes.length)
                .body(bytes);
    }

    @PostMapping(value = "/import/preview", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAuthority('" + PermissionCatalog.USER_MANAGE + "')")
    public ImportPreviewDto importPreview(
            @RequestParam("file") MultipartFile file,
            @RequestParam(defaultValue = ExcelImportService.MODE_INITIALIZATION) String mode)
            throws Exception {
        return excelImportService.preview(file.getInputStream(), mode, file.getOriginalFilename());
    }

    @PostMapping(value = "/import/commit", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAuthority('" + PermissionCatalog.USER_MANAGE + "')")
    public ImportResultDto importCommit(
            @RequestParam("file") MultipartFile file,
            @RequestParam(defaultValue = ExcelImportService.MODE_INITIALIZATION) String mode)
            throws Exception {
        return excelImportService.commit(file.getInputStream(), mode, file.getOriginalFilename());
    }

    @GetMapping("/import/history")
    @PreAuthorize("hasAuthority('" + PermissionCatalog.USER_MANAGE + "')")
    public List<DataImportJobDto> importHistory() {
        return excelImportService.history();
    }

    @PostMapping("/demo/load")
    @PreAuthorize("hasAuthority('" + PermissionCatalog.USER_MANAGE + "')")
    public DemoDatasetStatusDto demoLoad(@RequestParam(defaultValue = "false") boolean force) {
        return demoDatasetService.load(force);
    }

    @PostMapping("/demo/reset")
    @PreAuthorize("hasAuthority('" + PermissionCatalog.USER_MANAGE + "')")
    public DemoDatasetStatusDto demoReset() {
        return demoDatasetService.reset();
    }

    @GetMapping("/demo/status")
    @PreAuthorize("hasAuthority('" + PermissionCatalog.USER_MANAGE + "')")
    public DemoDatasetStatusDto demoStatus() {
        return demoDatasetService.status();
    }

    @PostMapping("/catalogue/baseline")
    @PreAuthorize("hasAuthority('" + PermissionCatalog.USER_MANAGE + "')")
    public DemoDatasetStatusDto catalogueBaseline() {
        return demoDatasetService.loadCatalogueBaseline();
    }
}
