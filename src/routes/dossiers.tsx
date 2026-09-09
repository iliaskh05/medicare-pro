import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, FileSpreadsheet, FolderOpen, RefreshCw, User } from "lucide-react";
import { toast } from "sonner";

import {
  dossierReturnLabel,
} from "@/components/patients/dossier-remettre-panel";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  fetchDossiers,
  updateWorklistStatut,
  type WorklistItem,
} from "@/lib/api/worklist";
import { downloadExcelWorkbook, excelFilename } from "@/lib/excel-export";
import { formatCentreDateTime } from "@/lib/date";
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

function isRemis(statut?: string | null): boolean {
  const s = (statut ?? "").toLowerCase();
  return s === "remis" || s === "envoye";
}

function DossiersPage() {
  const [rows, setRows] = useState<WorklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

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

  const confirmItem = useMemo(
    () => rows.find((r) => r.id === confirmId) ?? null,
    [rows, confirmId],
  );

  const exportExcel = async () => {
    try {
      await downloadExcelWorkbook({
        filename: excelFilename("Dossiers_a_remettre"),
        sheets: [
          {
            name: "Dossiers à remettre",
            columns: [
              { header: "Patient", key: "patient", width: 28 },
              { header: "N° dossier / séjour", key: "num", width: 18 },
              { header: "Examen", key: "examen", width: 28, wrap: true },
              { header: "Statut", key: "statut", width: 14 },
              { header: "Date remise", key: "dateRemise", width: 20, format: "date" },
              { header: "Remis par", key: "remisPar", width: 22 },
            ],
            rows: rows.map((r) => ({
              patient: r.patient,
              num: r.numSejour ?? "",
              examen: r.description ?? "",
              statut: dossierReturnLabel(r.dossierStatut),
              dateRemise: r.dossierRemisAt ?? "",
              remisPar: r.dossierRemisPar ?? "",
            })),
          },
        ],
      });
      toast.success(`Export Excel — ${rows.length} dossier(s)`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Export impossible");
    }
  };

  const confirmRemise = async () => {
    if (!confirmItem) return;
    setSaving(true);
    try {
      await updateWorklistStatut(confirmItem.id, { dossierStatut: "remis" });
      toast.success("Dossier marqué comme remis.");
      setConfirmId(null);
      load();
    } catch (e) {
      toast.error(
        e instanceof Error
          ? e.message
          : "Impossible d'enregistrer la remise. Réessayez.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Accueil / secrétariat"
        title="Dossiers à remettre"
        subtitle="Statuts « À remettre » / « Remis » — confirmez avant d'enregistrer la remise."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => void exportExcel()} disabled={loading}>
              <FileSpreadsheet className="mr-2 size-4" /> Exporter Excel
            </Button>
            <Button variant="outline" size="sm" onClick={() => load()} disabled={loading}>
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
                <TableHead>Statut</TableHead>
                <TableHead>Remise</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => {
                const dossier = patientDossierLink(r.patientId);
                const remis = isRemis(r.dossierStatut);
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
                      <Pill tone={remis ? "success" : "warning"}>
                        {remis ? "✓ Remis" : "À remettre"}
                      </Pill>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {remis ? (
                        <>
                          {r.dossierRemisAt ? formatCentreDateTime(r.dossierRemisAt) : "—"}
                          {r.dossierRemisPar ? (
                            <div>Par : {r.dossierRemisPar}</div>
                          ) : null}
                        </>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        {!remis ? (
                          <Button size="sm" onClick={() => setConfirmId(r.id)}>
                            <CheckCircle2 className="mr-1.5 size-3.5" />
                            Dossier remis
                          </Button>
                        ) : null}
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
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={confirmId != null} onOpenChange={(o) => !o && setConfirmId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer la remise du dossier ?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Cette action enregistrera la date, l'heure et le membre du personnel ayant remis le
            dossier au patient.
            {confirmItem ? (
              <>
                {" "}
                Patient : <strong>{confirmItem.patient}</strong>.
              </>
            ) : null}
          </p>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setConfirmId(null)} disabled={saving}>
              Annuler
            </Button>
            <Button onClick={() => void confirmRemise()} disabled={saving}>
              {saving ? "Enregistrement…" : "Confirmer la remise"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
