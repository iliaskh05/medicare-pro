import { Bot } from "lucide-react";

import { cn } from "@/lib/utils";

export function AssistantLauncher({
  onClick,
  className,
}: {
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Ouvrir l'Assistant RadioCRM"
      className={cn(
        "fixed bottom-5 right-5 z-40 flex h-12 items-center gap-2 rounded-full bg-primary pl-3.5 pr-4 text-sm font-semibold text-primary-foreground shadow-elevated transition-transform hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className,
      )}
    >
      <span className="relative flex size-7 items-center justify-center rounded-full bg-primary-foreground/15">
        <Bot className="size-4" aria-hidden="true" />
        <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full border-2 border-primary bg-success" />
      </span>
      <span className="hidden sm:inline">Assistant RadioCRM</span>
    </button>
  );
}
