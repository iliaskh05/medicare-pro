import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { RefreshCw, User, Wallet } from "lucide-react";
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
import { fetchImpayes, type WorklistItem } from "@/lib/api/worklist";
import { patientDossierLink } from "@/lib/patient-nav";
import { formatMAD } from "@/types/domain";

export const Route = createFileRoute("/impayes")({
  head: () => ({
    meta: [
      { title: "Restes à payer — RadioCRM" },
      {
        name: "description",
        content: "Examens avec solde patient ouvert — accès au dossier patient.",
      },
    ],
  }),
  component: ImpayesPage,
});

function ImpayesPage() {
  const [rows, setRows] = useState<WorklistItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    const controller = new AbortController();
    fetchImpayes(controller.signal)
      .then(setRows)
      .catch((e: unknown) => {
        setRows([]);
        toast.error(e instanceof Error ? e.message : "Impossible de charger les impayés");
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
        eyebrow="Facturation"
        title="Restes à payer"
        subtitle="Examens non soldés — le clic ouvre le dossier patient (/patient/$patientId)."
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
          icon={Wallet}
          title="Aucun reste à payer"
          description="Les examens partiellement payés ou impayés s'affichent ici."
        />
      ) : (
        <div className="panel overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Patient</TableHead>
                <TableHead>Examen</TableHead>
                <TableHead>Paiement</TableHead>
                <TableHead className="text-right">Reste</TableHead>
                <TableHead className="text-right">Dossier</TableHead>
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
                      <Pill tone={r.paiement === "paye" ? "success" : "warning"}>{r.paiement}</Pill>
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-medium">
                      {formatMAD(r.reste ?? 0)}
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
