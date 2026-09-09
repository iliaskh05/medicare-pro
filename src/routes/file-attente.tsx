import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Clock, RefreshCw, User, UserRound } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState, PageHeader, Pill, ServiceNotice } from "@/components/ui-kit";
import { ApiError } from "@/lib/api/config";
import { advanceWaitingRoom, fetchWaitingRoom, type WaitingRoomItem } from "@/lib/api/waiting-room";
import { patientDossierLink } from "@/lib/patient-nav";
import { formatCentreDateTime } from "@/lib/date";

export const Route = createFileRoute("/file-attente")({
  head: () => ({
    meta: [
      { title: "File d'attente — RadioCRM" },
      {
        name: "description",
        content: "Patients présents au centre : progression de file et accès au dossier patient.",
      },
    ],
  }),
  component: FileAttentePage,
});

function isAbort(e: unknown): boolean {
  return e instanceof ApiError && e.code === "aborted";
}

function FileAttentePage() {
  const [rows, setRows] = useState<WaitingRoomItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback((silent = false) => {
    if (!silent) {
      setLoading(true);
      setError(null);
    }
    const controller = new AbortController();
    fetchWaitingRoom({}, controller.signal)
      .then((data) => {
        setRows(data);
        setError(null);
      })
      .catch((e: unknown) => {
        if (isAbort(e)) return;
        if (!silent) {
          setRows([]);
          setError(e instanceof Error ? e.message : "Impossible de charger la file d'attente");
          toast.error(e instanceof Error ? e.message : "Impossible de charger la file d'attente");
        }
        // Silent refresh: keep previous rows if the poll fails
      })
      .finally(() => {
        if (!silent) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    return load(false);
  }, [load]);

  useEffect(() => {
    const id = window.setInterval(() => load(true), 20_000);
    return () => window.clearInterval(id);
  }, [load]);

  const advance = async (id: string) => {
    setBusyId(id);
    try {
      const updated = await advanceWaitingRoom(id);
      setRows((list) => list.map((r) => (r.id === id ? updated : r)));
      toast.success("Statut avancé.");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Avancement impossible");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Opérations"
        title="File d'attente"
        subtitle="Patients présents au centre (check-in RDV ou passage sans rendez-vous)."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to="/accueil" search={{ mode: "walkin" }}>
                <UserRound className="mr-1.5 size-4" /> Admission
              </Link>
            </Button>
            <Button variant="outline" size="sm" onClick={() => load(false)} disabled={loading}>
              <RefreshCw className={`mr-2 size-4 ${loading ? "animate-spin" : ""}`} />
              Actualiser
            </Button>
          </div>
        }
      />

      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : error ? (
        <div className="space-y-4">
          <ServiceNotice message={error} onRetry={() => load(false)} />
          <EmptyState
            icon={AlertTriangle}
            title="File d'attente indisponible"
            description="Vérifiez que le serveur est démarré, puis réessayez."
            action={
              <Button size="sm" onClick={() => load(false)}>
                Réessayer
              </Button>
            }
          />
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Clock}
          title="Aucun patient en file"
          description="Enregistrez un passage sans RDV ou faites le check-in d'un rendez-vous du jour pour alimenter la file."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button size="sm" asChild>
                <Link to="/accueil" search={{ mode: "walkin" }}>
                  Passage sans RDV
                </Link>
              </Button>
              <Button size="sm" variant="outline" asChild>
                <Link to="/agenda">Agenda / check-in</Link>
              </Button>
            </div>
          }
        />
      ) : (
        <div className="panel overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Patient</TableHead>
                <TableHead>Examen</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Arrivée</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => {
                const dossier = patientDossierLink(r.patientId);
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">
                      {dossier ? (
                        <Link
                          to={dossier.to}
                          params={dossier.params}
                          className="text-primary hover:underline"
                        >
                          {r.patient}
                        </Link>
                      ) : (
                        r.patient
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{r.examen}</div>
                      {r.modalite ? (
                        <div className="text-xs text-muted-foreground">{r.modalite}</div>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <Pill tone="neutral">{r.statut}</Pill>
                      {r.attenteMinutes != null ? (
                        <span className="ml-2 text-xs text-muted-foreground">
                          {r.attenteMinutes} min
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {r.heureArrivee
                        ? formatCentreDateTime(r.heureArrivee)
                        : r.heurePrevue
                          ? formatCentreDateTime(r.heurePrevue)
                          : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {dossier ? (
                          <Button variant="outline" size="sm" asChild>
                            <Link to={dossier.to} params={dossier.params}>
                              <User className="mr-1.5 size-3.5" />
                              Dossier
                            </Link>
                          </Button>
                        ) : null}
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={busyId === r.id}
                          onClick={() => void advance(r.id)}
                        >
                          Avancer
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
