import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Clock, RefreshCw, User } from "lucide-react";
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
import { EmptyState, PageHeader, Pill } from "@/components/ui-kit";
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

function FileAttentePage() {
  const [rows, setRows] = useState<WaitingRoomItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    const controller = new AbortController();
    fetchWaitingRoom({}, controller.signal)
      .then(setRows)
      .catch((e: unknown) => {
        setRows([]);
        toast.error(e instanceof Error ? e.message : "Impossible de charger la file d'attente");
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  };

  useEffect(() => {
    return load();
  }, []);

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
        subtitle="Patients présents — ouvrir le dossier patient (identifiant patientId)."
        actions={
          <Button variant="outline" size="sm" onClick={() => load()} disabled={loading}>
            <RefreshCw className={`mr-2 size-4 ${loading ? "animate-spin" : ""}`} />
            Actualiser
          </Button>
        }
      />

      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Clock}
          title="Aucun patient en file"
          description="Les passages enregistrés (walk-in ou check-in) apparaissent ici."
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
