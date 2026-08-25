package com.crm.medicare.service;

import com.crm.medicare.common.ApiException;
import com.crm.medicare.dto.StatusHistoryItemDto;
import com.crm.medicare.dto.WaitingRoomItemDto;
import com.crm.medicare.dto.WorklistItemDto;
import com.crm.medicare.entity.ExamStatusHistory;
import com.crm.medicare.entity.Examen;
import com.crm.medicare.repository.ExamenRepository;
import com.crm.medicare.workflow.EncounterStatus;
import com.crm.medicare.workflow.WorkflowEngine;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class WaitingRoomService {

    private static final ZoneId ZONE = ZoneId.of("Africa/Casablanca");
    private static final Set<EncounterStatus> IN_ROOM =
            EnumSet.of(
                    EncounterStatus.ARRIVED,
                    EncounterStatus.WAITING,
                    EncounterStatus.PREPARING,
                    EncounterStatus.IN_PROGRESS);
    private static final List<EncounterStatus> ADVANCE_ORDER =
            List.of(
                    EncounterStatus.ARRIVED,
                    EncounterStatus.WAITING,
                    EncounterStatus.PREPARING,
                    EncounterStatus.IN_PROGRESS,
                    EncounterStatus.COMPLETED,
                    EncounterStatus.REPORT_PENDING,
                    EncounterStatus.VALIDATED,
                    EncounterStatus.DISCHARGED);

    private final ExamenRepository examenRepository;
    private final WorklistService worklistService;
    private final WorkflowEngine workflowEngine;

    @Transactional(readOnly = true)
    public List<WaitingRoomItemDto> list(String statut, String priorite) {
        LocalDate today = LocalDate.now(ZONE);
        LocalDateTime debut = today.atStartOfDay();
        LocalDateTime fin = today.plusDays(1).atStartOfDay();
        LocalDateTime now = LocalDateTime.now(ZONE);

        return examenRepository.findWithPatientByDateRange(debut, fin).stream()
                .filter(e -> e.getWorkflowStatus() != null && IN_ROOM.contains(e.getWorkflowStatus()))
                .filter(e -> matchesStatut(e, statut))
                .filter(e -> matchesPriorite(e, priorite))
                .sorted(
                        Comparator.comparing(
                                        (Examen e) ->
                                                priorityRank(e.getPriorite()),
                                        Comparator.naturalOrder())
                                .thenComparing(
                                        Examen::getArrivedAt,
                                        Comparator.nullsLast(Comparator.naturalOrder()))
                                .thenComparing(
                                        Examen::getDateExamen,
                                        Comparator.nullsLast(Comparator.naturalOrder())))
                .map(e -> toDto(e, now))
                .toList();
    }

    @Transactional
    public WaitingRoomItemDto advance(Long examenId) {
        Examen examen =
                examenRepository
                        .findByIdWithPatient(examenId)
                        .orElseThrow(() -> ApiException.notFound("Examen introuvable"));
        EncounterStatus from =
                examen.getWorkflowStatus() != null
                        ? examen.getWorkflowStatus()
                        : EncounterStatus.SCHEDULED;
        EncounterStatus to = nextStatus(from);
        if (to == null) {
            throw ApiException.conflict(
                    "invalid_transition", "Aucun statut suivant depuis " + from);
        }
        workflowEngine.transitionEncounter(from, to);
        WorklistItemDto updated = worklistService.applyWorkflowStatus(examenId, to);
        return toDto(
                examenRepository
                        .findByIdWithPatient(Long.valueOf(updated.getId()))
                        .orElseThrow(() -> ApiException.notFound("Examen introuvable")),
                LocalDateTime.now(ZONE));
    }

    @Transactional(readOnly = true)
    public List<StatusHistoryItemDto> history(Long examenId) {
        Examen examen =
                examenRepository
                        .findByIdWithPatient(examenId)
                        .orElseThrow(() -> ApiException.notFound("Examen introuvable"));
        return examen.getStatusHistory().stream()
                .sorted(Comparator.comparing(ExamStatusHistory::getCreatedAt))
                .map(
                        h ->
                                StatusHistoryItemDto.builder()
                                        .fromStatus(h.getFromStatus())
                                        .toStatus(h.getToStatus())
                                        .actor(h.getActorName())
                                        .note(null)
                                        .at(h.getCreatedAt())
                                        .build())
                .toList();
    }

    private EncounterStatus nextStatus(EncounterStatus from) {
        int idx = ADVANCE_ORDER.indexOf(from);
        if (idx < 0 || idx >= ADVANCE_ORDER.size() - 1) {
            return null;
        }
        return ADVANCE_ORDER.get(idx + 1);
    }

    private boolean matchesStatut(Examen e, String statut) {
        if (statut == null || statut.isBlank() || "tous".equalsIgnoreCase(statut)) {
            return true;
        }
        return e.getWorkflowStatus() != null
                && e.getWorkflowStatus().name().equalsIgnoreCase(statut.trim());
    }

    private boolean matchesPriorite(Examen e, String priorite) {
        if (priorite == null || priorite.isBlank() || "tous".equalsIgnoreCase(priorite)) {
            return true;
        }
        return e.getPriorite() != null && e.getPriorite().equalsIgnoreCase(priorite.trim());
    }

    private int priorityRank(String priorite) {
        if (priorite == null) {
            return 2;
        }
        return switch (priorite.toUpperCase(Locale.ROOT)) {
            case "URGENT", "STAT" -> 0;
            case "PRIORITY", "PRIORITAIRE" -> 1;
            default -> 2;
        };
    }

    private WaitingRoomItemDto toDto(Examen e, LocalDateTime now) {
        LocalDateTime arrived =
                e.getArrivedAt() != null
                        ? e.getArrivedAt()
                        : (IN_ROOM.contains(e.getWorkflowStatus()) ? e.getDateExamen() : null);
        Integer attente = null;
        if (arrived != null && !arrived.isAfter(now)) {
            attente = (int) Math.max(0, Duration.between(arrived, now).toMinutes());
        }
        return WaitingRoomItemDto.builder()
                .id(String.valueOf(e.getId()))
                .patient(e.getPatient() != null ? e.getPatient().getNomComplet() : null)
                .patientId(e.getPatient() != null ? String.valueOf(e.getPatient().getId()) : null)
                .examen(e.getDescription() != null ? e.getDescription() : e.getExamTypeCode())
                .modalite(e.getModalite() != null ? e.getModalite().name() : null)
                .priorite(e.getPriorite())
                .statut(labelStatut(e.getWorkflowStatus()))
                .workflowStatus(e.getWorkflowStatus() != null ? e.getWorkflowStatus().name() : null)
                .operateur(e.getMedecin())
                .attenteMinutes(attente)
                .heurePrevue(e.getDateExamen())
                .heureArrivee(arrived)
                .build();
    }

    private static String labelStatut(EncounterStatus s) {
        if (s == null) {
            return "scheduled";
        }
        return switch (s) {
            case ARRIVED -> "arrived";
            case WAITING -> "waiting";
            case PREPARING -> "preparing";
            case IN_PROGRESS -> "in_progress";
            default -> s.name().toLowerCase(Locale.ROOT);
        };
    }
}
