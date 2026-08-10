import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Bell, Search, ChevronDown, ShieldCheck, Stethoscope, Check, PlayCircle } from "lucide-react";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ActionButton } from "@/components/action-button";
import { useTour } from "@/components/guided-tour";
import { roleProfiles, useRole, type AppRole } from "@/hooks/use-role";

const roleIcons: Record<AppRole, typeof ShieldCheck> = {
  directeur: ShieldCheck,
  radiologue: Stethoscope,
};


export function AppHeader() {
  const { role, profile, setRole } = useRole();
  const navigate = useNavigate();
  const { start } = useTour();
  const RoleIcon = roleIcons[role];


  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-surface/90 px-3 backdrop-blur sm:px-6">
      <SidebarTrigger />

      <div className="relative hidden max-w-sm flex-1 md:block">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          aria-label="Rechercher un patient ou une facture"
          placeholder="Rechercher un patient, une facture…"
          className="h-9 bg-background pl-9"
        />
      </div>

      <div className="ml-auto flex items-center gap-2">
        <Button
          onClick={start}
          className="h-9 gap-2 shadow-sm"
          aria-label="Lancer la visite guidée Démo Directeur"
        >
          <PlayCircle className="size-4" />
          <span className="hidden sm:inline">Lancer la Démo Directeur</span>
          <span className="sm:hidden">Démo</span>
        </Button>


        <ActionButton
          variant="ghost"
          size="icon"
          className="relative"
          delay={900}
          toastKind="info"
          toastMessage="3 notifications non lues"
          toastDescription="2 alertes de facturation critiques · 1 compte rendu à valider."
        >
          <Bell className="size-5" />
          <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-destructive" />
          <span className="sr-only">Notifications</span>
        </ActionButton>

        {/* Sélecteur de profil (RBAC visuel) */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="h-9 gap-2 border-border bg-background shadow-sm"
              aria-label="Changer de profil utilisateur"
            >
              <RoleIcon className="size-4 text-primary" />
              <span className="hidden text-sm font-semibold sm:inline">{profile.label}</span>
              <ChevronDown className="size-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel>Profil actif (démonstration RBAC)</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {Object.values(roleProfiles).map((p) => {
              const Icon = roleIcons[p.id];
              return (
                <DropdownMenuItem
                  key={p.id}
                  onClick={() => setRole(p.id)}
                  className="gap-2 py-2"
                >
                  <Icon className="size-4 text-primary" />
                  <span className="flex-1">
                    <span className="block text-sm font-semibold">{p.label}</span>
                    <span className="block text-xs text-muted-foreground">{p.fonction}</span>
                  </span>
                  {p.id === role ? <Check className="size-4 text-success" /> : null}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-lg px-1.5 py-1 transition-colors hover:bg-accent">
              <Avatar className="size-8">
                <AvatarFallback className="bg-primary text-xs font-semibold text-primary-foreground">
                  {profile.initiales}
                </AvatarFallback>
              </Avatar>
              <div className="hidden text-left leading-tight sm:block">
                <p className="text-sm font-semibold">{profile.nom}</p>
                <p className="text-xs text-muted-foreground">{profile.fonction}</p>
              </div>
              <ChevronDown className="hidden size-4 text-muted-foreground sm:block" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Mon compte</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => toast.info(`Chargement des préférences de ${profile.nom}...`)}
            >
              Profil
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => toast.info("Module de configuration en cours d'ouverture.")}
            >
              Paramètres du centre
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                toast.info("Journal d'activité", {
                  description: "Traçabilité complète des accès aux dossiers patients.",
                })
              }
            >
              Journal d'activité
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => {
                toast.success("Session fermée en toute sécurité.");
                void navigate({ to: "/" });
              }}
            >
              Se déconnecter
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

