import { useState, type FormEvent } from "react";
import { Loader2, SendHorizonal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** Zone de saisie isolée : texte uniquement (pièces jointes via API dédiée plus tard). */
export function MessageInput({
  channelName,
  onSend,
}: {
  channelName: string;
  onSend: (body: string) => Promise<void>;
}) {
  const [value, setValue] = useState("");
  const [sending, setSending] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || sending) return;
    setSending(true);
    void onSend(trimmed)
      .then(() => setValue(""))
      .finally(() => setSending(false));
  };

  return (
    <form onSubmit={handleSubmit} className="border-t border-border bg-card px-3 py-3">
      <div className="flex items-center gap-2">
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          maxLength={4000}
          aria-label={`Message pour le canal ${channelName}`}
          placeholder={`Message dans « ${channelName} »…`}
          className="flex-1"
        />
        <Button type="submit" disabled={sending || !value.trim()} aria-label="Envoyer le message">
          {sending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <SendHorizonal className="size-4" />
          )}
        </Button>
      </div>
    </form>
  );
}
