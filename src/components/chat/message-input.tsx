import { useEffect, useRef, useState, type FormEvent } from "react";
import { FileUp, ImagePlus, Loader2, Mic, SendHorizonal, Square, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** Zone de saisie : texte + image + PDF + audio. */
export function MessageInput({
  channelName,
  onSend,
  onSendFile,
  uploadProgress,
}: {
  channelName: string;
  onSend: (body: string) => Promise<void>;
  onSendFile: (file: File, caption?: string, durationSeconds?: number) => Promise<void>;
  uploadProgress?: string | null;
}) {
  const [value, setValue] = useState("");
  const [sending, setSending] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingDuration, setPendingDuration] = useState<number | undefined>();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [recSeconds, setRecSeconds] = useState(0);
  const imageRef = useRef<HTMLInputElement>(null);
  const pdfRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const recTimerRef = useRef<number | null>(null);
  const recStartedAtRef = useRef(0);

  useEffect(() => {
    if (!pendingFile) {
      setPreviewUrl(null);
      return;
    }
    if (pendingFile.type.startsWith("image/") || pendingFile.type.startsWith("audio/")) {
      const url = URL.createObjectURL(pendingFile);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setPreviewUrl(null);
  }, [pendingFile]);

  useEffect(() => {
    return () => {
      stopRecorderCleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const busy = sending || Boolean(uploadProgress) || recording;

  const stopRecorderCleanup = () => {
    if (recTimerRef.current != null) {
      window.clearInterval(recTimerRef.current);
      recTimerRef.current = null;
    }
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const pickFile = (file: File | undefined) => {
    if (!file) return;
    const isImg = file.type.startsWith("image/");
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (!isImg && !isPdf) {
      toast.error("Formats acceptés : images (JPEG, PNG, WebP, GIF) ou PDF");
      return;
    }
    setPendingDuration(undefined);
    setPendingFile(file);
  };

  const clearPending = () => {
    setPendingFile(null);
    setPendingDuration(undefined);
  };

  const startRecording = async () => {
    if (busy || pendingFile) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error("Enregistrement audio non supporté sur ce navigateur");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "";
      const recorder = mime
        ? new MediaRecorder(stream, { mimeType: mime })
        : new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const durationSec = Math.max(
          1,
          Math.round((Date.now() - recStartedAtRef.current) / 1000),
        );
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        if (blob.size < 200) {
          toast.error("Enregistrement trop court");
          setRecording(false);
          setRecSeconds(0);
          return;
        }
        const ext = blob.type.includes("ogg") ? "ogg" : "webm";
        const file = new File([blob], `vocal-${Date.now()}.${ext}`, {
          type: blob.type || "audio/webm",
        });
        setPendingFile(file);
        setPendingDuration(durationSec);
        setRecording(false);
        setRecSeconds(0);
      };
      mediaRecorderRef.current = recorder;
      recStartedAtRef.current = Date.now();
      setRecSeconds(0);
      setRecording(true);
      recorder.start(250);
      recTimerRef.current = window.setInterval(() => {
        setRecSeconds(Math.floor((Date.now() - recStartedAtRef.current) / 1000));
      }, 250);
    } catch {
      toast.error("Micro inaccessible — autorisez l'accès micro");
    }
  };

  const stopRecording = () => {
    if (recTimerRef.current != null) {
      window.clearInterval(recTimerRef.current);
      recTimerRef.current = null;
    }
    const rec = mediaRecorderRef.current;
    if (rec && rec.state !== "inactive") {
      rec.stop();
    }
    mediaRecorderRef.current = null;
  };

  const cancelRecording = () => {
    if (recTimerRef.current != null) {
      window.clearInterval(recTimerRef.current);
      recTimerRef.current = null;
    }
    const rec = mediaRecorderRef.current;
    mediaRecorderRef.current = null;
    if (rec) {
      rec.ondataavailable = null;
      rec.onstop = () => {
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      };
      if (rec.state !== "inactive") rec.stop();
    } else {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setRecording(false);
    setRecSeconds(0);
    chunksRef.current = [];
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (busy && !pendingFile) return;
    if (recording) return;

    if (pendingFile) {
      setSending(true);
      void onSendFile(pendingFile, value.trim() || undefined, pendingDuration)
        .then(() => {
          setValue("");
          clearPending();
        })
        .catch((err: unknown) => {
          toast.error(err instanceof Error ? err.message : "Envoi fichier impossible");
        })
        .finally(() => setSending(false));
      return;
    }

    const trimmed = value.trim();
    if (!trimmed) return;
    setSending(true);
    void onSend(trimmed)
      .then(() => setValue(""))
      .catch((err: unknown) => {
        toast.error(err instanceof Error ? err.message : "Envoi impossible");
      })
      .finally(() => setSending(false));
  };

  const formatRec = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  return (
    <form onSubmit={handleSubmit} className="border-t border-border bg-card px-3 py-3">
      {recording ? (
        <div className="mb-2 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-2 py-1.5 text-xs">
          <span className="size-2 animate-pulse rounded-full bg-destructive" />
          <span className="font-medium tabular-nums">Enregistrement {formatRec(recSeconds)}</span>
          <div className="ml-auto flex gap-1">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="size-7"
              onClick={cancelRecording}
              aria-label="Annuler"
            >
              <Trash2 className="size-3.5" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="secondary"
              className="size-7"
              onClick={stopRecording}
              aria-label="Arrêter"
            >
              <Square className="size-3.5" />
            </Button>
          </div>
        </div>
      ) : null}
      {pendingFile ? (
        <div className="mb-2 flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-2 py-1.5 text-xs">
          {previewUrl && pendingFile.type.startsWith("image/") ? (
            <img src={previewUrl} alt="" className="size-10 rounded object-cover" />
          ) : previewUrl && pendingFile.type.startsWith("audio/") ? (
            <audio src={previewUrl} controls className="h-8 max-w-[12rem]" />
          ) : (
            <FileUp className="size-4 text-primary" />
          )}
          <span className="min-w-0 flex-1 truncate font-medium">
            {pendingFile.name}
            {pendingDuration ? ` · ${formatRec(pendingDuration)}` : ""}
          </span>
          <Button type="button" size="icon" variant="ghost" className="size-7" onClick={clearPending}>
            <X className="size-3.5" />
          </Button>
        </div>
      ) : null}
      {uploadProgress ? (
        <p className="mb-2 text-xs text-muted-foreground">Envoi de {uploadProgress}…</p>
      ) : null}
      <div className="flex items-center gap-1.5">
        <input
          ref={imageRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={(e) => {
            pickFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <input
          ref={pdfRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={(e) => {
            pickFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="size-9 shrink-0"
          disabled={busy || Boolean(pendingFile)}
          aria-label="Joindre une photo"
          title="Joindre une photo"
          onClick={() => imageRef.current?.click()}
        >
          <ImagePlus className="size-4" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="size-9 shrink-0"
          disabled={busy || Boolean(pendingFile)}
          aria-label="Joindre un PDF"
          title="Joindre un PDF"
          onClick={() => pdfRef.current?.click()}
        >
          <FileUp className="size-4" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant={recording ? "destructive" : "ghost"}
          className="size-9 shrink-0"
          disabled={sending || Boolean(uploadProgress) || Boolean(pendingFile)}
          aria-label={recording ? "Arrêter l'enregistrement" : "Message vocal"}
          title="Message vocal"
          onClick={() => (recording ? stopRecording() : void startRecording())}
        >
          <Mic className="size-4" />
        </Button>
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          maxLength={4000}
          aria-label={`Message pour le canal ${channelName}`}
          placeholder={
            pendingFile
              ? pendingFile.type.startsWith("audio/")
                ? "Légende (optionnel)…"
                : "Légende (optionnel)…"
              : recording
                ? "Enregistrement en cours…"
                : `Message dans « ${channelName} »…`
          }
          className="flex-1"
          disabled={busy && !pendingFile}
        />
        <Button
          type="submit"
          disabled={recording || sending || Boolean(uploadProgress) || (!value.trim() && !pendingFile)}
          aria-label="Envoyer le message"
        >
          {sending || uploadProgress ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <SendHorizonal className="size-4" />
          )}
        </Button>
      </div>
    </form>
  );
}
