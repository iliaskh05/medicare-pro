package com.crm.medicare.controller;

import com.crm.medicare.dto.AppointmentCancelRequest;
import com.crm.medicare.dto.AppointmentDto;
import com.crm.medicare.dto.AppointmentRescheduleRequest;
import com.crm.medicare.dto.AppointmentWriteRequest;
import com.crm.medicare.dto.ResourceDto;
import com.crm.medicare.security.PermissionCatalog;
import com.crm.medicare.service.AppointmentService;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
public class AppointmentController {

    private final AppointmentService appointmentService;

    @GetMapping({"/api/appointments", "/api/v1/appointments"})
    @PreAuthorize("hasAuthority('" + PermissionCatalog.APPOINTMENT_READ + "')")
    public List<AppointmentDto> list(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) String statut,
            @RequestParam(required = false) Long resourceId,
            @RequestParam(required = false) Long medecinId,
            @RequestParam(required = false) String modalite) {
        return appointmentService.list(from, to, statut, resourceId, medecinId, modalite);
    }

    @GetMapping({"/api/appointments/{id}", "/api/v1/appointments/{id}"})
    @PreAuthorize("hasAuthority('" + PermissionCatalog.APPOINTMENT_READ + "')")
    public AppointmentDto get(@PathVariable Long id) {
        return appointmentService.getById(id);
    }

    @PostMapping({"/api/appointments", "/api/v1/appointments"})
    @PreAuthorize("hasAuthority('" + PermissionCatalog.APPOINTMENT_CREATE + "')")
    public ResponseEntity<AppointmentDto> create(@RequestBody AppointmentWriteRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(appointmentService.create(request));
    }

    @PatchMapping({"/api/appointments/{id}", "/api/v1/appointments/{id}"})
    @PreAuthorize("hasAuthority('" + PermissionCatalog.APPOINTMENT_UPDATE + "')")
    public AppointmentDto patch(@PathVariable Long id, @RequestBody AppointmentWriteRequest request) {
        return appointmentService.patch(id, request);
    }

    @PostMapping({"/api/appointments/{id}/confirm", "/api/v1/appointments/{id}/confirm"})
    @PreAuthorize("hasAuthority('" + PermissionCatalog.APPOINTMENT_UPDATE + "')")
    public AppointmentDto confirm(@PathVariable Long id) {
        return appointmentService.confirm(id);
    }

    @PostMapping({"/api/appointments/{id}/cancel", "/api/v1/appointments/{id}/cancel"})
    @PreAuthorize("hasAuthority('" + PermissionCatalog.APPOINTMENT_UPDATE + "')")
    public AppointmentDto cancel(
            @PathVariable Long id, @RequestBody(required = false) AppointmentCancelRequest request) {
        return appointmentService.cancel(id, request);
    }

    @PostMapping({"/api/appointments/{id}/reschedule", "/api/v1/appointments/{id}/reschedule"})
    @PreAuthorize("hasAuthority('" + PermissionCatalog.APPOINTMENT_UPDATE + "')")
    public AppointmentDto reschedule(
            @PathVariable Long id, @RequestBody AppointmentRescheduleRequest request) {
        return appointmentService.reschedule(id, request);
    }

    @PostMapping({"/api/appointments/{id}/check-in", "/api/v1/appointments/{id}/check-in"})
    @PreAuthorize("hasAuthority('" + PermissionCatalog.APPOINTMENT_UPDATE + "')")
    public AppointmentDto checkIn(@PathVariable Long id) {
        return appointmentService.checkIn(id);
    }

    @PostMapping({"/api/appointments/{id}/no-show", "/api/v1/appointments/{id}/no-show"})
    @PreAuthorize("hasAuthority('" + PermissionCatalog.APPOINTMENT_UPDATE + "')")
    public AppointmentDto noShow(@PathVariable Long id) {
        return appointmentService.noShow(id);
    }

    @GetMapping({"/api/resources", "/api/v1/resources"})
    @PreAuthorize("hasAuthority('" + PermissionCatalog.APPOINTMENT_READ + "')")
    public List<ResourceDto> resources(
            @RequestParam(defaultValue = "false") boolean includeInactive) {
        return appointmentService.listResources(includeInactive);
    }

    @PostMapping({"/api/resources", "/api/v1/resources"})
    @PreAuthorize("hasAuthority('" + PermissionCatalog.SETTINGS_WRITE + "')")
    public ResponseEntity<ResourceDto> createResource(@RequestBody Map<String, String> body) {
        String code = body != null ? body.get("code") : null;
        String libelle = body != null ? body.get("libelle") : null;
        String modalite = body != null ? body.get("modalite") : null;
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(appointmentService.createResource(code, libelle, modalite));
    }
}
