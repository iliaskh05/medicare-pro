import { useRef, useState, type ComponentProps, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

type ToastKind = "success" | "info" | "warning" | "error";

/**
 * Bouton de démonstration : au clic il affiche un spinner pendant `delay` ms,
 * puis déclenche un toast. Utilisé pour les actions dont le back-office
 * n'est pas encore branché (règle « zéro clic mort »).
 */
export function ActionButton({
  toastMessage,
  toastDescription,
  toastKind = "success",
  delay = 1500,
  onDone,
  children,
  disabled,
  ...props
}: Omit<ComponentProps<typeof Button>, "onClick"> & {
  toastMessage: string;
  toastDescription?: string;
  toastKind?: ToastKind;
  delay?: number;
  onDone?: () => void;
  children: ReactNode;
}) {
  const [loading, setLoading] = useState(false);
  const timer = useRef<number | null>(null);

  const handleClick = () => {
    if (loading) return;
    setLoading(true);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      setLoading(false);
      const notify =
        toastKind === "success"
          ? toast.success
          : toastKind === "error"
            ? toast.error
            : toastKind === "warning"
              ? toast.warning
              : toast.info;
      notify(toastMessage, toastDescription ? { description: toastDescription } : undefined);
      onDone?.();
    }, delay);
  };

  return (
    <Button {...props} disabled={disabled || loading} onClick={handleClick}>
      {loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
      {children}
    </Button>
  );
}
