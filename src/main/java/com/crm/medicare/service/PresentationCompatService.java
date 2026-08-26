package com.crm.medicare.service;

import com.crm.medicare.entity.Appointment;
import com.crm.medicare.entity.AppointmentStatus;
import com.crm.medicare.entity.Invoice;
import com.crm.medicare.repository.AppointmentRepository;
import com.crm.medicare.repository.InvoiceRepository;
import com.crm.medicare.workflow.InvoiceStatus;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.TextStyle;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class PresentationCompatService {

    private static final ZoneId ZONE = ZoneId.of("Africa/Casablanca");
    private static final int CAPACITY_PER_SLOT = 4;

    private final AppointmentRepository appointmentRepository;
    private final InvoiceRepository invoiceRepository;

    @Transactional(readOnly = true)
    public List<Map<String, Object>> planningTension() {
        LocalDate today = LocalDate.now(ZONE);
        LocalDate weekStart = today.minusDays(today.getDayOfWeek().getValue() - 1L);
        LocalDateTime from = weekStart.atStartOfDay();
        LocalDateTime to = weekStart.plusDays(7).atStartOfDay();

        List<Appointment> appts =
                appointmentRepository.findInRange(
                        from,
                        to,
                        null,
                        null,
                        null,
                        null);

        Map<String, Integer> counts = new LinkedHashMap<>();
        for (int d = 0; d < 7; d++) {
            LocalDate day = weekStart.plusDays(d);
            String key = day.toString();
            counts.put(key + "|Matin", 0);
            counts.put(key + "|Midi", 0);
            counts.put(key + "|Après-midi", 0);
        }

        EnumSet<AppointmentStatus> ignored =
                EnumSet.of(AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW);
        for (Appointment a : appts) {
            if (a.getStartsAt() == null || (a.getStatut() != null && ignored.contains(a.getStatut()))) {
                continue;
            }
            LocalDate day = a.getStartsAt().toLocalDate();
            int hour = a.getStartsAt().getHour();
            String slot = hour < 12 ? "Matin" : hour < 14 ? "Midi" : "Après-midi";
            String key = day + "|" + slot;
            counts.computeIfPresent(key, (k, v) -> v + 1);
        }

        List<Map<String, Object>> rows = new ArrayList<>();
        for (Map.Entry<String, Integer> e : counts.entrySet()) {
            String[] parts = e.getKey().split("\\|", 2);
            LocalDate day = LocalDate.parse(parts[0]);
            String slot = parts[1];
            int n = e.getValue();
            String level =
                    n >= CAPACITY_PER_SLOT
                            ? "critique"
                            : n >= CAPACITY_PER_SLOT - 1
                                    ? "saturé"
                                    : n >= 2 ? "occupé" : "libre";
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("day", day.getDayOfWeek().name().substring(0, 3).toLowerCase(Locale.ROOT));
            row.put(
                    "dayLabel",
                    day.getDayOfWeek().getDisplayName(TextStyle.SHORT, Locale.FRENCH)
                            + " "
                            + day.getDayOfMonth());
            row.put("slot", slot);
            row.put("level", level);
            rows.add(row);
        }
        return rows;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> urgencesFraude() {
        return List.of();
    }

    private volatile String lastExportAt;

    @Transactional(readOnly = true)
    public Map<String, Object> syntheseComptable() {
        List<Invoice> invoices = invoiceRepository.findAllWithPatient();
        int validated = 0;
        int pending = 0;
        for (Invoice inv : invoices) {
            if (inv.getStatut() == InvoiceStatus.PAID) {
                validated++;
            } else if (inv.getStatut() != InvoiceStatus.CANCELLED
                    && inv.getStatut() != InvoiceStatus.REFUNDED) {
                pending++;
            }
        }
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("validated", validated);
        out.put("pending", pending);
        out.put("lastExport", lastExportAt);
        return out;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> exportComptable() {
        lastExportAt = LocalDate.now(ZONE).toString();
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("ok", true);
        out.put("exportedAt", lastExportAt);
        out.put("rows", invoiceRepository.count());
        return out;
    }
}
