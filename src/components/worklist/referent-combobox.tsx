import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Search, Stethoscope } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { fetchMedecins } from "@/lib/api/referents";
import type { Referent } from "@/types/referent";

/**
 * Autocomplete « Médecin correspondant ».
 * Les options proviennent du backend Java : GET {JAVA_API_BASE}/api/medecins.
 */
export function ReferentCombobox({
  value,
  onChange,
}: {
  value: { id: string | null; nom: string };
  onChange: (next: { id: string | null; nom: string }) => void;
}) {
  const [referents, setReferents] = useState<Referent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    fetchMedecins(controller.signal)
      .then((rows) => {
        setReferents(rows);
        setUnavailable(false);
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setReferents([]);
        setUnavailable(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    function onDocClick(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const matches = useMemo(() => {
    const q = value.nom.trim().toLowerCase();
    const base = q
      ? referents.filter(
          (r) =>
            r.nom.toLowerCase().includes(q) ||
            r.specialite.toLowerCase().includes(q) ||
            r.ville.toLowerCase().includes(q),
        )
      : referents;
    return base.slice(0, 8);
  }, [referents, value.nom]);

  return (
    <div ref={containerRef} className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        role="combobox"
        aria-expanded={open}
        aria-label="Rechercher un médecin correspondant"
        placeholder="Rechercher un correspondant (nom, spécialité, ville)…"
        className="pl-9"
        value={value.nom}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          onChange({ id: null, nom: e.target.value });
          setOpen(true);
        }}
      />
      {isLoading ? (
        <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
      ) : null}

      {open ? (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-lg border border-border bg-popover shadow-lg">
          {matches.length > 0 ? (
            <ul className="max-h-60 overflow-y-auto py-1">
              {matches.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    className={cn(
                      "flex w-full items-start gap-2 px-3 py-2 text-left text-sm hover:bg-accent",
                      value.id === r.id && "bg-accent",
                    )}
                    onClick={() => {
                      onChange({ id: r.id, nom: r.nom });
                      setOpen(false);
                    }}
                  >
                    <Stethoscope className="mt-0.5 size-4 text-muted-foreground" aria-hidden />
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{r.nom}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {r.specialite} · {r.ville}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-3 py-3 text-xs text-muted-foreground">
              {unavailable
                ? "Annuaire des correspondants en attente de connexion au serveur du centre. Vous pouvez saisir le nom manuellement."
                : "Aucun correspondant ne correspond à cette recherche."}
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
