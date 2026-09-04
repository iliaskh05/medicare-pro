import { Link, useRouterState } from "@tanstack/react-router";
import {
  CalendarDays,
  ClipboardList,
  Clock,
  Contact,
  Database,
  FileText,
  FolderOpen,
  LayoutDashboard,
  ReceiptText,
  ScanLine,
  Settings,
  ShieldAlert,
  Stethoscope,
  UserRound,
  Users,
  Wallet,
  BarChart3,
  BookMarked,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import logoRadioCrm from "@/assets/logo-radiocrm.png";
import { useRole } from "@/hooks/use-role";

type NavItem = {
  title: string;
  url: string;
  icon: typeof Users;
  finance?: boolean;
  fraude?: boolean;
};

const navGroups: { label: string; items: NavItem[] }[] = [
  {
    label: "Accueil",
    items: [{ title: "Tableau de bord", url: "/dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Patients",
    items: [{ title: "Dossiers patients", url: "/patients", icon: Users }],
  },
  {
    label: "Activité",
    items: [
      { title: "Accueil / Admissions", url: "/accueil", icon: UserRound },
      { title: "Rendez-vous", url: "/agenda", icon: CalendarDays },
      { title: "File d'attente", url: "/file-attente", icon: Clock },
      { title: "Examens", url: "/worklist", icon: ClipboardList },
      { title: "Comptes rendus", url: "/comptes-rendus", icon: FileText },
      { title: "Numérisation", url: "/numerisation", icon: ScanLine },
    ],
  },
  {
    label: "Catalogue",
    items: [{ title: "Examens & tarifs", url: "/catalogue", icon: Stethoscope }],
  },
  {
    label: "Médecins",
    items: [
      { title: "Correspondants", url: "/medecins-referents", icon: Contact },
      { title: "Réseau", url: "/medecins", icon: Stethoscope },
    ],
  },
  {
    label: "Gestion",
    items: [
      { title: "Facturation", url: "/facturation", icon: ReceiptText, finance: true },
      { title: "Restes à payer", url: "/impayes", icon: Wallet, finance: true },
      { title: "Dossiers à remettre", url: "/dossiers", icon: FolderOpen },
    ],
  },
  {
    label: "Analytics",
    items: [{ title: "Activité", url: "/analytics", icon: BarChart3 }],
  },
  {
    label: "Administration",
    items: [
      { title: "Audit & conformité", url: "/audit", icon: ShieldAlert, fraude: true },
      { title: "Données & import", url: "/donnees", icon: Database },
      { title: "Dictionnaires", url: "/dictionnaires", icon: BookMarked },
      { title: "Paramètres", url: "/parametres", icon: Settings },
    ],
  },
];

export function AppSidebar() {
  const currentPath = useRouterState({ select: (r) => r.location.pathname });
  const { profile } = useRole();
  const visibleGroups = navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (i) => (!i.finance || profile.canSeeFinance) && (!i.fraude || profile.canSeeFraudModule),
      ),
    }))
    .filter((group) => group.items.length > 0);

  const isActive = (url: string) =>
    currentPath === url || (url !== "/dashboard" && currentPath.startsWith(`${url}/`)) ||
    (url === "/patients" && currentPath.startsWith("/patient/"));

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2.5 px-1 py-2">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary-soft">
            <img src={logoRadioCrm} alt="Logo RadioCRM" width={512} height={512} className="size-5" />
          </div>
          <div className="min-w-0 group-data-[collapsible=icon]:hidden">
            <p className="truncate text-[13px] font-semibold tracking-tight">RadioCRM</p>
            <p className="truncate text-[11px] text-muted-foreground">Centre d&apos;imagerie</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {visibleGroups.map((group) => (
          <SidebarGroup key={group.label} className="py-1">
            <SidebarGroupLabel className="px-2 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild tooltip={item.title} isActive={isActive(item.url)}>
                      <Link to={item.url} preload="intent" className="text-[13px]">
                        <item.icon className="size-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <div className="px-2 py-2 group-data-[collapsible=icon]:hidden">
          <p className="text-xs font-medium text-foreground">Centre Bentachfine</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Témara</p>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
