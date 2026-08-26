import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { FolderOpen, RefreshCw, User } from "lucide-react";
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
import { fetchDossiers, type WorklistItem } from "@/lib/api/worklist";
import { patientDossierLink } from "@/lib/patient-nav";

export const Route = createFileRoute("/dossiers")({
  head: () => ({
    meta: [
      { title: "Dossiers à remettre — RadioCRM" },
      {
        name: "description",
        content: "Examens prêts à remettre — accès au dossier patient.",
      },
    ],
  }),
  component: DossiersPage,
});

function DossiersPage() {
  const [rows, setRows] = useState<WorklistItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    const controller = new AbortController();
    fetchDossiers(undefined, controller.signal)
      .then(setRows)
      .catch((e: unknown) => {
        setRows([]);
        toast.error(e instanceof Error ? e.message : "Impossible de charger les dossiers");
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  };

  useEffect(() => {
    return load();
  }, []);

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Accueil / secrétariat"
        title="Dossiers à remettre"
        subtitle="Liste des examens selon le statut dossier — le clic ouvre /patient/$patientId."
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
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title="Aucun dossier à remettre"
          description="Les examens prêts ou non remis apparaîtront ici."
        />
      ) : (
        <div className="panel overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Patient</TableHead>
                <TableHead>Examen</TableHead>
                <TableHead>Statut dossier</TableHead>
                <TableHead className="text-right">Dossier patient</TableHead>
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
                      <div className="text-sm">{r.description}</div>
                      <div className="text-xs text-muted-foreground">
                        {r.numSejour} · {r.modalite}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Pill tone="neutral">{r.dossierStatut ?? "—"}</Pill>
                    </TableCell>
                    <TableCell className="text-right">
                      {dossier ? (
                        <Button variant="outline" size="sm" asChild>
                          <Link to={dossier.to} params={dossier.params}>
                            <User className="mr-1.5 size-3.5" />
                            Ouvrir
                          </Link>
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">Patient inconnu</span>
                      )}
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
