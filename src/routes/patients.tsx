import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, SearchX, UserPlus, FileText, ChevronLeft, ChevronRight } from "lucide-react";
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
import { PageHeader, Pill, EmptyState } from "@/components/ui-kit";
import { typesExamen, type Mutuelle } from "@/data/mock";
import { useAppStore } from "@/store/app-store";

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
        content: "Base patients du centre de radiologie avec CIN, mutuelle et historique d'examens.",
      },
    ],
  }),
  component: PatientsPage,
});

const mutuelleTone: Record<Mutuelle, "primary" | "success" | "warning" | "neutral"> = {
  AMO: "primary",
  CNSS: "success",
  CNOPS: "warning",
  Privée: "neutral",
};

const PAGE_SIZE = 8;

const emptyDraft = {
  nom: "",
  cin: "",
  telephone: "",
  naissance: "",
  mutuelle: "AMO" as Mutuelle,
  dernierExamen: "",
};

function ageFromBirthDate(value: string): number {
  const birth = new Date(value);
  if (Number.isNaN(birth.getTime())) return 0;
  const diff = Date.now() - birth.getTime();
  return Math.max(0, Math.floor(diff / (365.25 * 24 * 3600 * 1000)));
}

function PatientsPage() {
  const { patients, addPatient } = useAppStore();
  const [query, setQuery] = useState("");
  const [mutuelle, setMutuelle] = useState<string>("toutes");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(emptyDraft);

  const canSubmit = draft.nom.trim() !== "" && draft.cin.trim() !== "";

  const submitDraft = () => {
    const created = addPatient({
      nom: draft.nom.trim(),
      cin: draft.cin.trim().toUpperCase(),
      age: ageFromBirthDate(draft.naissance),
      telephone: draft.telephone.trim() || "—",
      mutuelle: draft.mutuelle,
      ville: "Casablanca",
      dernierExamen: draft.dernierExamen || "À planifier",
    });
    setDraft(emptyDraft);
    setOpen(false);
    setPage(1);
    toast.success(`Dossier ${created.id} créé pour ${created.nom}`);
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return patients.filter((p) => {
      const matchQ =
        !q ||
        p.nom.toLowerCase().includes(q) ||
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
        subtitle={`${patients.length} dossiers actifs · mise à jour aujourd'hui`}
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
                  Renseignez les informations d'identité et de couverture médicale.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="nom">Nom complet</Label>
                  <Input
                    id="nom"
                    placeholder="Ex. Youssef El Amrani"
                    value={draft.nom}
                    onChange={(e) => setDraft((d) => ({ ...d, nom: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cin">CIN</Label>
                  <Input
                    id="cin"
                    placeholder="Ex. BE884512"
                    value={draft.cin}
                    onChange={(e) => setDraft((d) => ({ ...d, cin: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tel">Téléphone</Label>
                  <Input
                    id="tel"
                    placeholder="06 61 23 45 78"
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
                    onValueChange={(v) => setDraft((d) => ({ ...d, mutuelle: v as Mutuelle }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AMO">AMO</SelectItem>
                      <SelectItem value="CNSS">CNSS</SelectItem>
                      <SelectItem value="CNOPS">CNOPS</SelectItem>
                      <SelectItem value="Privée">Privée</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Examen prévu</Label>
                  <Select
                    value={draft.dernierExamen}
                    onValueChange={(v) => setDraft((d) => ({ ...d, dernierExamen: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un examen" />
                    </SelectTrigger>
                    <SelectContent>
                      {typesExamen.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
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
                <Button disabled={!canSubmit} onClick={submitDraft}>
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
              <SelectItem value="AMO">AMO</SelectItem>
              <SelectItem value="CNSS">CNSS</SelectItem>
              <SelectItem value="CNOPS">CNOPS</SelectItem>
              <SelectItem value="Privée">Privée</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="px-0 py-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Nom complet</TableHead>
                  <TableHead>CIN</TableHead>
                  <TableHead>Âge</TableHead>
                  <TableHead className="hidden md:table-cell">Téléphone</TableHead>
                  <TableHead>Mutuelle</TableHead>
                  <TableHead className="hidden lg:table-cell">Dernier examen</TableHead>
                  <TableHead className="pr-6 text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="pl-6">
                      <p className="font-medium">{p.nom}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.id} · {p.ville}
                      </p>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{p.cin}</TableCell>
                    <TableCell className="text-sm">{p.age} ans</TableCell>
                    <TableCell className="hidden text-sm md:table-cell">{p.telephone}</TableCell>
                    <TableCell>
                      <Pill tone={mutuelleTone[p.mutuelle]}>{p.mutuelle}</Pill>
                    </TableCell>
                    <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">
                      {p.dernierExamen}
                    </TableCell>
                    <TableCell className="pr-6 text-right">
                      <Button variant="outline" size="sm">
                        <FileText className="mr-1.5 size-4" /> Voir dossier
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={7} className="p-0">
                      <EmptyState
                        icon={SearchX}
                        title="Aucun patient trouvé"
                        description="Aucun dossier ne correspond à cette recherche. Vérifiez l'orthographe ou élargissez le filtre mutuelle."
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
