import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { DoorOpen } from "lucide-react";

import { EmptyState, PageHeader, Pill } from "@/components/ui-kit";
import { Skeleton } from "@/components/ui/skeleton";
import {
  fetchAppointments,
  fetchResources,
  type AppointmentDto,
  type ResourceDto,
} from "@/lib/api/appointments";
import {
  appointmentTime,
  generateDaySlots,
  isActiveAppointmentStatus,
  rangesOverlap,
  timeToMinutes,
} from "@/lib/appointment-slots";
import { toLocalDateKey } from "@/lib/date";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/salles")({
  head: () => ({ meta: [{ title: "Salles — RadioCRM" }] }),
  component: SallesPage,
});

const DAY_SLOTS = generateDaySlots();

type RoomStatus = "Libre" | "Occupée" | "Hors service";

function roomStatus(
  room: ResourceDto,
  appointments: AppointmentDto[],
  now: Date,
): RoomStatus {
  if (room.actif === false) return "Hors service";
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const busy = appointments.some((appt) => {
    if (!isActiveAppointmentStatus(String(appt.statut))) return false;
    if (String(appt.resourceId ?? "") !== room.id) return false;
    const start = timeToMinutes(appointmentTime(appt.startsAt));
    if (Number.isNaN(start) || start < 0) return false;
    const end = appt.endsAt
      ? timeToMinutes(appointmentTime(appt.endsAt))
      : start + (appt.dureeMinutes || 30);
    return start <= nowMin && nowMin < end;
  });
  return busy ? "Occupée" : "Libre";
}

function statusTone(status: RoomStatus): "success" | "warning" | "destructive" | "neutral" {
  switch (status) {
    case "Libre":
      return "success";
    case "Occupée":
      return "warning";
    case "Hors service":
      return "destructive";
    default:
      return "neutral";
  }
}

function slotOccupied(
  roomId: string,
  slotLabel: string,
  appointments: AppointmentDto[],
): AppointmentDto | null {
  const slotStart = timeToMinutes(slotLabel);
  const slotEnd = slotStart + 30;
  return (
    appointments.find((appt) => {
      if (!isActiveAppointmentStatus(String(appt.statut))) return false;
      if (String(appt.resourceId ?? "") !== roomId) return false;
      const start = timeToMinutes(appointmentTime(appt.startsAt));
      if (Number.isNaN(start) || start < 0) return false;
      const end = appt.endsAt
        ? timeToMinutes(appointmentTime(appt.endsAt))
        : start + (appt.dureeMinutes || 30);
      return rangesOverlap(slotStart, slotEnd, start, end);
    }) ?? null
  );
}

function SallesPage() {
  const today = toLocalDateKey();
  const [resources, setResources] = useState<ResourceDto[]>([]);
  const [appointments, setAppointments] = useState<AppointmentDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [now] = useState(() => new Date());

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    Promise.all([
      fetchResources(controller.signal),
      fetchAppointments({ from: today, to: today }, controller.signal),
    ])
      .then(([rooms, appts]) => {
        setResources(rooms);
        setAppointments(appts);
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : "Impossible de charger les salles");
        setResources([]);
        setAppointments([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [today]);

  const rows = useMemo(() => {
    return resources.map((room) => ({
      room,
      status: roomStatus(room, appointments, now),
    }));
  }, [resources, appointments, now]);

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Activité"
        title="Salles"
        subtitle={`Occupation du jour ${today} · créneaux 08:30–18:30`}
      />

      {loading ? (
        <Skeleton className="h-80" />
      ) : error ? (
        <EmptyState icon={DoorOpen} title="Impossible de charger les salles." />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={DoorOpen}
          title="Aucune salle configurée"
          description="Ajoutez des ressources (salles / machines) côté administration."
        />
      ) : (
        <div className="space-y-4">
          {rows.map(({ room, status }) => (
            <div key={room.id} className="app-surface overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{room.libelle}</p>
                  <p className="text-xs text-muted-foreground">
                    {room.code || "—"} · {room.modalite || "Modalité —"}
                  </p>
                </div>
                <Pill tone={statusTone(status)}>{status}</Pill>
              </div>
              <div className="overflow-x-auto px-3 py-3">
                <div className="flex min-w-max gap-1">
                  {DAY_SLOTS.map((slot) => {
                    if (status === "Hors service") {
                      return (
                        <div
                          key={slot}
                          title={`${slot} · Hors service`}
                          className="flex h-14 w-10 flex-col items-center justify-center rounded border border-destructive/30 bg-destructive/10"
                        >
                          <span className="text-[9px] font-medium tabular-nums text-muted-foreground">
                            {slot}
                          </span>
                        </div>
                      );
                    }
                    const hit = slotOccupied(room.id, slot, appointments);
                    return (
                      <div
                        key={slot}
                        title={
                          hit
                            ? `${slot} · Occupé · ${hit.patient} · ${hit.examenLibelle || hit.modalite}`
                            : `${slot} · Libre`
                        }
                        className={cn(
                          "flex h-14 w-10 flex-col items-center justify-center rounded border",
                          hit
                            ? "border-amber-500/40 bg-amber-500/15"
                            : "border-border/70 bg-muted/20",
                        )}
                      >
                        <span className="text-[9px] font-medium tabular-nums text-muted-foreground">
                          {slot.slice(0, 5)}
                        </span>
                        <span
                          className={cn(
                            "mt-0.5 text-[8px] font-semibold uppercase",
                            hit ? "text-amber-700 dark:text-amber-400" : "text-emerald-700 dark:text-emerald-400",
                          )}
                        >
                          {hit ? "Occ." : "Lib."}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
