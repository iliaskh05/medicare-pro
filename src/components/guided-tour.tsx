import { useNavigate, useRouterState } from "@tanstack/react-router";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { ArrowRight, Check, Sparkles, X } from "lucide-react";

import { Button } from "@/components/ui/button";

type TourStep = {
  route: string;
  target: string;
  titre: string;
  texte: string;
};

const steps: TourStep[] = [
  {
    route: "/dashboard",
    target: '[data-tour="kpis"]',
    titre: "1. Pilotage global du centre",
    texte:
      "Vue temps réel de l'activité : patients du jour, chiffre d'affaires mensuel, examens en attente et alertes de facturation détectées par l'IA.",
  },
  {
    route: "/patient/demo",
    target: '[data-tour="ia-panel"]',
    titre: "2. Analyse de Conformité (Fraude Caisse)",
    texte:
      "Le moteur hybride score chaque dossier : score de risque, clustering des signaux faibles et rupture de protocole financier — avec validation humaine.",
  },
  {
    route: "/viewer",
    target: '[data-tour="ai-layer"]',
    titre: "3. Calque IA de segmentation",
    texte:
      "Un simple interrupteur superpose la segmentation automatique (contour rouge) sur les coupes IRM, avec le niveau de confiance de chaque lésion détectée.",
  },
  {
    route: "/dashboard",
    target: '[data-tour="actions"]',
    titre: "4. Actions & exports",
    texte:
      "Export comptable en un clic et menu « Créer un document » : facture d'acompte, facture de solde, compte rendu médical ou demande de prise en charge.",
  },
];

type TourValue = { start: () => void; running: boolean };

const TourContext = createContext<TourValue>({ start: () => {}, running: false });

export function useTour() {
  return useContext(TourContext);
}

type Rect = { top: number; left: number; width: number; height: number };

export function TourProvider({ children }: { children: ReactNode }) {
  const [index, setIndex] = useState<number | null>(null);
  const [rect, setRect] = useState<Rect | null>(null);
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const step = index === null ? null : steps[index];

  const start = useCallback(() => {
    setRect(null);
    setIndex(0);
  }, []);

  const stop = useCallback(() => {
    setIndex(null);
    setRect(null);
  }, []);

  // Navigation vers la route de l'étape courante
  useEffect(() => {
    if (!step) return;
    if (pathname !== step.route) void navigate({ to: step.route });
  }, [step, pathname, navigate]);

  // Mesure de la cible (avec attente du montage / de la navigation)
  useEffect(() => {
    if (!step || typeof window === "undefined") return;
    if (pathname !== step.route) return;
    let raf = 0;
    let tries = 0;
    const measure = () => {
      const el = document.querySelector(step.target);
      if (el) {
        const r = el.getBoundingClientRect();
        if (r.top < 90 || r.bottom > window.innerHeight - 140) {
          el.scrollIntoView({ block: "center", behavior: "smooth" });
        }
        const b = el.getBoundingClientRect();
        setRect({ top: b.top, left: b.left, width: b.width, height: b.height });
      } else if (tries < 90) {
        tries += 1;
      }
      raf = window.requestAnimationFrame(measure);
    };
    raf = window.requestAnimationFrame(measure);
    return () => window.cancelAnimationFrame(raf);
  }, [step, pathname]);

  useEffect(() => {
    if (index === null || typeof window === "undefined") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") stop();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, stop]);

  const value = useMemo<TourValue>(() => ({ start, running: index !== null }), [start, index]);

  const isLast = index !== null && index === steps.length - 1;
  const pad = 8;
  const cardTop = rect ? Math.min(rect.top + rect.height + 16, (typeof window !== "undefined" ? window.innerHeight : 800) - 230) : 0;

  return (
    <TourContext.Provider value={value}>
      {children}
      {step ? (
        <div className="fixed inset-0 z-[70]" role="dialog" aria-label="Visite guidée Démo Directeur">
          {rect ? (
            <div
              className="pointer-events-none absolute rounded-xl ring-2 ring-primary transition-all duration-500"
              style={{
                top: rect.top - pad,
                left: rect.left - pad,
                width: rect.width + pad * 2,
                height: rect.height + pad * 2,
                boxShadow: "0 0 0 9999px rgba(2, 6, 23, 0.72)",
              }}
            />
          ) : (
            <div className="absolute inset-0 bg-[rgba(2,6,23,0.72)]" />
          )}

          <div
            className="absolute w-[min(24rem,calc(100vw-2rem))] rounded-2xl border border-border bg-card p-5 shadow-xl transition-all duration-500"
            style={
              rect
                ? { top: cardTop, left: Math.max(16, Math.min(rect.left, (typeof window !== "undefined" ? window.innerWidth : 1200) - 400)) }
                : { top: "50%", left: "50%", transform: "translate(-50%, -50%)" }
            }
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-primary" />
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                  Démo Directeur · étape {(index ?? 0) + 1}/{steps.length}
                </p>
              </div>
              <button
                onClick={stop}
                aria-label="Quitter la visite guidée"
                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent"
              >
                <X className="size-4" />
              </button>
            </div>

            <h2 className="mt-2 text-base font-bold tracking-tight">{step.titre}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{step.texte}</p>

            <div className="mt-4 flex items-center justify-between gap-3">
              <div className="flex gap-1.5">
                {steps.map((s, i) => (
                  <span
                    key={s.target}
                    className={
                      i === index
                        ? "h-1.5 w-6 rounded-full bg-primary transition-all"
                        : "h-1.5 w-1.5 rounded-full bg-muted transition-all"
                    }
                  />
                ))}
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={stop}>
                  Quitter
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    if (isLast) {
                      stop();
                      return;
                    }
                    setRect(null);
                    setIndex((i) => (i === null ? null : i + 1));
                  }}
                >
                  {isLast ? (
                    <>
                      Terminer <Check className="ml-1.5 size-4" />
                    </>
                  ) : (
                    <>
                      Suivant <ArrowRight className="ml-1.5 size-4" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </TourContext.Provider>
  );
}
