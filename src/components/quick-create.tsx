import { Link } from "@tanstack/react-router";
import { FileText, Plus, ScanLine, UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRole } from "@/hooks/use-role";

export function QuickCreateMenu() {
  const { canCreate, profile } = useRole();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" className="gap-1.5 shadow-none">
          <Plus className="size-4" />
          <span className="hidden sm:inline">Nouvelle action</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Créer</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {canCreate("patients") ? (
          <DropdownMenuItem asChild>
            <Link to="/patients" search={{ nouveau: "1" } as never}>
              <UserPlus className="mr-2 size-4" /> Nouveau patient
            </Link>
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem asChild>
          <Link to="/worklist">
            <ScanLine className="mr-2 size-4" /> Nouvel examen
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/comptes-rendus">
            <FileText className="mr-2 size-4" /> Compte rendu
          </Link>
        </DropdownMenuItem>
        {profile.canSeeFinance ? (
          <DropdownMenuItem asChild>
            <Link to="/facturation">
              <FileText className="mr-2 size-4" /> Facturation
            </Link>
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
