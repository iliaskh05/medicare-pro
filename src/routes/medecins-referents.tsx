import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowUpDown, Mail, Phone, Search, Send, UserRoundPlus } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ActionButton } from "@/components/action-button";
import { EmptyState, PageHeader, Pill } from "@/components/ui-kit";
import { useAsyncAction } from "@/hooks/use-async-action";
import { fetchReferents, sendReportToReferent } from "@/lib/api/referents";
import type { Referent } from "@/data/mock-referents";

export const Route = createFileRoute("/medecins-referents")({
  head: () => ({
    meta: [
      { title: "Base des médecins correspondants — RadioCRM" },
      {
        name: "description",
        content:
          "Base de données des médecins correspondants du centre d'imagerie : spécialité, ville (Rabat, Témara), contact et patients adressés.",
      },
      { property: "og:title", content: "Base des médecins correspondants — RadioCRM" },
      {
        property: "og:description",
        content:
          "Recherche et filtres sur les correspondants du centre d'imagerie médicale et leur volume d'adressage.",
      },
    ],
  }),
  component: ReferentsPage,
});

type SortKey = "nom" | "patientsAdresses";

function ReferentsPage() {
  const { run: load, data, isLoading, error } = useAsyncAction(fetchReferents);
  const [query, setQuery] = useState("");
  const [specialite, setSpecialite] = useState("toutes");
  const [ville, setVille] = useState("toutes");
  const [sortKey, setSortKey] = useState<SortKey>("patientsAdresses");
  const [sortAsc, setSortAsc] = useState(false);

  useEffect(() => {
    void load();
  }, [load]);

  const rows: Referent[] = data ?? [];
  const specialites = useMemo(
    () => Array.from(new Set(rows.map((r) => r.specialite))).sort(),
    [rows],
  );
  const villes = useMemo(() => Array.from(new Set(rows.map((r) => r.ville))).sort(), [rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = rows.filter(
      (r) =>
        (!q ||
          r.nom.toLowerCase().includes(q) ||
          r.specialite.toLowerCase().includes(q) ||
          r.email.toLowerCase().includes(q) ||
          r.telephone.includes(q)) &&
        (specialite === "toutes" || r.specialite === specialite) &&
        (ville === "toutes" || r.ville === ville),
    );
    return [...list].sort((a, b) => {
      const diff =
        sortKey === "nom"
          ? a.nom.localeCompare(b.nom, "fr")
          : a.patientsAdresses - b.patientsAdresses;
      return sortAsc ? diff : -diff;
    });
  }, [rows, query, specialite, ville, sortKey, sortAsc]);

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) setSortAsc((v) => !v);
    else {
      setSortKey(key);
      setSortAsc(key === "nom");
    }
  };

  const totalAdresses = filtered.reduce((s, r) => s + r.patientsAdresses, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Base des médecins correspondants"
        subtitle={`${filtered.length} correspondant(s) affiché(s) · ${totalAdresses} patients adressés`}
        actions={
          <ActionButton
            toastKind="info"
            toastMessage="Formulaire correspondant"
            toastDescription="Création d'une fiche correspondant dans la base du centre."
          >
            <UserRoundPlus className="mr-2 size-4" /> Ajouter un correspondant
          </ActionButton>
        }
      />

      <Card>
        <CardContent className="grid gap-3 p-4 md:grid-cols-[1fr_12rem_12rem]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Rechercher un correspondant"
              placeholder="Rechercher par nom, spécialité, email ou téléphone…"
              className="pl-9"
            />
          </div>
          <Select value={specialite} onValueChange={setSpecialite}>
            <SelectTrigger aria-label="Filtrer par spécialité">
              <SelectValue placeholder="Spécialité" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="toutes">Toutes spécialités</SelectItem>
              {specialites.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={ville} onValueChange={setVille}>
            <SelectTrigger aria-label="Filtrer par ville">
              <SelectValue placeholder="Ville" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="toutes">Toutes les villes</SelectItem>
              {villes.map((v) => (
                <SelectItem key={v} value={v}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card data-tour="referents">
        <CardContent className="px-0 py-0">
          {error ? (
            <p className="px-6 py-6 text-sm text-destructive">
              Base des correspondants indisponible : {error.message}
            </p>
          ) : isLoading && rows.length === 0 ? (
            <p className="px-6 py-6 text-sm text-muted-foreground">
              Chargement de la base des correspondants…
            </p>
          ) : filtered.length === 0 ? (
            <div className="px-6 py-6">
              <EmptyState
                icon={Search}
                title="Aucun correspondant trouvé"
                description="Ajustez la recherche, la spécialité ou la ville."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <button
                        type="button"
                        onClick={() => toggleSort("nom")}
                        className="flex items-center gap-1 font-medium"
                      >
                        Nom <ArrowUpDown className="size-3.5" />
                      </button>
                    </TableHead>
                    <TableHead>Spécialité</TableHead>
                    <TableHead>Ville</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>
                      <button
                        type="button"
                        onClick={() => toggleSort("patientsAdresses")}
                        className="flex items-center gap-1 font-medium"
                      >
                        Patients adressés <ArrowUpDown className="size-3.5" />
                      </button>
                    </TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <span className="block text-sm font-semibold">{r.nom}</span>
                        <span className="font-mono text-[11px] text-muted-foreground">{r.id}</span>
                      </TableCell>
                      <TableCell>
                        <Pill tone="primary">{r.specialite}</Pill>
                      </TableCell>
                      <TableCell className="text-sm">{r.ville}</TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Phone className="size-3.5" /> {r.telephone}
                        </span>
                        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Mail className="size-3.5" /> {r.email}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm font-semibold">{r.patientsAdresses}</TableCell>
                      <TableCell className="text-right">
                        <ActionButton
                          variant="outline"
                          size="sm"
                          action={() => sendReportToReferent(r.id)}
                          toastMessage="Comptes rendus transmis"
                          toastDescription={`Destinataire : ${r.nom} · ${r.ville}`}
                        >
                          <Send className="mr-2 size-4" /> Comptes rendus
                        </ActionButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Button variant="ghost" size="sm" onClick={() => void load()} disabled={isLoading}>
        Rafraîchir depuis le SI du centre
      </Button>
    </div>
  );
}
