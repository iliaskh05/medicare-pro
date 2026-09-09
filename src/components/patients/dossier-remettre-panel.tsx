import { useEffect, useState } from "react";
import { CheckCircle2, FolderOpen, PackageCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState, Pill } from "@/components/ui-kit";
import {
  fetchWorklist,
  updateWorklistStatut,
  type WorklistItem,
} from "@/lib/api/worklist";
import { formatCentreDateTime } from "@/lib/date";

function isRemis(statut?: string | null): boolean {
  const s = (statut ?? "").toLowerCase();
  return s === "remis" || s === "envoye";
}

/** UI statuses only: À remettre | Remis */
export function dossierReturnLabel(statut?: string | null): "À remettre" | "Remis" {
  return isRemis(statut) ? "Remis" : "À remettre";
}

export function PatientDossierRemettrePanel({
  patientId,
  onChanged,
}: {
  patientId: string;
  onChanged?: () => void;
}) {
  const [items, setItems] = useState<WorklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    fetchWorklist({ patientId, size: 100 })
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [patientId]);

  const pending = items.filter((i) => !isRemis(i.dossierStatut));
  const returned = items.filter((i) => isRemis(i.dossierStatut));
  const confirmItem = items.find((i) => i.id === confirmId) ?? null;

  const confirmRemise = async () => {
    if (!confirmItem) return;
    setSaving(true);
    try {
      await updateWorklistStatut(confirmItem.id, { dossierStatut: "remis" });
      toast.success("Dossier marqué comme remis.");
      setConfirmId(null);
      load();
      onChanged?.();
    } catch (e) {
      toast.error(
        e instanceof Error
          ? e.message
          : "Impossible d'enregistrer la remise. Réessayez ou contactez un administrateur.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground">Chargement des dossiers…</p>;
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={FolderOpen}
        title="Aucun examen lié"
        description="Les dossiers à remettre apparaissent dès qu'un examen est créé pour ce patient."
        compact
      />
    );
  }

  return (
    <div className="space-y-4">
      {pending.length === 0 && returned.length > 0 ? (
        <EmptyState
          icon={PackageCheck}
          title="Tous les dossiers sont remis"
          description="Chaque examen de ce patient a un statut « Remis »."
          compact
        />
      ) : null}

      {pending.map((item) => (
        <div
          key={item.id}
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3"
        >
          <div className="min-w-0">
            <p className="font-semibold">Dossier à remettre</p>
            <p className="text-sm text-muted-foreground">
              {[item.description, item.numSejour, item.modalite].filter(Boolean).join(" · ")}
            </p>
            <div className="mt-2">
              <Pill tone="warning">À remettre</Pill>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Dossier prêt à être remis au patient.
            </p>
          </div>
          <Button size="sm" onClick={() => setConfirmId(item.id)}>
            <CheckCircle2 className="mr-1.5 size-4" /> Dossier remis
          </Button>
        </div>
      ))}

      {returned.map((item) => (
        <div
          key={item.id}
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-success/30 bg-success/5 px-4 py-3"
        >
          <div className="min-w-0">
            <p className="font-semibold">Dossier à remettre</p>
            <p className="text-sm text-muted-foreground">
              {[item.description, item.numSejour, item.modalite].filter(Boolean).join(" · ")}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Pill tone="success">✓ Remis</Pill>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {item.dossierRemisAt
                ? formatCentreDateTime(item.dossierRemisAt)
                : "Date non renseignée"}
              {item.dossierRemisPar ? ` — Par : ${item.dossierRemisPar}` : ""}
            </p>
          </div>
        </div>
      ))}

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
                Examen : <strong>{confirmItem.description || confirmItem.numSejour}</strong>.
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
