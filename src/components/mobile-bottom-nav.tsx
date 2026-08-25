import { Link, useRouterState } from "@tanstack/react-router";
import { ClipboardList, FileText, LayoutDashboard, MoreHorizontal, Users } from "lucide-react";

import { cn } from "@/lib/utils";

const items = [
  { title: "Accueil", url: "/dashboard", icon: LayoutDashboard },
  { title: "Patients", url: "/patients", icon: Users },
  { title: "Examens", url: "/worklist", icon: ClipboardList },
  { title: "CR", url: "/comptes-rendus", icon: FileText },
  { title: "Plus", url: "/parametres", icon: MoreHorizontal },
];

export function MobileBottomNav() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 px-2 py-1.5 backdrop-blur md:hidden"
      aria-label="Navigation principale"
    >
      <ul className="grid grid-cols-5">
        {items.map((item) => {
          const active =
            item.url === "/dashboard"
              ? pathname === "/dashboard"
              : pathname === item.url || pathname.startsWith(`${item.url}/`);
          return (
            <li key={item.url}>
              <Link
                to={item.url}
                className={cn(
                  "flex flex-col items-center gap-0.5 rounded-md px-1 py-1 text-[11px] font-medium",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <item.icon className="size-5" />
                {item.title}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
