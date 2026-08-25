import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Plus, Stethoscope } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState, PageHeader, Pill } from "@/components/ui-kit";
import { Skeleton } from "@/components/ui/skeleton";
import { useRole } from "@/hooks/use-role";
import {
  createCatalogueActe,
  fetchCatalogue,
  updateCatalogueActe,
  type CatalogueActe,
} from "@/lib/api/catalogue";
import { MODALITES } from "@/lib/api/worklist";
import { formatMAD } from "@/types/domain";

export const Route = createFileRoute("/catalogue")({
  head: () => ({ meta: [{ title: "Examens & tarifs — RadioCRM" }] }),
  component: CataloguePage,
});

const emptyForm = {
  nom: "",
  code: "",
  modalite: "IRM",
  categorie: "",
  dureeMinutes: "30",
  prix: "",
  description: "",
  preparation: "",
};

function CataloguePage() {
  const { profile } = useRole();
  const canManage = profile.id === "directeur";
  const [rows, setRows] = useState<CatalogueActe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CatalogueActe | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [showInactive, setShowInactive] = useState(false);

  const load = () => {
    setLoading(true);
    setError(null);
    fetchCatalogue(false)
      .then(setRows)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Impossible de charger le catalogue"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const visible = rows.filter((r) => showInactive || r.actif);

  const submit = async () => {
    if (!form.nom.trim()) {
      toast.error("Le nom de l'acte est obligatoire.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        nom: form.nom.trim(),
        code: form.code.trim() || null,
        modalite: form.modalite,
        categorie: form.categorie.trim() || null,
        dureeMinutes: form.dureeMinutes ? Number(form.dureeMinutes) : null,
        prix: Number(form.prix || 0),
        description: form.description || null,
        preparation: form.preparation || null,
      };
      if (editing) {
        const updated = await updateCatalogueActe(editing.id, payload);
        setRows((list) => list.map((r) => (r.id === updated.id ? updated : r)));
      } else {
        const created = await createCatalogueActe(payload);
        setRows((list) => [...list, created].sort((a, b) => a.nom.localeCompare(b.nom)));
      }
      setOpen(false);
      setEditing(null);
      toast.success("Catalogue mis à jour.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Catalogue"
        title="Examens & tarifs"
        subtitle="Source unique des prix. Un examen sélectionné à l'accueil reprend automatiquement ce tarif."
        actions={
          canManage ? (
            <Button
              onClick={() => {
                setEditing(null);
                setForm(emptyForm);
                setOpen(true);
              }}
            >
              <Plus className="mr-2 size-4" /> Ajouter un examen
            </Button>
          ) : null
        }
      />
      <label className="flex items-center gap-2 text-sm text-muted-foreground">
        <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
        Afficher les actes inactifs
      </label>
      {loading ? (
        <Skeleton className="h-64" />
      ) : error ? (
        <EmptyState icon={Stethoscope} title="Impossible de charger les données." action={<Button onClick={load}>Réessayer</Button>} />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={Stethoscope}
          title="Aucun acte au catalogue"
          description="Le catalogue est vide. Aucun tarif n'est inventé. Un administrateur doit ajouter les examens réellement pratiqués par le centre."
        />
      ) : (
        <div className="app-surface overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Acte</TableHead>
                <TableHead>Modalité</TableHead>
                <TableHead>Durée</TableHead>
                <TableHead>Prix</TableHead>
                <TableHead>Statut</TableHead>
                {canManage ? <TableHead /> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <p className="font-medium">{row.nom}</p>
                    <p className="text-xs text-muted-foreground">{row.code || row.categorie || "—"}</p>
                  </TableCell>
                  <TableCell>{row.modalite}</TableCell>
                  <TableCell>{row.dureeMinutes ? `${row.dureeMinutes} min` : "—"}</TableCell>
                  <TableCell className="tabular-nums">{formatMAD(row.prix)}</TableCell>
                  <TableCell>
                    <Pill tone={row.actif ? "success" : "neutral"}>{row.actif ? "Actif" : "Inactif"}</Pill>
                  </TableCell>
                  {canManage ? (
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditing(row);
                          setForm({
                            nom: row.nom,
                            code: row.code ?? "",
                            modalite: row.modalite,
                            categorie: row.categorie ?? "",
                            dureeMinutes: row.dureeMinutes ? String(row.dureeMinutes) : "",
                            prix: String(row.prix),
                            description: row.description ?? "",
                            preparation: row.preparation ?? "",
                          });
                          setOpen(true);
                        }}
                      >
                        Modifier
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={async () => {
                          try {
                            const updated = await updateCatalogueActe(row.id, {
                              ...row,
                              actif: !row.actif,
                            });
                            setRows((list) => list.map((r) => (r.id === updated.id ? updated : r)));
                          } catch (e) {
                            toast.error(e instanceof Error ? e.message : "Mise à jour impossible");
                          }
                        }}
                      >
                        {row.actif ? "Désactiver" : "Réactiver"}
                      </Button>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Modifier l'acte" : "Nouvel examen"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label>Nom</Label>
              <Input value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} />
            </div>
            <div>
              <Label>Code</Label>
              <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
            </div>
            <div>
              <Label>Modalité</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.modalite}
                onChange={(e) => setForm({ ...form, modalite: e.target.value })}
              >
                {MODALITES.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Durée (min)</Label>
              <Input
                type="number"
                value={form.dureeMinutes}
                onChange={(e) => setForm({ ...form, dureeMinutes: e.target.value })}
              />
            </div>
            <div>
              <Label>Prix (DH)</Label>
              <Input type="number" min={0} step="0.01" value={form.prix} onChange={(e) => setForm({ ...form, prix: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <Label>Préparation</Label>
              <Input value={form.preparation} onChange={(e) => setForm({ ...form, preparation: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={submit} disabled={saving}>
              {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
