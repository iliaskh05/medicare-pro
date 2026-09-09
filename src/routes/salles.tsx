import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, RefreshCw } from "lucide-react";

import { NouveauRdvDialog } from "@/components/appointments/nouveau-rdv-dialog";
import { ErrorState, LoadingState, NoDataState } from "@/components/data-state";
import { WriteGuard } from "@/components/permission-guard";
import { Button } from "@/components/ui/button";
import { KpiStat, PageHeader, Pill } from "@/components/ui-kit";
import {
  fetchAppointments,
  fetchResources,
  type AppointmentDto,
  type ResourceDto,
} from "@/lib/api/appointments";
import { describeApiError, type FriendlyError } from "@/lib/api/errors";
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

type RoomStatus = "AVAILABLE" | "OCCUPIED" | "OUT_OF_SERVICE";

function roomStatus(room: ResourceDto, appointments: AppointmentDto[], now: Date): RoomStatus {
  if (room.actif === false) return "OUT_OF_SERVICE";
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
  return busy ? "OCCUPIED" : "AVAILABLE";
}

function statusLabel(status: RoomStatus): string {
  switch (status) {
    case "AVAILABLE":
      return "Libre";
    case "OCCUPIED":
      return "Occupée";
    default:
      return "Hors service";
  }
}

function statusTone(status: RoomStatus): "success" | "warning" | "destructive" {
  if (status === "AVAILABLE") return "success";
  if (status === "OCCUPIED") return "warning";
  return "destructive";
}

