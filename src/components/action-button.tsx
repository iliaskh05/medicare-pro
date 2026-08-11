import { type ComponentProps, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useAsyncAction } from "@/hooks/use-async-action";

type ToastKind = "success" | "info" | "warning" | "error";

const notifier = (kind: ToastKind) =>
  kind === "success"
    ? toast.success
    : kind === "error"
      ? toast.error
      : kind === "warning"
        ? toast.warning
        : toast.info;

/**
 * Bouton d'action asynchrone.
 *
 * Le spinner reflète l'état réel de la requête passée via `action`
 * (fonction retournant une promesse — appel HTTP vers le backend Java ou le
 * microservice Python). En cas d'échec, l'erreur est remontée en toast.
 */
export function ActionButton({
  action,
  toastMessage,
  toastDescription,
  toastKind = "success",
  errorMessage = "Action impossible pour le moment",
  onDone,
  children,
  disabled,
  ...props
}: Omit<ComponentProps<typeof Button>, "onClick"> & {
  /** Requête réelle à exécuter. Sans action, le bouton notifie simplement. */
  action?: () => Promise<unknown>;
  toastMessage: string;
  toastDescription?: string;
  toastKind?: ToastKind;
  errorMessage?: string;
  onDone?: () => void;
  children: ReactNode;
}) {
  const { run, isLoading } = useAsyncAction(
    async () => {
      if (action) await action();
    },
    {
      onSuccess: () => {
        notifier(toastKind)(
          toastMessage,
          toastDescription ? { description: toastDescription } : undefined,
        );
        onDone?.();
      },
      onError: (error) => toast.error(errorMessage, { description: error.message }),
    },
  );

  return (
    <Button {...props} disabled={disabled || isLoading} onClick={() => void run()}>
      {isLoading ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
      {children}
    </Button>
  );
}
