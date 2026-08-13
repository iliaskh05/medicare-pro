import { Link, useRouterState } from "@tanstack/react-router";
import {
  ClipboardList,
  Users,
  ReceiptText,
  Printer,
  Mic,
  ShieldAlert,
  ScanLine,
  MessagesSquare,
  MessageCircle,
  Contact,
  Settings,
  LayoutDashboard,
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
    label: "Opérationnel",
    items: [
      { title: "Worklist", url: "/worklist", icon: ClipboardList },
      { title: "Dossiers patients", url: "/patients", icon: Users },
      { title: "Numérisation & étiquettes", url: "/numerisation", icon: Printer },
      { title: "Tableau de bord", url: "/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "Médical & administratif",
    items: [
      { title: "Comptes rendus", url: "/comptes-rendus", icon: Mic },
      { title: "Visionneuse IA", url: "/viewer", icon: ScanLine },
      { title: "Caisse & facturation", url: "/facturation", icon: ReceiptText, finance: true },
      { title: "Correspondants", url: "/medecins-referents", icon: Contact },
      { title: "Chat médecins", url: "/chat", icon: MessagesSquare },
      { title: "WhatsApp patients", url: "/whatsapp", icon: MessageCircle },
    ],
  },
  {
    label: "Direction (Mr Adnane)",
    items: [
      { title: "Audit & fraude", url: "/audit", icon: ShieldAlert, fraude: true },
      { title: "Configuration", url: "/parametres", icon: Settings },
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


  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-3 px-1 py-2">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-foreground/10 ring-1 ring-inset ring-primary-foreground/15">
            <img
              src={logoRadioCrm}
              alt="Logo RadioCRM"
              width={512}
              height={512}
              className="size-6"
            />
          </div>
          <div className="min-w-0 group-data-[collapsible=icon]:hidden">
            <p className="truncate text-sm font-bold tracking-tight">RadioCRM</p>
            <p className="truncate text-xs text-muted-foreground">
              Centre d&apos;Imagerie Médicale
            </p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {visibleGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton
                      asChild
                      tooltip={item.title}
                      isActive={currentPath === item.url}
                    >
                      <Link to={item.url} className="flex items-center gap-2 font-medium">
                        <item.icon
                          className={
                            currentPath === item.url
                              ? "size-4 text-[oklch(0.78_0.13_235)]"
                              : "size-4 opacity-80"
                          }
                        />
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
        <div className="rounded-lg bg-sidebar-accent px-3 py-2 group-data-[collapsible=icon]:hidden">
          <p className="text-xs font-semibold text-sidebar-accent-foreground">
            Centre d&apos;Imagerie Médicale
          </p>
          <p className="mt-0.5 text-xs text-sidebar-foreground/60">Casablanca</p>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
