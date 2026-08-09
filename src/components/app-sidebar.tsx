import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  ReceiptText,
  Stethoscope,
  ShieldAlert,
  Scan,
  ScanLine,
  MessageCircle,
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

const items = [
  { title: "Tableau de bord", url: "/", icon: LayoutDashboard },
  { title: "Patients", url: "/patients", icon: Users },
  { title: "Actes & Facturation", url: "/facturation", icon: ReceiptText },
  { title: "Médecins prescripteurs", url: "/medecins", icon: Stethoscope },
  { title: "Visionneuse de scans", url: "/imagerie", icon: ScanLine },
  { title: "Chatbot WhatsApp", url: "/whatsapp", icon: MessageCircle },
  { title: "Audit & Conformité", url: "/audit", icon: ShieldAlert },
] as const;

export function AppSidebar() {
  const currentPath = useRouterState({ select: (r) => r.location.pathname });

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-3 px-1 py-2">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Scan className="size-5" />
          </div>
          <div className="min-w-0 group-data-[collapsible=icon]:hidden">
            <p className="truncate text-sm font-bold tracking-tight">Centre Radiologie</p>
            <p className="truncate text-xs text-muted-foreground">Al Amal · Casablanca</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton
                    asChild
                    tooltip={item.title}
                    isActive={currentPath === item.url}
                  >
                    <Link to={item.url} className="flex items-center gap-2">
                      <item.icon className="size-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <div className="rounded-lg bg-accent px-3 py-2 group-data-[collapsible=icon]:hidden">
          <p className="text-xs font-semibold text-accent-foreground">Module IA Fraude actif</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Dernier scan : aujourd'hui 08:00</p>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
