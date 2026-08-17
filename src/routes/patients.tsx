import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Search, UserPlus, FileText, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader, Pill } from "@/components/ui-kit";
import { DataState, LastUpdated } from "@/components/data-state";
import { useApiResource } from "@/hooks/use-api-resource";
import { useRole } from "@/hooks/use-role";
import { toastMessage } from "@/lib/api/errors";
import { createPatient, fetchPatients, type PatientRow } from "@/lib/api/patients";

export const Route = createFileRoute("/patients")({
  head: () => ({
    meta: [
      { title: "Gestion des patients — RadioCRM" },
      {
        name: "description",
        content:
          "Recherchez et filtrez les dossiers patients par mutuelle (AMO, CNSS, CNOPS, Privée) et créez de nouveaux dossiers.",
      },
      { property: "og:title", content: "Gestion des patients — RadioCRM" },
      {
        property: "og:description",
        content:
          "Base patients du centre de radiologie avec CIN, mutuelle et historique d'examens.",
      },
    ],
  }),
  component: PatientsPage,
});

const mutuelleTones: Record<string, "primary" | "success" | "warning" | "neutral"> = {
  AMO: "primary",
  CNSS: "success",
  CNOPS: "warning",
  Privée: "neutral",
};

const MUTUELLES = ["AMO", "CNSS", "CNOPS", "Privée"];
const PAGE_SIZE = 8;

const emptyDraft = {
  nomComplet: "",
  cin: "",
  telephone: "",
  naissance: "",
  mutuelle: "AMO",
};

function ageFromBirthDate(value: string): number {
  const birth = new Date(value);
  if (Number.isNaN(birth.getTime())) return 0;
  const diff = Date.now() - birth.getTime();
  return Math.max(0, Math.floor(diff / (365.25 * 24 * 3600 * 1000)));
}

