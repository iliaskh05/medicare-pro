import { useState, type FormEvent } from "react";
import { FileText, ImageIcon, Loader2, Mic, SendHorizonal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ChatMessageDto } from "@/lib/api/chat";

/** Zone de saisie isolée : ses rendus n'affectent pas la liste des messages. */
export function MessageInput({
  channelName,
  onSend,
}: {
  channelName: string;
  onSend: (body: string, attachment?: ChatMessageDto["attachment"]) => Promise<void>;
}) {
  const [value, setValue] = useState("");
  const [sending, setSending] = useState(false);

  const submit = async (body: string, attachment?: ChatMessageDto["attachment"]) => {
    if (sending) return;
    setSending(true);
    try {
      await onSend(body, attachment);
      setValue("");
    } finally {
      setSending(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return;
    void submit(value);
  };

  return (
    <form onSubmit={handleSubmit} className="border-t border-border bg-card px-3 py-3">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Joindre une photo"
          onClick={() =>
            void submit("", {
              kind: "image",
              url: "/favicon.png",
              caption: "Capture de série transmise",
            })
          }
        >
          <ImageIcon className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Envoyer une note vocale"
          onClick={() =>
            void submit("", { kind: "audio", durationSec: 12, transcript: "Note vocale" })
          }
        >
          <Mic className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Joindre un document"
          onClick={() =>
            void submit("", { kind: "file", name: "Compte_rendu.pdf", size: "184 Ko" })
          }
        >
          <FileText className="size-4" />
        </Button>
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
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
