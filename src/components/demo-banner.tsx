import { FlaskConical } from "lucide-react";

/**
 * Bandeau de sécurité démo affiché dans le shell authentifié.
 * Rappelle que l'ensemble des données du prototype sont fictives.
 */
export function DemoBanner() {
  return (
    <div
      role="note"
      className="flex items-start gap-2 border-b border-warning/30 bg-warning/12 px-3 py-2 text-xs font-medium text-warning-foreground sm:px-6"
    >
      <FlaskConical className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <p>
        Prototype de démonstration — données entièrement fictives — ne pas utiliser avec des données
        médicales réelles.
      </p>
    </div>
  );
}
