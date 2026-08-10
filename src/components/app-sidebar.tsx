import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  ReceiptText,
  Stethoscope,
  ShieldAlert,
  ScanLine,
  MessagesSquare,
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
import logoRadioCrm from "@/assets/logo-radiocrm.png";

const items = [
  { title: "Tableau de bord", url: "/dashboard", icon: LayoutDashboard },
  { title: "Patients", url: "/patients", icon: Users },
  { title: "Actes & Facturation", url: "/facturation", icon: ReceiptText },
  { title: "Visionneuse IA", url: "/viewer", icon: ScanLine },
  { title: "Chat médecins", url: "/chat", icon: MessagesSquare },
  { title: "WhatsApp", url: "/whatsapp", icon: MessageCircle },
  { title: "Médecins", url: "/medecins", icon: Stethoscope },
  { title: "Audit & Conformité", url: "/audit", icon: ShieldAlert },
] as const;

export function AppSidebar() {
  const currentPath = useRouterState({ select: (r) => r.location.pathname });

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
                    <Link
                      to={item.url}
                      className="flex items-center gap-2 font-medium"
                    >
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
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <div className="rounded-lg bg-sidebar-accent px-3 py-2 group-data-[collapsible=icon]:hidden">
          <p className="text-xs font-semibold text-sidebar-accent-foreground">
            Module IA Fraude actif
          </p>
          <p className="mt-0.5 text-xs text-sidebar-foreground/60">Casablanca</p>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
