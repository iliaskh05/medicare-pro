import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { CalendarDays } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState, PageHeader, Pill } from "@/components/ui-kit";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  cancelAppointment,
  checkInAppointment,
  confirmAppointment,
  fetchAppointments,
  fetchResources,
  noShowAppointment,
  rescheduleAppointment,
  type AppointmentDto,
  type ResourceDto,
} from "@/lib/api/appointments";
import { MODALITES } from "@/lib/api/worklist";
import { Skeleton } from "@/components/ui/skeleton";
import { useDisplayPreference } from "@/hooks/use-display-preference";
import {
  addDaysToKey,
  addMonthsToKey,
  formatMonthYear,
  parseLocalDateKey,
  startOfWeekKey,
  toLocalDateKey,
} from "@/lib/date";
import { WriteGuard } from "@/components/permission-guard";

export const Route = createFileRoute("/agenda")({
  head: () => ({ meta: [{ title: "Agenda — RadioCRM" }] }),
  component: AgendaPage,
});

type View = "jour" | "semaine" | "mois" | "liste";

const WEEKDAY_HEADERS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"] as const;

function shortPatient(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "—";
  if (parts.length === 1) return parts[0]!.slice(0, 14);
  const last = parts[parts.length - 1]!;
  return `${parts[0]} ${last[0] ?? ""}.`;
}

function appointmentDayKey(row: AppointmentDto): string {
  return (row.startsAt ?? "").slice(0, 10);
}

/** HH:mm depuis startsAt (ISO, espace, ou tableau Jackson rare). */
function appointmentTime(startsAt: string | null | undefined): string {
  if (!startsAt) return "—:—";
  if (typeof startsAt !== "string") {
    const arr = startsAt as unknown;
    if (Array.isArray(arr) && arr.length >= 5) {
      return `${String(arr[3]).padStart(2, "0")}:${String(arr[4]).padStart(2, "0")}`;
    }
    return "—:—";
  }
  const m = startsAt.match(/T(\d{2}):(\d{2})/) ?? startsAt.match(/\s(\d{2}):(\d{2})/);
  if (m) return `${m[1]}:${m[2]}`;
  const d = new Date(startsAt);
  if (!Number.isNaN(d.getTime())) {
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }
  return "—:—";
}

