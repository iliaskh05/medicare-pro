import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { CalendarDays } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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
  fetchAppointments,
  fetchResources,
  type AppointmentDto,
  type ResourceDto,
} from "@/lib/api/appointments";
import { MODALITES } from "@/lib/api/worklist";
import { Skeleton } from "@/components/ui/skeleton";
import { useDisplayPreference } from "@/hooks/use-display-preference";
import {
  addDaysToKey,
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
  const { mode, setMode, isCalendarView, isListView } = useDisplayPreference("agenda", "calendar");
  const [view, setView] = useState<View>(() =>
    mode === "list" ? "liste" : mode === "calendar" ? "semaine" : "semaine",
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
            variant="ghost"
            disabled={busyId === row.id}
            onClick={async () => {
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
        subtitle="Rendez-vous réels. Créneaux issus des ressources / salles du centre."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button size="sm" asChild>
              <Link to="/accueil" search={{ mode: "rdv" }}>
                Nouveau RDV
              </Link>
            </Button>
            {(["jour", "semaine", "mois", "liste"] as View[]).map((v) => (
              <Button
                key={v}
                size="sm"
                variant={view === v ? "default" : "outline"}
                onClick={() => changeView(v)}
              >
                {v.charAt(0).toUpperCase() + v.slice(1)}
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
            setCursorKey(addDaysToKey(cursorKey, view === "mois" ? -30 : view === "jour" ? -1 : -7))
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
            setCursorKey(addDaysToKey(cursorKey, view === "mois" ? 30 : view === "jour" ? 1 : 7))
          }
        >
          Suivant
        </Button>
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
      ) : rows.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="Aucun rendez-vous sur cette période"
          description={`${range.from} → ${range.to}`}
          action={
            <Button size="sm" asChild>
              <Link to="/accueil" search={{ mode: "rdv" }}>
                Prendre rendez-vous
              </Link>
            </Button>
          }
        />
      ) : view === "semaine" && isCalendarView ? (
        <div className="grid gap-2 md:grid-cols-7">
          {weekDays.map((day) => (
            <div key={day} className="app-surface min-h-40 p-2">
              <p className="mb-2 text-xs font-semibold text-muted-foreground">{day}</p>
              <div className="space-y-2">
                {(byDay.get(day) ?? []).map((row) => (
                  <div key={row.id} className="rounded-md border border-border bg-background p-2 text-xs">
                    <p className="font-semibold">{row.startsAt?.slice(11, 16)} · {row.patient}</p>
                    <p className="text-muted-foreground">
                      {row.examenLibelle || row.modalite} · {row.salle || "—"}
                    </p>
                    {rowActions(row)}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : view === "jour" ? (
        <div className="app-surface divide-y divide-border">
          <div className="px-4 py-3 text-sm font-semibold text-muted-foreground">{cursorKey}</div>
          {dayRows.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title="Aucun rendez-vous ce jour"
              description={cursorKey}
            />
          ) : (
            dayRows.map((row) => (
              <div
                key={row.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold">
                    {row.startsAt?.slice(11, 16)} · {row.patient}
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
      ) : view === "mois" ? (
        <div className="app-surface overflow-hidden">
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
                        title={`${row.startsAt?.slice(11, 16)} · ${row.patient} · ${row.examenLibelle || row.modalite} · ${row.salle || "—"}`}
                      >
                        <span className="font-semibold tabular-nums">
                          {row.startsAt?.slice(11, 16)}
                        </span>{" "}
                        <span className="truncate">{shortPatient(row.patient)}</span>
                        <span className="mt-0.5 block truncate text-muted-foreground">
                          {row.modalite || row.examenLibelle || "—"}
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
                  {row.startsAt?.replace("T", " ").slice(0, 16)} ·{" "}
                  {row.examenLibelle || row.modalite} · {row.salle || "Salle non précisée"} ·{" "}
                  {row.dureeMinutes} min
                </p>
              </div>
              {rowActions(row)}
            </div>
          ))}
        </div>
      )}
      {isListView ? null : null}
    </div>
  );
}
