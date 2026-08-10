import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Activity,
  BrainCircuit,
  Lock,
  Mail,
  ScanLine,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import logoRadioCrm from "@/assets/logo-radiocrm.png";
import centreRadiologie from "@/assets/centre-radiologie.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Connexion — RadioCRM Centre d'Imagerie Médicale" },
      {
        name: "description",
        content:
          "Accédez à RadioCRM, la plateforme du Centre d'Imagerie Médicale : patients, facturation MAD, imagerie et détection de fraude par IA.",
      },
      {
        property: "og:title",
        content: "Connexion — RadioCRM Centre d'Imagerie Médicale",
      },
      {
        property: "og:description",
        content:
          "Plateforme sécurisée de gestion du centre d'imagerie médicale, Casablanca.",
      },
    ],
  }),
  component: LoginPage,
});

const atouts = [
  {
    icon: BrainCircuit,
    titre: "IA de détection de fraude",
    detail:
      "Clustering des signaux faibles et scoring des anomalies de facturation.",
  },
  {
    icon: ScanLine,
    titre: "Imagerie augmentée",
    detail:
      "Surbrillance des zones suspectes et compte rendu structuré automatique.",
  },
  {
    icon: Activity,
    titre: "Automatisation du parcours",
    detail:
      "Chatbot WhatsApp, planning intelligent et export comptable.",
  },
];

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("direction@alamal.ma");
  const [password, setPassword] = useState("demo1234");

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Moitié gauche — branding */}
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-[oklch(0.24_0.06_264)] via-[oklch(0.30_0.07_258)] to-[oklch(0.42_0.05_250)] p-12 lg:flex lg:flex-col lg:justify-between">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full bg-primary/25 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-32 -left-20 size-96 rounded-full bg-[oklch(0.66_0.15_210)]/20 blur-3xl"
        />

        <div className="relative flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-primary-foreground/10 ring-1 ring-inset ring-primary-foreground/20 backdrop-blur">
            <img
              src={logoRadioCrm}
              alt="Logo RadioCRM — Centre d'Imagerie Médicale"
              width={512}
              height={512}
              className="size-7"
            />
          </div>
          <span className="text-sm font-semibold uppercase tracking-[0.18em] text-primary-foreground/70">
            RadioCRM
          </span>
        </div>

        <div className="relative max-w-xl">
          <p className="inline-flex items-center gap-2 rounded-full bg-primary-foreground/10 px-3 py-1 text-xs font-semibold text-primary-foreground/80 ring-1 ring-inset ring-primary-foreground/20">
            <Sparkles className="size-3.5" />
            Plateforme médicale augmentée par l'IA
          </p>
          <h1 className="page-title mt-6 text-5xl text-primary-foreground xl:text-6xl">
            RadioCRM
          </h1>
          <p className="mt-3 text-lg font-semibold text-primary-foreground/85">
            Centre d'Imagerie Médicale
          </p>

          {/* Photo du centre + slogan */}
          <figure className="relative mt-6 overflow-hidden rounded-2xl ring-1 ring-inset ring-primary-foreground/15">
            <img
              src={centreRadiologie}
              alt="Salle d'IRM du Centre d'Imagerie Médicale à Casablanca"
              width={1280}
              height={960}
              className="h-52 w-full object-cover xl:h-60"
            />
            <div aria-hidden className="absolute inset-0 bg-black/40" />
            <div
              aria-hidden
              className="absolute inset-0 bg-gradient-to-t from-[oklch(0.18_0.05_264)]/95 via-[oklch(0.18_0.05_264)]/25 to-transparent"
            />
            <figcaption className="absolute inset-x-0 bottom-0 p-4">
              <p className="text-base font-bold leading-snug text-primary-foreground">
                « Voir plus clair, décider plus vite. »
              </p>
              <p className="mt-1 text-xs text-primary-foreground/70">
                Imagerie de précision · Casablanca
              </p>
            </figcaption>
          </figure>

          <div className="mt-8 space-y-4">
            {atouts.map((a) => (
              <div key={a.titre} className="flex items-start gap-3">
                <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-foreground/10 ring-1 ring-inset ring-primary-foreground/15">
                  <a.icon className="size-4 text-primary-foreground" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-primary-foreground">
                    {a.titre}
                  </p>
                  <p className="text-xs text-primary-foreground/60">
                    {a.detail}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="relative flex items-center gap-2 text-xs text-primary-foreground/55">
          <ShieldCheck className="size-4" />
          Hébergement conforme · Journalisation des accès · Données patients
          chiffrées
        </p>
      </div>

      {/* Moitié droite — formulaire */}
      <div className="flex items-center justify-center bg-surface px-6 py-12 sm:px-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <div className="flex items-center gap-3">
              <img
                src={logoRadioCrm}
                alt="Logo RadioCRM"
                width={512}
                height={512}
                className="size-10"
              />
              <div>
                <p className="text-sm font-bold tracking-tight">RadioCRM</p>
                <p className="text-xs text-muted-foreground">
                  Centre d'Imagerie Médicale
                </p>
              </div>
            </div>
            <figure className="relative mt-5 overflow-hidden rounded-2xl">
              <img
                src={centreRadiologie}
                alt="Salle d'IRM du Centre d'Imagerie Médicale"
                width={1280}
                height={960}
                className="h-36 w-full object-cover"
              />
              <div aria-hidden className="absolute inset-0 bg-black/40" />
              <div
                aria-hidden
                className="absolute inset-0 bg-gradient-to-t from-[oklch(0.18_0.05_264)]/95 to-transparent"
              />
              <figcaption className="absolute inset-x-0 bottom-0 p-3 text-sm font-bold text-primary-foreground">
                « Voir plus clair, décider plus vite. »
              </figcaption>
            </figure>
          </div>

          <h2 className="page-title text-2xl">Bienvenue</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Connectez-vous pour accéder au tableau de bord du centre.
          </p>

          <form
            className="mt-8 space-y-5"
            onSubmit={(e) => {
              e.preventDefault();
              navigate({ to: "/dashboard" });
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="email">Adresse e-mail professionnelle</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="prenom.nom@alamal.ma"
                  className="h-11 bg-background pl-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Mot de passe</Label>
                <button
                  type="button"
                  className="text-xs font-medium text-primary hover:underline"
                >
                  Mot de passe oublié ?
                </button>
              </div>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-11 bg-background pl-9"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox id="remember" defaultChecked />
              <Label
                htmlFor="remember"
                className="text-sm font-normal text-muted-foreground"
              >
                Garder ma session active sur ce poste
              </Label>
            </div>

            <Button
              type="submit"
              size="lg"
              className="h-12 w-full text-base shadow-sm"
            >
              Se connecter
            </Button>
          </form>

          <Separator className="my-8" />

          <p className="text-center text-xs text-muted-foreground">
            Accès réservé au personnel autorisé du centre.
          </p>
          <Button
            type="button"
            variant="outline"
            className="mt-3 h-11 w-full"
            disabled={demoLoading}
            onClick={() => {
              if (demoLoading) return;
              setDemoLoading(true);
              window.setTimeout(() => {
                navigate({ to: "/dashboard" });
              }, 1500);
            }}
          >
            {demoLoading ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Authentification sécurisée en cours...
              </>
            ) : (
              "Continuer en mode démonstration"
            )}
          </Button>

        </div>
      </div>
    </div>
  );
}
