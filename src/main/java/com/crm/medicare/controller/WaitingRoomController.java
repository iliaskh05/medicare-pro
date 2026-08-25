package com.crm.medicare.controller;

import com.crm.medicare.dto.StatusHistoryItemDto;
import com.crm.medicare.dto.WaitingRoomItemDto;
import com.crm.medicare.security.PermissionCatalog;
import com.crm.medicare.service.WaitingRoomService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
public class WaitingRoomController {

    private final WaitingRoomService waitingRoomService;

    @GetMapping({"/api/waiting-room", "/api/v1/waiting-room"})
    @PreAuthorize("hasAuthority('" + PermissionCatalog.EXAM_READ + "')")
    public List<WaitingRoomItemDto> list(
            @RequestParam(required = false) String statut,
            @RequestParam(required = false) String priorite) {
        return waitingRoomService.list(statut, priorite);
    }

    @PostMapping({
        "/api/waiting-room/{examenId}/advance",
        "/api/v1/waiting-room/{examenId}/advance"
    })
    @PreAuthorize("hasAuthority('" + PermissionCatalog.EXAM_UPDATE + "')")
    public WaitingRoomItemDto advance(@PathVariable Long examenId) {
        return waitingRoomService.advance(examenId);
    }

    @GetMapping({
        "/api/waiting-room/{examenId}/history",
        "/api/v1/waiting-room/{examenId}/history"
    })
    @PreAuthorize("hasAuthority('" + PermissionCatalog.EXAM_READ + "')")
    public List<StatusHistoryItemDto> history(@PathVariable Long examenId) {
        return waitingRoomService.history(examenId);
    }
}
