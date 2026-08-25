import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  Bell,
  Check,
  ChevronDown,
  LogOut,
  Moon,
  Search,
  Settings,
  ShieldCheck,
  Stethoscope,
  Sun,
} from "lucide-react";

import { SidebarTrigger } from "@/components/ui/sidebar";
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
import { openCommandPalette } from "@/components/command-palette";
import { QuickCreateMenu } from "@/components/quick-create";
import { roleProfiles, useRole, clearAuthSession, type AppRole } from "@/hooks/use-role";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";

const roleIcons: Record<AppRole, typeof ShieldCheck> = {
  directeur: ShieldCheck,
  accueil: Stethoscope,
  technicien: Stethoscope,
  medecin: Stethoscope,
};

const pageContext: { match: string; label: string }[] = [
  { match: "/dashboard", label: "Tableau de bord" },
  { match: "/accueil", label: "Accueil patient" },
  { match: "/patients", label: "Patients" },
  { match: "/patient/", label: "Dossier patient" },
  { match: "/worklist", label: "Examens" },
  { match: "/file-attente", label: "File d'attente" },
  { match: "/agenda", label: "Rendez-vous" },
  { match: "/comptes-rendus", label: "Comptes rendus" },
  { match: "/catalogue", label: "Examens & tarifs" },
  { match: "/facturation", label: "Facturation" },
  { match: "/dossiers", label: "Dossiers à remettre" },
  { match: "/impayes", label: "Restes à payer" },
  { match: "/viewer", label: "Imagerie" },
];

export function AppHeader() {
  const { role, profile, setRole } = useRole();
  const { logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const contextLabel =
    pageContext.find((p) => pathname === p.match || pathname.startsWith(p.match))?.label ??
    "RadioCRM";

  function handleLogout() {
    logout();
    clearAuthSession();
    toast.success("Session fermée.");
    void navigate({ to: "/" });
  }

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border bg-surface px-3 sm:px-5">
      <SidebarTrigger />
      <div className="hidden min-w-0 sm:block">
        <p className="truncate text-sm font-semibold tracking-tight">{contextLabel}</p>
      </div>

      <button
        type="button"
        onClick={openCommandPalette}
        className="hidden h-9 min-w-0 max-w-sm flex-1 items-center gap-2 rounded-md border border-border bg-background px-3 text-left text-sm text-muted-foreground transition-colors hover:border-primary/30 hover:bg-muted/40 md:flex"
        aria-label="Ouvrir la recherche globale"
      >
        <Search className="size-4 shrink-0" />
        <span className="flex-1 truncate">Rechercher…</span>
        <kbd className="hidden rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground lg:inline">
          Ctrl K
        </kbd>
      </button>

      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        aria-label="Rechercher"
        onClick={openCommandPalette}
      >
        <Search className="size-4" />
      </Button>

      <div className="ml-auto flex items-center gap-1.5">
        <QuickCreateMenu />

        <Button
          variant="ghost"
          size="icon"
          aria-label={theme === "dark" ? "Passer en mode clair" : "Passer en mode sombre"}
          onClick={toggleTheme}
        >
          {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </Button>

        <Button variant="ghost" size="icon" aria-label="Notifications" asChild>
          <Link to="/dashboard">
            <Bell className="size-4" />
          </Link>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-2 rounded-md px-1.5 py-1 transition-colors hover:bg-muted/70"
            >
              <Avatar className="size-8">
                <AvatarFallback className="bg-primary-soft text-[11px] font-semibold text-primary">
                  {profile.initiales}
                </AvatarFallback>
              </Avatar>
              <div className="hidden text-left leading-tight sm:block">
                <p className="text-sm font-semibold">{profile.nom}</p>
                <p className="text-[11px] text-muted-foreground">{profile.fonction}</p>
              </div>
              <ChevronDown className="hidden size-4 text-muted-foreground sm:block" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuLabel>Mon compte</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/parametres">
                <Settings className="mr-2 size-4" /> Paramètres
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-[11px] font-normal text-muted-foreground">
              Aperçu des profils (affichage)
            </DropdownMenuLabel>
            {Object.values(roleProfiles).map((p) => {
              const Icon = roleIcons[p.id];
              return (
                <DropdownMenuItem key={p.id} onClick={() => setRole(p.id)} className="gap-2">
                  <Icon className="size-4 text-primary" />
                  <span className="flex-1 text-sm">{p.label}</span>
                  {p.id === role ? <Check className="size-3.5 text-success" /> : null}
                </DropdownMenuItem>
              );
            })}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={handleLogout}>
              <LogOut className="mr-2 size-4" /> Se déconnecter
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