function currentOccupancy(
  room: ResourceDto,
  appointments: AppointmentDto[],
  now: Date,
): AppointmentDto | null {
  if (room.actif === false) return null;
  const nowMin = now.getHours() * 60 + now.getMinutes();
  return (
    appointments.find((appt) => {
      if (!isActiveAppointmentStatus(String(appt.statut))) return false;
      if (String(appt.resourceId ?? "") !== room.id) return false;
      const start = timeToMinutes(appointmentTime(appt.startsAt));
      if (Number.isNaN(start) || start < 0) return false;
      const end = appt.endsAt
        ? timeToMinutes(appointmentTime(appt.endsAt))
        : start + (appt.dureeMinutes || 30);
      return start <= nowMin && nowMin < end;
    }) ?? null
  );
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
  const navigate = useNavigate();
  const [resources, setResources] = useState<ResourceDto[]>([]);
  const [appointments, setAppointments] = useState<AppointmentDto[]>([]);
  const [resourcesLoading, setResourcesLoading] = useState(true);
  const [appointmentsLoading, setAppointmentsLoading] = useState(true);
  const [resourcesError, setResourcesError] = useState<FriendlyError | null>(null);
  const [appointmentsError, setAppointmentsError] = useState<FriendlyError | null>(null);
  const [now] = useState(() => new Date());
  const [createOpen, setCreateOpen] = useState(false);
  const [createDefaults, setCreateDefaults] = useState<{ date?: string; time?: string; resourceId?: string }>();
  const [reloadKey, setReloadKey] = useState(0);

  const loadResources = useCallback(
    (signal: AbortSignal) => {
      setResourcesLoading(true);
      setResourcesError(null);
      return fetchResources({ includeInactive: true, signal })
        .then(setResources)
        .catch((e: unknown) => {
          setResources([]);
          setResourcesError(describeApiError(e));
        })
        .finally(() => {
          if (!signal.aborted) setResourcesLoading(false);
        });
    },
    [],
  );

  const loadAppointments = useCallback(
    (signal: AbortSignal) => {
      setAppointmentsLoading(true);
      setAppointmentsError(null);
      return fetchAppointments({ from: today, to: today }, signal)
        .then(setAppointments)
        .catch((e: unknown) => {
          setAppointments([]);
          setAppointmentsError(describeApiError(e));
        })
        .finally(() => {
          if (!signal.aborted) setAppointmentsLoading(false);
        });
    },
    [today],
  );

  useEffect(() => {
    const controller = new AbortController();
    void loadResources(controller.signal);
    void loadAppointments(controller.signal);
    return () => controller.abort();
  }, [loadAppointments, loadResources, reloadKey]);

  const rows = useMemo(
    () =>
      resources.map((room) => ({
        room,
        status: roomStatus(room, appointments, now),
        current: currentOccupancy(room, appointments, now),
      })),
    [resources, appointments, now],
  );

  const kpis = useMemo(() => {
    const total = resources.length;
    const out = rows.filter((r) => r.status === "OUT_OF_SERVICE").length;
    const occupied = rows.filter((r) => r.status === "OCCUPIED").length;
    const available = rows.filter((r) => r.status === "AVAILABLE").length;
    return { total, available, occupied, out };
  }, [resources.length, rows]);

  const occupancyAvailable = !appointmentsError;

  return (
    <div className="page-shell space-y-6">
      <PageHeader
        eyebrow="Activité médicale"
        title="Salles"
        subtitle={`Occupation du ${today} · créneaux 08:30–18:30`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setReloadKey((n) => n + 1)}
            >
              <RefreshCw className="mr-1.5 size-4" /> Actualiser
            </Button>
            <WriteGuard resource="appointments">
              <Button
                size="sm"
                onClick={() => {
                  setCreateDefaults({ date: today });
                  setCreateOpen(true);
                }}
              >
                <Plus className="mr-1.5 size-4" /> Nouveau rendez-vous
              </Button>
            </WriteGuard>
          </div>
        }
      />

      {resourcesLoading && appointmentsLoading ? (
        <LoadingState rows={5} label="Chargement des salles…" />
      ) : resourcesError && resources.length === 0 ? (
        <ErrorState error={resourcesError} onRetry={() => setReloadKey((n) => n + 1)} />
      ) : resources.length === 0 ? (
        <NoDataState
          title="Aucune salle ni ressource d'imagerie n'est configurée."
          description="Le directeur peut créer les salles (IRM, scanner, échographie) depuis Paramètres ou Données."
          action={
            <WriteGuard resource="settings">
              <Button variant="outline" size="sm" onClick={() => navigate({ to: "/parametres" })}>
                Ouvrir l'administration
              </Button>
            </WriteGuard>
          }
        />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <KpiStat label="Ressources" value={kpis.total} />
            <KpiStat
              label="Libres maintenant"
              value={occupancyAvailable ? kpis.available : null}
              tone="success"
            />
            <KpiStat
              label="Occupées maintenant"
              value={occupancyAvailable ? kpis.occupied : null}
              tone="warning"
            />
            <KpiStat label="Hors service" value={kpis.out} tone="destructive" />
          </div>

          {appointmentsError ? (
            <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm">
              <p className="font-semibold">Occupation du jour temporairement indisponible</p>
              <p className="mt-1 text-muted-foreground">{appointmentsError.message}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => setReloadKey((n) => n + 1)}
              >
                Réessayer l&apos;occupation
              </Button>
            </div>
          ) : null}

          <div className="space-y-4">
            {rows.map(({ room, status, current }) => (
              <div key={room.id} className="app-surface overflow-hidden">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{room.libelle}</p>
                    <p className="text-xs text-muted-foreground">
                      {room.code || "—"} · {room.modalite || "Modalité non renseignée"}
                    </p>
                    {current ? (
                      <p className="mt-1 text-xs">
                        En cours : {current.patient} — {current.examenLibelle || current.modalite} ·{" "}
                        {appointmentTime(current.startsAt)}–{appointmentTime(current.endsAt)}
                      </p>
                    ) : status === "AVAILABLE" ? (
                      <p className="mt-1 text-xs text-muted-foreground">Aucun patient en salle</p>
                    ) : null}
                  </div>
                  <Pill tone={statusTone(status)}>{statusLabel(status)}</Pill>
                </div>
                <div className="overflow-x-auto px-3 py-3">
                  {appointmentsLoading ? (
                    <p className="px-1 py-2 text-xs text-muted-foreground">Chargement du planning…</p>
                  ) : (
                    <div className="flex min-w-max gap-1">
                      {DAY_SLOTS.map((slot) => {
                        if (status === "OUT_OF_SERVICE") {
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
                        const hit = occupancyAvailable ? slotOccupied(room.id, slot, appointments) : null;
                        return (
                          <button
                            type="button"
                            key={slot}
                            title={
                              hit
                                ? `${slot} · ${hit.patient} · ${hit.examenLibelle || hit.modalite}`
                                : `${slot} · Libre — créer un rendez-vous`
                            }
                            onClick={() => {
                              if (hit) {
                                void navigate({ to: "/agenda", search: { highlight: hit.id } as never });
                                return;
                              }
                              setCreateDefaults({ date: today, time: slot, resourceId: room.id });
                              setCreateOpen(true);
                            }}
                            className={cn(
                              "flex h-14 w-10 flex-col items-center justify-center rounded border text-left",
                              hit
                                ? "border-amber-500/40 bg-amber-500/15"
                                : "border-border/70 bg-muted/20 hover:border-primary/40 hover:bg-primary/5",
                            )}
                          >
                            <span className="text-[9px] font-medium tabular-nums text-muted-foreground">
                              {slot.slice(0, 5)}
                            </span>
                            <span
                              className={cn(
                                "mt-0.5 text-[8px] font-semibold uppercase",
                                hit
                                  ? "text-amber-700 dark:text-amber-400"
                                  : "text-emerald-700 dark:text-emerald-400",
                              )}
                            >
                              {hit ? "Occ." : "Lib."}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <NouveauRdvDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        defaults={createDefaults}
        onCreated={() => setReloadKey((n) => n + 1)}
      />
    </div>
  );
}
