import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CalendarPlus, ClipboardList, UserRoundSearch, Footprints } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader, Surface } from "@/components/ui-kit";
import { AdmissionWizard } from "@/components/reception/admission-wizard";
import { fetchAppointments } from "@/lib/api/appointments";
import { searchPatients, type PatientRow } from "@/lib/api/patients";
import { toLocalDateKey } from "@/lib/date";

/** Search params for /accueil — kept loose for TanStack Link + exactOptionalPropertyTypes. */
export type AccueilSearch = {
  mode?: "walkin" | "rdv";
  patientId?: string;
};

export const Route = createFileRoute("/accueil")({
  validateSearch: (search: Record<string, unknown>): AccueilSearch => {
    const next: AccueilSearch = {};
    if (search["mode"] === "walkin" || search["mode"] === "rdv") {
      next.mode = search["mode"];
    }
    if (typeof search["patientId"] === "string" && search["patientId"].trim() !== "") {
      next.patientId = search["patientId"];
    }
    return next;
  },
  head: () => ({
    meta: [{ title: "Accueil patient — RadioCRM" }],
  }),
  component: AccueilPage,
});

function AccueilPage() {
  const { mode, patientId } = Route.useSearch();
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [hits, setHits] = useState<PatientRow[]>([]);
  const [searching, setSearching] = useState(false);
  const [examHint, setExamHint] = useState<string | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(query.trim()), 280);
    return () => window.clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (!debounced) {
      setHits([]);
      setSearching(false);
      return;
    }
    const controller = new AbortController();
    setSearching(true);
    searchPatients({ search: debounced, page: 0, size: 8 }, controller.signal)
      .then((page) => {
        if (!controller.signal.aborted) setHits(page.content);
      })
      .catch(() => {
        if (!controller.signal.aborted) setHits([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) setSearching(false);
      });
    return () => controller.abort();
  }, [debounced]);

  if (mode === "rdv" || mode === "walkin") {
    return (
      <div className="page-shell">
        <PageHeader
          eyebrow="Secrétariat"
          title={mode === "rdv" ? "Prendre rendez-vous" : "Passage sans rendez-vous"}
          subtitle={
            mode === "rdv"
              ? "Recherche patient, choix de l'examen, créneau, avance optionnelle, confirmation."
              : "Admission immédiate : patient, examen, tarif, avance, file d'attente."
          }
          actions={
            <Button variant="outline" asChild>
              <Link to="/accueil">Retour à l'accueil</Link>
            </Button>
          }
        />
        <AdmissionWizard mode={mode} initialPatientId={patientId} />
      </div>
    );
  }

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Secrétariat"
        title="Accueil patient"
        subtitle="Recherchez un dossier, prenez un rendez-vous ou enregistrez un passage sans rendez-vous."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Link
          to="/accueil"
          search={{ mode: "rdv" } as AccueilSearch}
          className="app-surface group p-5 transition-colors hover:border-primary/35"
        >
          <CalendarPlus className="size-5 text-primary" />
          <h2 className="mt-3 text-[17px] font-semibold tracking-tight">Prendre rendez-vous</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Planifier un examen : patient, acte, date, heure, avance optionnelle.
          </p>
        </Link>
        <Link
          to="/accueil"
          search={{ mode: "walkin" } as AccueilSearch}
          className="app-surface group p-5 transition-colors hover:border-primary/35"
        >
          <Footprints className="size-5 text-primary" />
          <h2 className="mt-3 text-[17px] font-semibold tracking-tight">Passage sans rendez-vous</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Admission immédiate : tarif automatique, avance, mise en file d'attente.
          </p>
        </Link>
      </div>

      <Surface className="p-5">
        <div className="flex items-center gap-2">
          <UserRoundSearch className="size-4 text-muted-foreground" />
          <Input
            placeholder="Nom, prénom, n° patient, téléphone, CIN"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setExamHint(null);
            }}
          />
        </div>
        {searching ? (
          <p className="mt-3 text-sm text-muted-foreground">Recherche…</p>
        ) : null}
        {hits.length > 0 ? (
          <ul className="mt-4 divide-y divide-border">
            {hits.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div>
                  <p className="text-sm font-semibold">{p.nomComplet}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.numeroDossier ?? p.id} · {p.cin} · {p.telephone}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      try {
                        const today = toLocalDateKey();
                        const rows = await fetchAppointments({ from: today, to: today });
                        const mine = rows.filter(
                          (r) =>
                            String(r.patientId) === p.id &&
                            r.statut !== "CANCELLED" &&
                            r.statut !== "NO_SHOW",
                        );
                        setExamHint(
                          mine.length
                            ? `${mine.length} RDV aujourd'hui — ${mine
                                .map(
                                  (m) =>
                                    `${m.examenLibelle || m.modalite} (${(m.startsAt || "").slice(11, 16) || "—"})`,
                                )
                                .join(", ")}`
                            : "Aucun rendez-vous aujourd'hui pour ce patient.",
                        );
                      } catch {
                        setExamHint("Impossible de vérifier les rendez-vous du jour.");
                      }
                    }}
                  >
                    RDV du jour
                  </Button>
                  <Button size="sm" variant="outline" asChild>
                    <Link to="/patient/$patientId" params={{ patientId: p.id }}>
                      Dossier
                    </Link>
                  </Button>
                  <Button size="sm" variant="outline" asChild>
                    <Link to="/accueil" search={{ mode: "rdv", patientId: p.id } as AccueilSearch}>
                      RDV
                    </Link>
                  </Button>
                  <Button size="sm" asChild>
                    <Link
                      to="/accueil"
                      search={{ mode: "walkin", patientId: p.id } as AccueilSearch}
                    >
                      Passage
                    </Link>
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        ) : debounced && !searching ? (
          <p className="mt-3 text-sm text-muted-foreground">Aucun dossier trouvé.</p>
        ) : null}
        {examHint ? <p className="mt-3 text-sm text-muted-foreground">{examHint}</p> : null}
      </Surface>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" asChild>
          <Link to="/file-attente">
            <ClipboardList className="mr-2 size-4" /> File d&apos;attente
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/dossiers">Dossiers à remettre</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/impayes">Restes à payer</Link>
        </Button>
      </div>
    </div>
  );
}
