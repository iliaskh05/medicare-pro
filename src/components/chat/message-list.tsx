import { memo, useEffect, useRef, useState } from "react";
import { FileText, Loader2, X } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { fetchChatFileBlob, type ChatMessageDto } from "@/lib/api/chat";

const initials = (nom: string) =>
  nom
    .replace("Dr. ", "")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("");

const heure = (iso: string) =>
  new Date(iso).toLocaleTimeString("fr-MA", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Casablanca",
  });

function formatSize(bytes?: number | null) {
  if (bytes == null || bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function AuthImage({
  fileUrl,
  alt,
  onEnlarge,
}: {
  fileUrl: string;
  alt: string;
  onEnlarge: (src: string) => void;
}) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;
    setFailed(false);
    setSrc(null);
    fetchChatFileBlob(fileUrl)
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [fileUrl]);

  if (failed) {
    return <p className="mt-2 text-xs text-muted-foreground">Image indisponible</p>;
  }
  if (!src) {
    return (
      <div className="mt-2 flex h-32 items-center justify-center rounded-lg border border-border bg-muted/30">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  return (
    <button
      type="button"
      className="mt-2 block w-full overflow-hidden rounded-lg border border-border text-left"
      onClick={() => onEnlarge(src)}
    >
      <img src={src} alt={alt} loading="lazy" className="max-h-56 w-full object-cover" />
    </button>
  );
}

function PdfAttachment({
  fileUrl,
  fileName,
  fileSize,
}: {
  fileUrl: string;
  fileName: string;
  fileSize?: number | null;
}) {
  const [busy, setBusy] = useState(false);

  const open = async () => {
    setBusy(true);
    try {
      const blob = await fetchChatFileBlob(fileUrl);
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      /* toast optional */
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={() => void open()}
      disabled={busy}
      className="mt-2 flex w-full items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-left text-xs font-medium hover:border-primary/40"
    >
      <FileText className="size-4 shrink-0 text-primary" />
      <span className="min-w-0 flex-1 truncate">{fileName}</span>
      <span className="shrink-0 text-muted-foreground">
        {busy ? "…" : formatSize(fileSize) || "PDF"}
      </span>
    </button>
  );
}

function AuthAudio({
  fileUrl,
  durationSeconds,
}: {
  fileUrl: string;
  durationSeconds?: number | null;
}) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;
    setFailed(false);
    setSrc(null);
    fetchChatFileBlob(fileUrl)
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [fileUrl]);

  if (failed) {
    return <p className="mt-2 text-xs text-muted-foreground">Audio indisponible</p>;
  }
  if (!src) {
    return (
      <div className="mt-2 flex h-10 items-center justify-center rounded-lg border border-border bg-muted/30">
        <Loader2 className="size-4 animate-spin text-muted-foreground" />
      </div>
    );
  }
  return (
    <div className="mt-2 space-y-1">
      <audio src={src} controls preload="metadata" className="w-full max-w-xs" />
      {durationSeconds != null && durationSeconds > 0 ? (
        <p className="text-[11px] text-muted-foreground">{durationSeconds}s</p>
      ) : null}
    </div>
  );
}

/**
 * Liste des messages — composant isolé de la saisie.
 */
export const MessageList = memo(function MessageList({
  messages,
  currentAuthorId,
  isLoading,
}: {
  messages: ChatMessageDto[];
  currentAuthorId: string;
  isLoading?: boolean;
}) {
  const endRef = useRef<HTMLDivElement>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  return (
    <>
      <div
        className="flex-1 space-y-3 overflow-y-auto bg-muted/20 px-4 py-4"
        role="log"
        aria-live="polite"
        aria-label="Historique des messages du canal"
      >
        {isLoading && messages.length === 0 ? (
          <p className="text-sm text-muted-foreground">Chargement de l&apos;historique…</p>
        ) : null}
        {!isLoading && messages.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Aucun message — démarrez la conversation.
          </p>
        ) : null}
        {messages.map((m) => {
          const mine = m.authorId === currentAuthorId;
          const type = m.messageType ?? "TEXT";
          return (
            <article key={m.id} className={`flex gap-2.5 ${mine ? "flex-row-reverse" : ""}`}>
              <Avatar className="size-8 shrink-0">
                <AvatarFallback className="bg-primary/10 text-[11px] font-semibold text-primary">
                  {initials(m.authorName)}
                </AvatarFallback>
              </Avatar>
              <div className={`min-w-0 max-w-[min(30rem,80%)] ${mine ? "text-right" : ""}`}>
                <p className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">{m.authorName}</span>
                  <time dateTime={m.createdAt}>{heure(m.createdAt)}</time>
                </p>
                <div
                  className={`mt-1 inline-block w-full rounded-2xl border px-3.5 py-2.5 text-left text-sm shadow-sm ${
                    mine
                      ? "rounded-br-md border-primary/25 bg-primary/10"
                      : "rounded-bl-md border-border bg-card"
                  }`}
                >
                  {m.body ? <p className="whitespace-pre-wrap break-words">{m.body}</p> : null}
                  {type === "IMAGE" && m.fileUrl ? (
                    <AuthImage
                      fileUrl={m.fileUrl}
                      alt={m.fileName || "Image"}
                      onEnlarge={setLightbox}
                    />
                  ) : null}
                  {type === "PDF" && m.fileUrl ? (
                    <PdfAttachment
                      fileUrl={m.fileUrl}
                      fileName={m.fileName || "document.pdf"}
                      fileSize={m.fileSize}
                    />
                  ) : null}
                  {type === "AUDIO" && m.fileUrl ? (
                    <AuthAudio fileUrl={m.fileUrl} durationSeconds={m.durationSeconds} />
                  ) : null}
                </div>
              </div>
            </article>
          );
        })}
        <div ref={endRef} />
      </div>

      {lightbox ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setLightbox(null)}
        >
          <Button
            type="button"
            size="icon"
            variant="secondary"
            className="absolute right-4 top-4"
            onClick={() => setLightbox(null)}
          >
            <X className="size-4" />
          </Button>
          <img
            src={lightbox}
            alt="Aperçu"
            className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      ) : null}
    </>
  );
});
