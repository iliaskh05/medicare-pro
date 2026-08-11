import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Search,
  SearchX,
  UserPlus,
  FileText,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
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
import { PageHeader, Pill, EmptyState } from "@/components/ui-kit";
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
  const [patients, setPatients] = useState<PatientRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [query, setQuery] = useState("");
  const [mutuelle, setMutuelle] = useState<string>("toutes");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(emptyDraft);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);

    fetchPatients(controller.signal)
      .then((rows) => setPatients(rows))
      .catch((e: unknown) => {
        if (controller.signal.aborted) return;
        setPatients([]);
        setError(e instanceof Error ? e.message : "Service patients indisponible");
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, [reloadKey]);

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
      setPatients((prev) => [created, ...prev]);
      setDraft(emptyDraft);
      setOpen(false);
      setPage(1);
      toast.success(`Dossier ${created.id} créé pour ${created.nomComplet}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Création du dossier impossible");
    } finally {
      setIsSaving(false);
    }
  }, [draft]);

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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestion des patients"
        subtitle={
          isLoading
            ? "Chargement des dossiers…"
            : `${patients.length} dossier(s) — Centre d'Imagerie Médicale`
        }
        actions={
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

      {error ? (
        <ServiceNotice
          message="Dossiers patients en attente de connexion au serveur du centre."
          onRetry={() => setReloadKey((k) => k + 1)}
        />
      ) : null}


      <Card data-tour="patients-table">
        <CardContent className="px-0 py-0" aria-busy={isLoading}>
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
                {isLoading
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={`sk-${i}`}>
                        <TableCell colSpan={6} className="px-6">
                          <Skeleton className="h-8 w-full" />
                        </TableCell>
                      </TableRow>
                    ))
                  : rows.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="pl-6">
                          <p className="font-medium">{p.nomComplet}</p>
                          <p className="text-xs text-muted-foreground">{p.id}</p>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{p.cin}</TableCell>
                        <TableCell className="text-sm">{p.age} ans</TableCell>
                        <TableCell className="hidden text-sm md:table-cell">
                          {p.telephone}
                        </TableCell>
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
                {!isLoading && rows.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={6} className="p-0">
                      <EmptyState
                        icon={SearchX}
                        title="Aucune donnée"
                        description="Aucun dossier patient n'est disponible pour ces critères."
                      />
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-col items-center justify-between gap-3 border-t border-border px-6 py-4 sm:flex-row">
            <p className="text-sm text-muted-foreground">
              {filtered.length} patient(s) · page {current} / {pageCount}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={current === 1}
                onClick={() => setPage(current - 1)}
              >
                <ChevronLeft className="mr-1 size-4" /> Précédent
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={current === pageCount}
                onClick={() => setPage(current + 1)}
              >
                Suivant <ChevronRight className="ml-1 size-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
