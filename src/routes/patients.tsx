import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, UserPlus, FileText, ChevronLeft, ChevronRight } from "lucide-react";
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
import { patients, typesExamen, type Mutuelle } from "@/data/mock";

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

function PatientsPage() {
  const [query, setQuery] = useState("");
  const [mutuelle, setMutuelle] = useState<string>("toutes");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);

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
  }, [query, mutuelle]);

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
                  <Input id="nom" placeholder="Ex. Youssef El Amrani" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cin">CIN</Label>
                  <Input id="cin" placeholder="Ex. BE884512" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tel">Téléphone</Label>
                  <Input id="tel" placeholder="06 61 23 45 78" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="naissance">Date de naissance</Label>
                  <Input id="naissance" type="date" />
                </div>
                <div className="space-y-2">
                  <Label>Mutuelle</Label>
                  <Select defaultValue="AMO">
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
                  <Select>
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
                <Button
                  onClick={() => {
                    setOpen(false);
                    toast.success("Dossier patient créé (démonstration)");
                  }}
                >
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
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                      Aucun patient ne correspond à cette recherche.
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
