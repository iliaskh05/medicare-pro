import { useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ClipboardList,
  FileText,
  ReceiptText,
  Stethoscope,
  User,
} from "lucide-react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { fetchMedecins } from "@/lib/api/referents";
import { fetchPatients } from "@/lib/api/patients";
import { fetchWorklist } from "@/lib/api/worklist";
import { toLocalDateKey } from "@/lib/date";

type SearchHit = {
  id: string;
  kind: "patient" | "examen" | "medecin" | "facture" | "compte-rendu";
  title: string;
  subtitle: string;
  href: string;
};

function today() {
  return toLocalDateKey();
}

export function openCommandPalette() {
  window.dispatchEvent(new CustomEvent("radiocrm:command"));
}

export function CommandPalette() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("radiocrm:command", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("radiocrm:command", onOpen);
    };
  }, []);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setHits([]);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    const q = query.trim().toLowerCase();

    Promise.allSettled([
      fetchPatients(controller.signal),
      fetchWorklist({ date: today() }, controller.signal),
      fetchMedecins(controller.signal),
    ])
      .then(([patientsRes, examsRes, medecinsRes]) => {
        if (controller.signal.aborted) return;
        const patients = patientsRes.status === "fulfilled" ? patientsRes.value : [];
        const exams = examsRes.status === "fulfilled" ? examsRes.value : [];
        const medecins = medecinsRes.status === "fulfilled" ? medecinsRes.value : [];

        const next: SearchHit[] = [];

        for (const p of patients) {
          const hay = `${p.nomComplet} ${p.cin} ${p.telephone} ${p.numeroDossier ?? p.id}`.toLowerCase();
          if (q && !hay.includes(q)) continue;
          next.push({
            id: `p-${p.id}`,
            kind: "patient",
            title: p.nomComplet,
            subtitle: [p.numeroDossier ?? `ID ${p.id}`, p.cin].filter(Boolean).join(" · "),
            href: `/patient/${p.id}`,
          });
        }

        for (const e of exams) {
          const hay = `${e.patient} ${e.numSejour} ${e.description} ${e.cin ?? ""}`.toLowerCase();
          if (q && !hay.includes(q)) continue;
          next.push({
            id: `e-${e.id}`,
            kind: "examen",
            title: e.patient,
            subtitle: `${e.description} · ${e.numSejour}`,
            href: "/worklist",
          });
          if (e.statutCr !== "a_faire") {
            next.push({
              id: `cr-${e.id}`,
              kind: "compte-rendu",
              title: `CR — ${e.patient}`,
              subtitle: e.description,
              href: "/comptes-rendus",
            });
          }
          if (e.etatPatient === "arrive") {
            next.push({
              id: `f-${e.id}`,
              kind: "facture",
              title: `Facture — ${e.patient}`,
              subtitle: e.numSejour,
              href: "/facturation",
            });
          }
        }

        for (const m of medecins) {
          const hay = `${m.nom} ${m.specialite} ${m.ville}`.toLowerCase();
          if (q && !hay.includes(q)) continue;
          next.push({
            id: `m-${m.id}`,
            kind: "medecin",
            title: m.nom,
            subtitle: [m.specialite, m.ville].filter(Boolean).join(" · "),
            href: "/medecins-referents",
          });
        }

        setHits(next.slice(0, 40));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [open, query]);

  const groups = useMemo(() => {
    const order: SearchHit["kind"][] = ["patient", "examen", "compte-rendu", "facture", "medecin"];
    const labels: Record<SearchHit["kind"], string> = {
      patient: "Patients",
      examen: "Examens",
      "compte-rendu": "Comptes rendus",
      facture: "Factures",
      medecin: "Médecins",
    };
    return order
      .map((kind) => ({ kind, label: labels[kind], items: hits.filter((h) => h.kind === kind) }))
      .filter((g) => g.items.length > 0);
  }, [hits]);

  const iconFor = (kind: SearchHit["kind"]) => {
    if (kind === "patient") return User;
    if (kind === "examen") return ClipboardList;
    if (kind === "compte-rendu") return FileText;
    if (kind === "facture") return ReceiptText;
    return Stethoscope;
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder="Rechercher un patient, un examen, un médecin…"
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>
          {loading ? "Recherche en cours…" : "Aucun résultat dans les données du centre."}
        </CommandEmpty>
        {groups.map((group) => (
          <CommandGroup key={group.kind} heading={group.label}>
            {group.items.map((hit) => {
              const Icon = iconFor(hit.kind);
              return (
                <CommandItem
                  key={hit.id}
                  value={`${hit.kind} ${hit.title} ${hit.subtitle}`}
                  onSelect={() => {
                    setOpen(false);
                    void navigate({ to: hit.href as never });
                  }}
                >
                  <Icon className="size-4 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate">{hit.title}</span>
                  <span className="truncate text-xs text-muted-foreground">{hit.subtitle}</span>
                </CommandItem>
              );
            })}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