function PatientsPage() {
  const { canCreate } = useRole();
  const patientsResource = useApiResource<PatientRow[]>((signal) => fetchPatients(signal));
  const patients = patientsResource.data ?? [];

  const [query, setQuery] = useState("");
  const [mutuelle, setMutuelle] = useState<string>("toutes");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(emptyDraft);
  const [isSaving, setIsSaving] = useState(false);

  const canSubmit = draft.nomComplet.trim() !== "" && draft.cin.trim() !== "";

  const submitDraft = useCallback(async () => {
    setIsSaving(true);
    try {
      const created = await createPatient({
        nomComplet: draft.nomComplet.trim(),
        cin: draft.cin.trim().toUpperCase(),
        age: ageFromBirthDate(draft.naissance),
        telephone: draft.telephone.trim(),
        mutuelle: draft.mutuelle,
      });
      patientsResource.setData((prev) => [created, ...(prev ?? [])]);
      setDraft(emptyDraft);
      setOpen(false);
      setPage(1);
      toast.success(`Dossier ${created.id} créé pour ${created.nomComplet}`);
    } catch (e) {
      toast.error(toastMessage(e));
    } finally {
      setIsSaving(false);
    }
  }, [draft, patientsResource]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return patients.filter((p) => {
      const matchQ =
        !q ||
        p.nomComplet.toLowerCase().includes(q) ||
        p.cin.toLowerCase().includes(q) ||
        p.telephone.includes(q);
      const matchM = mutuelle === "toutes" || p.mutuelle === mutuelle;
      return matchQ && matchM;
    });
  }, [patients, query, mutuelle]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pageCount);
  const rows = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const viewStatus =
    patientsResource.status === "ready" && filtered.length === 0 ? "empty" : patientsResource.status;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestion des patients"
        subtitle={
          patientsResource.isLoading
            ? "Chargement des dossiers…"
            : `${patients.length} dossier(s) — Centre d'Imagerie Médicale`
        }
        actions={
          canCreate("patients") ? (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="mr-2 size-4" /> Nouveau patient
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Nouveau dossier patient</DialogTitle>
                <DialogDescription>
                  Renseignez les informations d&apos;identité et de couverture médicale.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="nom">Nom complet</Label>
                  <Input
                    id="nom"
                    value={draft.nomComplet}
                    onChange={(e) => setDraft((d) => ({ ...d, nomComplet: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cin">CIN</Label>
                  <Input
                    id="cin"
                    value={draft.cin}
                    onChange={(e) => setDraft((d) => ({ ...d, cin: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tel">Téléphone</Label>
                  <Input
                    id="tel"
                    value={draft.telephone}
                    onChange={(e) => setDraft((d) => ({ ...d, telephone: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="naissance">Date de naissance</Label>
                  <Input
                    id="naissance"
                    type="date"
                    value={draft.naissance}
                    onChange={(e) => setDraft((d) => ({ ...d, naissance: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Mutuelle</Label>
                  <Select
                    value={draft.mutuelle}
                    onValueChange={(v) => setDraft((d) => ({ ...d, mutuelle: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MUTUELLES.map((m) => (
                        <SelectItem key={m} value={m}>
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Annuler
                </Button>
                <Button disabled={!canSubmit || isSaving} onClick={submitDraft}>
                  {isSaving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                  Enregistrer le dossier
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          ) : null
        }
      />

      <Card>
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              aria-label="Rechercher un patient par nom, CIN ou téléphone"
              placeholder="Rechercher par nom, CIN ou téléphone…"
              className="pl-9"
            />
          </div>
          <Select
            value={mutuelle}
            onValueChange={(v) => {
              setMutuelle(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="sm:w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="toutes">Toutes les mutuelles</SelectItem>
              {MUTUELLES.map((m) => (
                <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card data-tour="patients-table">
        <CardContent className="px-0 py-0" aria-busy={patientsResource.isLoading}>
          <DataState
            status={viewStatus}
            error={patientsResource.error}
            onRetry={patientsResource.reload}
            skeletonRows={6}
            emptyTitle="Aucun dossier patient"
            emptyDescription={
              patients.length === 0
                ? "Aucun dossier n'a encore été enregistré côté serveur."
                : "Aucun dossier ne correspond à cette recherche ou à ce filtre mutuelle."
            }
          >
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">Nom complet</TableHead>
                    <TableHead>CIN</TableHead>
                    <TableHead>Âge</TableHead>
                    <TableHead className="hidden md:table-cell">Téléphone</TableHead>
                    <TableHead>Mutuelle</TableHead>
                    <TableHead className="pr-6 text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="pl-6">
                        <p className="font-medium">{p.nomComplet}</p>
                        <p className="text-xs text-muted-foreground">{p.id}</p>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{p.cin}</TableCell>
                      <TableCell className="text-sm">{p.age} ans</TableCell>
                      <TableCell className="hidden text-sm md:table-cell">{p.telephone}</TableCell>
                      <TableCell>
                        <Pill tone={mutuelleTones[p.mutuelle] ?? "neutral"}>{p.mutuelle}</Pill>
                      </TableCell>
                      <TableCell className="pr-6 text-right">
                        <Button variant="outline" size="sm" asChild>
                          <Link to="/patient/$patientId" params={{ patientId: p.id }}>
                            <FileText className="mr-1.5 size-4" /> Voir dossier
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex flex-col items-center justify-between gap-3 border-t border-border px-6 py-4 sm:flex-row">
              <div className="space-y-1 text-center sm:text-left">
                <p className="text-sm text-muted-foreground">
                  {filtered.length} patient(s) · page {current} / {pageCount}
                </p>
                <LastUpdated at={patientsResource.lastUpdated} />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={current === 1}
                  onClick={() => setPage(current - 1)}
                >
                  <ChevronLeft className="mr-1 size-4" aria-hidden /> Précédent
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={current === pageCount}
                  onClick={() => setPage(current + 1)}
                >
                  Suivant <ChevronRight className="ml-1 size-4" aria-hidden />
                </Button>
              </div>
            </div>
          </DataState>
        </CardContent>
      </Card>
    </div>
  );
}
