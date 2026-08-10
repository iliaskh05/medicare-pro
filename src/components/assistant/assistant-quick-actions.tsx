import { ArrowRight, MessageCircleQuestion } from "lucide-react";

import type { AssistantAction } from "@/lib/assistant-engine";

export function AssistantQuickActions({
  actions,
  onAction,
  label = "Actions rapides",
}: {
  actions: AssistantAction[];
  onAction: (action: AssistantAction) => void;
  label?: string;
}) {
  if (actions.length === 0) return null;

  return (
    <div className="space-y-1.5">
      <p className="px-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {actions.map((action) => (
          <button
            key={`${action.kind}-${action.label}`}
            type="button"
            onClick={() => onAction(action)}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-left text-xs font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {action.kind === "navigate" ? (
              <ArrowRight className="size-3.5 text-primary" aria-hidden="true" />
            ) : (
              <MessageCircleQuestion className="size-3.5 text-primary" aria-hidden="true" />
            )}
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
}