function appointmentEndTime(row: AppointmentDto): string {
  if (row.endsAt) return appointmentTime(row.endsAt);
  const start = appointmentTime(row.startsAt);
  if (start === "—:—") return start;
  const [h, m] = start.split(":").map(Number);
  const total = (h ?? 0) * 60 + (m ?? 0) + (row.dureeMinutes || 30);
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function statutTone(statut: string): "primary" | "success" | "warning" | "destructive" | "neutral" {
  switch (statut) {
    case "CONFIRMED":
    case "CHECKED_IN":
      return "success";
    case "RESCHEDULED":
      return "warning";
    case "CANCELLED":
    case "NO_SHOW":
      return "destructive";
    default:
      return "primary";
  }
}

function AgendaPage() {
  const { mode, setMode } = useDisplayPreference("agenda", "calendar");
  const [view, setView] = useState<View>(() =>
    mode === "list" ? "liste" : "mois",
  );
  const [cursorKey, setCursorKey] = useState(() => toLocalDateKey());
  const [modalite, setModalite] = useState("toutes");
  const [status, setStatus] = useState("tous");
  const [resourceId, setResourceId] = useState("toutes");
  const [resources, setResources] = useState<ResourceDto[]>([]);
  const [rows, setRows] = useState<AppointmentDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rescheduleId, setRescheduleId] = useState<string | null>(null);
  const [rescheduleAt, setRescheduleAt] = useState("");

  const range = useMemo(() => {
    if (view === "jour") return { from: cursorKey, to: cursorKey };
    if (view === "semaine" || view === "liste") {
      const start = startOfWeekKey(cursorKey);
      return { from: start, to: addDaysToKey(start, 6) };
    }
    const parts = cursorKey.split("-").map(Number);
    const y = parts[0] ?? 1970;
    const m = parts[1] ?? 1;
    const start = `${y}-${String(m).padStart(2, "0")}-01`;
    const last = new Date(y, m, 0).getDate();
    return { from: start, to: `${y}-${String(m).padStart(2, "0")}-${String(last).padStart(2, "0")}` };
  }, [cursorKey, view]);

  const weekDays = useMemo(() => {
    const start = startOfWeekKey(cursorKey);
    return Array.from({ length: 7 }, (_, i) => addDaysToKey(start, i));
  }, [cursorKey]);

  useEffect(() => {
    fetchResources()
      .then(setResources)
      .catch(() => setResources([]));
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    fetchAppointments(
      {
        from: range.from,
        to: range.to,
        ...(status !== "tous" ? { statut: status } : {}),
        ...(modalite !== "toutes" ? { modalite } : {}),
        ...(resourceId !== "toutes" ? { resourceId } : {}),
      },
      controller.signal,
    )
      .then(setRows)
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : "Impossible de charger l'agenda"),
      )
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [range.from, range.to, status, modalite, resourceId]);

  const byDay = useMemo(() => {
    const map = new Map<string, AppointmentDto[]>();
    for (const day of weekDays) map.set(day, []);
    for (const row of rows) {
      const key = appointmentDayKey(row);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(row);
    }
    for (const list of map.values()) {
      list.sort((a, b) => (a.startsAt ?? "").localeCompare(b.startsAt ?? ""));
    }
    return map;
  }, [rows, weekDays]);

  /** Calendar cells for mois: null = padding outside month, string = YYYY-MM-DD. */
  const monthCells = useMemo(() => {
    if (view !== "mois") return [] as (string | null)[];
    const parts = cursorKey.split("-").map(Number);
    const y = parts[0] ?? 1970;
    const m = parts[1] ?? 1;
    const firstKey = `${y}-${String(m).padStart(2, "0")}-01`;
    const lead = (parseLocalDateKey(firstKey).getDay() + 6) % 7;
    const last = new Date(y, m, 0).getDate();
    const cells: (string | null)[] = Array.from({ length: lead }, () => null);
    for (let d = 1; d <= last; d++) {
      cells.push(`${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
    }
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [cursorKey, view]);

  const monthByDay = useMemo(() => {
    const map = new Map<string, AppointmentDto[]>();
    for (const cell of monthCells) {
      if (cell) map.set(cell, []);
    }
    for (const row of rows) {
      const key = appointmentDayKey(row);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(row);
    }
    for (const list of map.values()) {
      list.sort((a, b) => (a.startsAt ?? "").localeCompare(b.startsAt ?? ""));
    }
    return map;
  }, [rows, monthCells]);

  const dayRows = useMemo(() => {
    return rows
      .filter((r) => appointmentDayKey(r) === cursorKey)
      .sort((a, b) => (a.startsAt ?? "").localeCompare(b.startsAt ?? ""));
  }, [rows, cursorKey]);

  /** Créneaux horaires 7h–20h pour la vue jour. */
  const dayTimeline = useMemo(() => {
    const hours = Array.from({ length: 14 }, (_, i) => i + 7); // 07 → 20
    return hours.map((hour) => {
      const label = `${String(hour).padStart(2, "0")}:00`;
      const items = dayRows.filter((r) => {
        const t = appointmentTime(r.startsAt);
        if (t === "—:—") return false;
        return Number(t.slice(0, 2)) === hour;
      });
      return { hour, label, items };
    });
  }, [dayRows]);

  const periodLabel = useMemo(() => {
    if (view === "mois") return formatMonthYear(cursorKey);
    if (view === "jour") return cursorKey;
    return `${range.from} → ${range.to}`;
  }, [view, cursorKey, range.from, range.to]);

  const changeView = (v: View) => {
    setView(v);
    setMode(v === "liste" ? "list" : "calendar");
  };

  const openDay = (day: string) => {
    setCursorKey(day);
    changeView("jour");
  };

  const rowActions = (row: AppointmentDto) => (
    <div className="flex flex-wrap items-center gap-2">
      <Pill tone={statutTone(row.statut)}>{row.statut}</Pill>
      {row.statut !== "CANCELLED" && row.statut !== "CHECKED_IN" && row.statut !== "NO_SHOW" ? (
        <WriteGuard resource="appointments">
          {row.statut === "SCHEDULED" || row.statut === "RESCHEDULED" ? (
            <Button
              size="sm"
              variant="outline"
              disabled={busyId === row.id}
              onClick={async () => {
                setBusyId(row.id);
                try {
                  const updated = await confirmAppointment(row.id);
                  setRows((list) => list.map((r) => (r.id === row.id ? updated : r)));
                  toast.success("Rendez-vous confirmé.");
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Confirmation impossible");
                } finally {
                  setBusyId(null);
                }
              }}
            >
              Confirmer
            </Button>
          ) : null}
          <Button
            size="sm"
            variant="outline"
            disabled={busyId === row.id}
            onClick={async () => {
              setBusyId(row.id);
              try {
                const updated = await checkInAppointment(row.id);
                setRows((list) => list.map((r) => (r.id === row.id ? updated : r)));
                toast.success("Check-in effectué — patient en file d'attente.");
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Check-in impossible");
              } finally {
                setBusyId(null);
              }
            }}
          >
            Check-in
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={busyId === row.id}
            onClick={() => {
              setRescheduleId(row.id);
              setRescheduleAt((row.startsAt || "").slice(0, 16).replace(" ", "T"));
            }}
          >
            Reporter
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={busyId === row.id}
            onClick={async () => {
              if (!window.confirm(`Marquer ${row.patient} en no-show ?`)) return;
              setBusyId(row.id);
              try {
                const updated = await noShowAppointment(row.id);
                setRows((list) => list.map((r) => (r.id === row.id ? updated : r)));
                toast.success("No-show enregistré.");
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "No-show impossible");
              } finally {
                setBusyId(null);
              }
            }}
          >
            No-show
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={busyId === row.id}
            onClick={async () => {
              if (!window.confirm(`Annuler le RDV de ${row.patient} ?`)) return;
              setBusyId(row.id);
              try {
                const updated = await cancelAppointment(row.id, "Annulation agenda");
                setRows((list) => list.map((r) => (r.id === row.id ? updated : r)));
                toast.success("Rendez-vous annulé.");
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Annulation impossible");
              } finally {
                setBusyId(null);
              }
            }}
          >
            Annuler
          </Button>
        </WriteGuard>
      ) : null}
    </div>
  );

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Activité"
        title="Agenda"
        subtitle={`Rendez-vous réels · ${periodLabel}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button size="sm" asChild>
              <Link to="/accueil" search={{ mode: "rdv" }}>
                Nouveau RDV
              </Link>
            </Button>
            {(
              [
                { id: "jour" as const, label: "Jour" },
                { id: "semaine" as const, label: "Semaine" },
                { id: "mois" as const, label: "Mois" },
                { id: "liste" as const, label: "Liste" },
              ] as const
            ).map((v) => (
              <Button
                key={v.id}
                size="sm"
                variant={view === v.id ? "default" : "outline"}
                onClick={() => changeView(v.id)}
              >
                {v.label}
              </Button>
            ))}
          </div>
        }
      />
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            setCursorKey(
              view === "mois"
                ? addMonthsToKey(cursorKey, -1)
                : addDaysToKey(cursorKey, view === "jour" ? -1 : -7),
            )
          }
        >
          Précédent
        </Button>
        <Button variant="outline" size="sm" onClick={() => setCursorKey(toLocalDateKey())}>
          Aujourd&apos;hui
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            setCursorKey(
              view === "mois"
                ? addMonthsToKey(cursorKey, 1)
                : addDaysToKey(cursorKey, view === "jour" ? 1 : 7),
            )
          }
        >
          Suivant
        </Button>
        <span className="px-1 text-sm font-medium text-muted-foreground">{periodLabel}</span>
        <Select value={modalite} onValueChange={setModalite}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="toutes">Toutes modalités</SelectItem>
            {MODALITES.map((m) => (
              <SelectItem key={m} value={m}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={resourceId} onValueChange={setResourceId}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Salle / machine" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="toutes">Toutes salles</SelectItem>
            {resources.map((r) => (
              <SelectItem key={r.id} value={r.id}>
                {r.libelle}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="tous">Tous statuts</SelectItem>
            <SelectItem value="SCHEDULED">Planifié</SelectItem>
            <SelectItem value="CONFIRMED">Confirmé</SelectItem>
            <SelectItem value="RESCHEDULED">Reporté</SelectItem>
            <SelectItem value="CHECKED_IN">Enregistré</SelectItem>
            <SelectItem value="CANCELLED">Annulé</SelectItem>
            <SelectItem value="NO_SHOW">No-show</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {loading ? (
        <Skeleton className="h-80" />
      ) : error ? (
        <EmptyState icon={CalendarDays} title="Impossible de charger les données." />
      ) : view === "semaine" ? (
        <div className="grid gap-2 md:grid-cols-7">
          {weekDays.map((day) => (
            <div key={day} className="app-surface min-h-40 p-2">
              <button
                type="button"
                className="mb-2 text-xs font-semibold text-muted-foreground hover:text-primary"
                onClick={() => openDay(day)}
              >
                {day}
              </button>
              <div className="space-y-2">
                {(byDay.get(day) ?? []).length === 0 ? (
                  <p className="text-[11px] text-muted-foreground">Aucun RDV</p>
                ) : (
                  (byDay.get(day) ?? []).map((row) => (
                    <div key={row.id} className="rounded-md border border-border bg-background p-2 text-xs">
                      <p className="font-semibold">
                        <span className="tabular-nums text-primary">
                          {appointmentTime(row.startsAt)}–{appointmentEndTime(row)}
                        </span>{" "}
                        · {row.patient}
                      </p>
                      <p className="text-muted-foreground">
                        {row.examenLibelle || row.modalite} · {row.salle || "—"}
                      </p>
                      {rowActions(row)}
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      ) : view === "jour" ? (
        <div className="app-surface overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="text-sm font-semibold">{cursorKey}</p>
            <p className="text-xs text-muted-foreground">
              {dayRows.length} rendez-vous · planning horaire 07:00–20:00
            </p>
          </div>
          {dayRows.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title="Aucun rendez-vous ce jour"
              description={cursorKey}
              action={
                <Button size="sm" asChild>
                  <Link to="/accueil" search={{ mode: "rdv" }}>
                    Prendre rendez-vous
                  </Link>
                </Button>
              }
            />
          ) : (
            <div className="divide-y divide-border">
              {dayTimeline.map((slot) => (
                <div key={slot.label} className="grid grid-cols-[4.5rem_1fr] gap-3 px-4 py-2.5">
                  <div className="pt-1 text-right">
                    <span className="font-mono text-xs font-semibold tabular-nums text-muted-foreground">
                      {slot.label}
                    </span>
                  </div>
                  <div className="min-w-0 space-y-2">
                    {slot.items.length === 0 ? (
                      <div className="h-7 rounded border border-dashed border-border/70 bg-muted/10" />
                    ) : (
                      slot.items.map((row) => (
                        <div
                          key={row.id}
                          className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-background px-3 py-2"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-semibold">
                              <span className="tabular-nums text-primary">
                                {appointmentTime(row.startsAt)}–{appointmentEndTime(row)}
                              </span>{" "}
                              · {row.patient}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {row.examenLibelle || row.modalite} · {row.salle || "Salle non précisée"} ·{" "}
                              {row.dureeMinutes} min
                            </p>
                          </div>
                          {rowActions(row)}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))}
              {/* RDV hors plage 7–20h */}
              {dayRows.some((r) => {
                const h = Number(appointmentTime(r.startsAt).slice(0, 2));
                return Number.isFinite(h) && (h < 7 || h > 20);
              }) ? (
                <div className="space-y-2 px-4 py-3">
                  <p className="text-xs font-semibold text-muted-foreground">Hors plage 07–20h</p>
                  {dayRows
                    .filter((r) => {
                      const h = Number(appointmentTime(r.startsAt).slice(0, 2));
                      return Number.isFinite(h) && (h < 7 || h > 20);
                    })
                    .map((row) => (
                      <div
                        key={row.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-semibold">
                            <span className="tabular-nums text-primary">
                              {appointmentTime(row.startsAt)}–{appointmentEndTime(row)}
                            </span>{" "}
                            · {row.patient}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {row.examenLibelle || row.modalite} · {row.salle || "—"}
                          </p>
                        </div>
                        {rowActions(row)}
                      </div>
                    ))}
                </div>
              ) : null}
            </div>
          )}
        </div>
      ) : view === "mois" ? (
        <div className="app-surface overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="text-sm font-semibold">{periodLabel}</p>
            <p className="text-xs text-muted-foreground">
              {rows.length} rendez-vous · heure + patient par jour · clic → vue horaire
            </p>
          </div>
          <div className="grid grid-cols-7 border-b border-border">
            {WEEKDAY_HEADERS.map((label) => (
              <div
                key={label}
                className="px-2 py-2 text-center text-xs font-semibold text-muted-foreground"
              >
                {label}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {monthCells.map((day, idx) => {
              if (!day) {
                return (
                  <div
                    key={`pad-${idx}`}
                    className="min-h-28 border-b border-r border-border bg-muted/20 p-1.5"
                  />
                );
              }
              const list = monthByDay.get(day) ?? [];
              const visible = list.slice(0, 3);
              const extra = list.length - visible.length;
              const isToday = day === toLocalDateKey();
              return (
                <div
                  key={day}
                  role="button"
                  tabIndex={0}
                  className={`min-h-28 cursor-pointer border-b border-r border-border p-1.5 text-left transition-colors hover:bg-muted/30 ${
                    isToday ? "bg-primary/5" : ""
                  }`}
                  onClick={() => openDay(day)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      openDay(day);
                    }
                  }}
                >
                  <p
                    className={`mb-1 text-xs font-semibold tabular-nums ${
                      isToday ? "text-primary" : "text-muted-foreground"
                    }`}
                  >
                    {day.slice(8)}
                  </p>
                  <div className="space-y-1">
                    {visible.map((row) => (
                      <button
                        key={row.id}
                        type="button"
                        className="block w-full rounded border border-border bg-background px-1 py-0.5 text-left text-[10px] leading-tight hover:border-primary/40"
                        onClick={(e) => {
                          e.stopPropagation();
                          openDay(day);
                        }}
                        title={`${appointmentTime(row.startsAt)}–${appointmentEndTime(row)} · ${row.patient} · ${row.examenLibelle || row.modalite} · ${row.salle || "—"}`}
                      >
                        <span className="inline-block rounded bg-primary/10 px-1 font-semibold tabular-nums text-primary">
                          {appointmentTime(row.startsAt)}
                        </span>{" "}
                        <span className="truncate font-medium">{shortPatient(row.patient)}</span>
                        <span className="mt-0.5 block truncate text-muted-foreground">
                          →{appointmentEndTime(row)} · {row.modalite || row.examenLibelle || "—"}
                          {row.salle ? ` · ${row.salle}` : ""}
                        </span>
                      </button>
                    ))}
                    {extra > 0 ? (
                      <p className="px-0.5 text-[10px] text-muted-foreground">+{extra} autre(s)</p>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="Aucun rendez-vous sur cette période"
          description={periodLabel}
          action={
            <Button size="sm" asChild>
              <Link to="/accueil" search={{ mode: "rdv" }}>
                Prendre rendez-vous
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="app-surface divide-y divide-border">
          {rows.map((row) => (
            <div
              key={row.id}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold">{row.patient}</p>
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium tabular-nums text-foreground">
                    {appointmentTime(row.startsAt)}–{appointmentEndTime(row)}
                  </span>{" "}
                  · {row.startsAt?.slice(0, 10)} · {row.examenLibelle || row.modalite} ·{" "}
                  {row.salle || "Salle non précisée"} · {row.dureeMinutes} min
                </p>
              </div>
              {rowActions(row)}
            </div>
          ))}
        </div>
      )}

      {rescheduleId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md space-y-4 rounded-xl border border-border bg-background p-5 shadow-lg">
            <h3 className="text-base font-semibold">Reporter le rendez-vous</h3>
            <Input
              type="datetime-local"
              value={rescheduleAt}
              onChange={(e) => setRescheduleAt(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setRescheduleId(null);
                  setRescheduleAt("");
                }}
              >
                Annuler
              </Button>
              <Button
                disabled={!rescheduleAt || busyId === rescheduleId}
                onClick={async () => {
                  const id = rescheduleId;
                  setBusyId(id);
                  try {
                    const updated = await rescheduleAppointment(id, { dateHeure: rescheduleAt });
                    setRows((list) => list.map((r) => (r.id === id ? updated : r)));
                    toast.success("Rendez-vous reporté.");
                    setRescheduleId(null);
                    setRescheduleAt("");
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "Report impossible");
                  } finally {
                    setBusyId(null);
                  }
                }}
              >
                Confirmer le report
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
