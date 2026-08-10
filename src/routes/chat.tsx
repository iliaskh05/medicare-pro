import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  FileText,
  Image as ImageIcon,
  Loader2,
  MessageSquare,
  Mic,
  Pause,
  Play,
  Radio,
  Send,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader, Pill } from "@/components/ui-kit";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useChatSocket, useEventSource } from "@/hooks/use-realtime";
import { apiFetch } from "@/lib/api-client";
import { useRole } from "@/hooks/use-role";
import {
  discussionsPrivees,
  groupesTravail,
  seedMessages,
  type ChatAttachment,
  type ChatChannel,
  type ChatSeedMessage,
} from "@/data/mock-chat";
import type { ChatMessage, ChatRoom } from "@/server/store/types";

export const Route = createFileRoute("/chat")({
  head: () => ({
    meta: [
      { title: "Messagerie interne — RadioCRM" },
      {
        name: "description",
        content:
          "Messagerie interne du centre de radiologie : discussions privées, groupes de travail, partage d'images, vocaux et comptes rendus PDF.",
      },
      { property: "og:title", content: "Messagerie interne — RadioCRM" },
      {
        property: "og:description",
        content:
          "Discussions privées et groupes de travail entre radiologues, techniciens et secrétariat.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:url", content: "https://maroc-med-hub.lovable.app/chat" },
    ],
    links: [{ rel: "canonical", href: "https://maroc-med-hub.lovable.app/chat" }],
  }),
  component: ChatPage,
});

/* ------------------------------- Sous-composants ------------------------------- */

function VoiceNote({
  durationSec,
  transcript,
  mine,
}: {
  durationSec: number;
  transcript: string;
  mine: boolean;
}) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!playing) {
      if (timer.current) clearInterval(timer.current);
      return;
    }
    timer.current = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          setPlaying(false);
          return 0;
        }
        return p + 100 / (durationSec * 5);
      });
    }, 200);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [playing, durationSec]);

  const elapsed = Math.round((progress / 100) * durationSec);
  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="flex w-64 items-center gap-3">
      <Button
        type="button"
        size="icon"
        variant={mine ? "secondary" : "default"}
        className="size-9 shrink-0 rounded-full shadow-sm"
        onClick={() => setPlaying((v) => !v)}
        aria-label={playing ? "Mettre en pause le message vocal" : "Écouter le message vocal"}
      >
        {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
      </Button>
      <div className="min-w-0 flex-1">
        <div
          className={cn(
            "h-1.5 overflow-hidden rounded-full",
            mine ? "bg-primary-foreground/25" : "bg-muted",
          )}
        >
          <div
            className={cn(
              "h-full rounded-full transition-all duration-200",
              mine ? "bg-primary-foreground" : "bg-primary",
            )}
            style={{ width: `${Math.min(100, progress)}%` }}
          />
        </div>
        <div className="mt-1 flex items-center justify-between text-[11px] opacity-80">
          <span className="truncate">{transcript}</span>
          <span className="ml-2 shrink-0 font-mono">
            {fmt(elapsed)} / {fmt(durationSec)}
          </span>
        </div>
      </div>
    </div>
  );
}

function AttachmentBubble({ attachment, mine }: { attachment: ChatAttachment; mine: boolean }) {
  if (attachment.kind === "image") {
    return (
      <figure className="mt-2 w-60 overflow-hidden rounded-xl border border-border/60 bg-background shadow-sm">
        <img
          src={attachment.url}
          alt={attachment.caption}
          loading="lazy"
          className="h-36 w-full object-cover"
        />
        <figcaption className="px-2.5 py-2 text-[11px] leading-tight text-muted-foreground">
          <span className="block font-semibold text-foreground">{attachment.caption}</span>
          {attachment.meta}
        </figcaption>
      </figure>
    );
  }

  if (attachment.kind === "audio") {
    return (
      <div className="mt-2">
        <VoiceNote
          durationSec={attachment.durationSec}
          transcript={attachment.transcript}
          mine={mine}
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => toast.success(`Ouverture du document ${attachment.name}`)}
      className="mt-2 flex w-64 items-center gap-3 rounded-xl border border-border/60 bg-background px-3 py-2.5 text-left shadow-sm transition-shadow hover:shadow-md"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
        <FileText className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-semibold text-foreground">
          {attachment.name}
        </span>
        <span className="block text-[11px] text-muted-foreground">
          PDF · {attachment.pages} page(s) · {attachment.size}
        </span>
      </span>
    </button>
  );
}

function ChannelButton({
  channel,
  active,
  onSelect,
  group,
}: {
  channel: ChatChannel;
  active: boolean;
  onSelect: () => void;
  group?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-all",
        active
          ? "border-primary/40 bg-primary/5 shadow-sm"
          : "border-transparent hover:border-border hover:bg-accent",
      )}
    >
      <div className="relative">
        <Avatar className="size-9">
          <AvatarFallback
            className={cn(
              "text-xs font-semibold",
              group ? "bg-primary/10 text-primary" : "bg-muted text-foreground",
            )}
          >
            {channel.initiales}
          </AvatarFallback>
        </Avatar>
        {channel.enLigne ? (
          <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-card bg-success" />
        ) : null}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{channel.name}</p>
        <p className="truncate text-xs text-muted-foreground">{channel.dernierMessage}</p>
      </div>
      {channel.nonLus > 0 ? (
        <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-destructive text-[11px] font-bold text-destructive-foreground">
          {channel.nonLus}
        </span>
      ) : null}
    </button>
  );
}

/* ---------------------------------- Page ---------------------------------- */

type LocalMessage = ChatSeedMessage;

function ChatPage() {
  const qc = useQueryClient();
  const { profile } = useRole();
  const [roomId, setRoomId] = useState("room-staff");
  const [body, setBody] = useState("");
  const [preferWs, setPreferWs] = useState(true);
  const [local, setLocal] = useState<LocalMessage[]>(seedMessages);
  const bottomRef = useRef<HTMLDivElement>(null);

  const senderId = `local-${profile.id}`;

  const channels = useMemo(() => [...groupesTravail, ...discussionsPrivees], []);
  const activeChannel = channels.find((c) => c.id === roomId) ?? channels[0]!;
  const isGroup = groupesTravail.some((g) => g.id === activeChannel.id);

  const roomsQuery = useQuery({
    queryKey: ["chat-rooms"],
    queryFn: () => apiFetch<{ rooms: ChatRoom[] }>("/api/chat/rooms"),
    retry: false,
  });

  const messagesQuery = useQuery({
    queryKey: ["chat-messages", roomId],
    queryFn: () =>
      apiFetch<{ messages: ChatMessage[] }>(
        `/api/chat/messages?roomId=${encodeURIComponent(roomId)}`,
      ),
    retry: false,
    refetchInterval: preferWs ? false : 8000,
  });

  const appendMessage = (msg: ChatMessage) => {
    qc.setQueryData<{ messages: ChatMessage[] }>(["chat-messages", roomId], (old) => {
      const list = old?.messages ?? [];
      if (list.some((m) => m.id === msg.id)) return old;
      return { messages: [...list, msg] };
    });
  };

  const { status, send } = useChatSocket(preferWs, roomId, (raw) => {
    const evt = raw as { type?: string; payload?: ChatMessage };
    if (evt.type === "chat.message" && evt.payload?.roomId === roomId) {
      appendMessage(evt.payload);
    }
  });

  const ssePath = preferWs && status === "open" ? null : `/api/chat/stream?roomId=${roomId}`;
  const { connected: sseConnected } = useEventSource(ssePath, (type, data) => {
    if (type === "chat.message") {
      const msg = data as ChatMessage;
      if (msg.roomId === roomId) appendMessage(msg);
    }
  });

  const remote = Array.isArray(messagesQuery.data?.messages) ? messagesQuery.data!.messages : [];

  const timeline = useMemo(() => {
    const merged: LocalMessage[] = [
      ...local.filter((m) => m.roomId === roomId),
      ...remote.map((m) => ({ ...m }) as LocalMessage),
    ];
    return merged.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [local, remote, roomId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [timeline.length, roomId]);

  const pushLocal = (partial: Partial<LocalMessage> & { body: string }) => {
    setLocal((prev) => [
      ...prev,
      {
        id: `local-${Date.now()}`,
        roomId,
        senderId,
        senderName: profile.nom,
        createdAt: new Date().toISOString(),
        ...partial,
      },
    ]);
  };

  const sendMut = useMutation({
    mutationFn: async () => {
      const text = body.trim();
      if (!text) throw new Error("Message vide");
      if (preferWs && send({ type: "chat.send", roomId, senderId, body: text })) {
        return null;
      }
      pushLocal({ body: text });
      return null;
    },
    onSuccess: () => setBody(""),
    onError: (e: Error) => toast.error(e.message),
  });

  const joindre = (kind: ChatAttachment["kind"]) => {
    if (kind === "image") {
      const modele = seedMessages.find((m) => m.attachment?.kind === "image")?.attachment;
      if (modele && modele.kind === "image") {
        pushLocal({
          body: "Capture PACS partagée pour avis.",
          attachment: {
            kind: "image",
            url: modele.url,
            caption: "Capture PACS",
            meta: "Partagée depuis la console de lecture",
          },
        });
      }
      toast.success("Image partagée dans la conversation");
      return;
    }
    if (kind === "audio") {
      pushLocal({
        body: "Message vocal",
        attachment: { kind: "audio", durationSec: 21, transcript: "Nouveau message vocal" },
      });
      toast.success("Message vocal envoyé (21 s)");
      return;
    }
    pushLocal({
      body: "Document partagé",
      attachment: {
        kind: "file",
        name: "Protocole_injection_scanner.pdf",
        size: "184 Ko",
        pages: 3,
      },
    });
    toast.success("Document PDF joint à la conversation");
  };

  const transportLabel = useMemo(() => {
    if (preferWs && status === "open") return "WebSocket";
    if (sseConnected) return "SSE";
    if (preferWs && status === "connecting") return "Connexion WS…";
    return "Mode démo local";
  }, [preferWs, status, sseConnected]);

  const membres = roomsQuery.data?.rooms?.find((r) => r.id === roomId)?.members?.length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Messagerie interne"
        subtitle="Discussions privées et groupes de travail — radiologues, techniciens & direction"
        actions={
          <div className="flex items-center gap-2">
            <Pill
              tone={
                transportLabel === "WebSocket" || transportLabel === "SSE" ? "success" : "warning"
              }
            >
              <Radio className="mr-1 size-3" />
              {transportLabel}
            </Pill>
            <Button variant="outline" size="sm" onClick={() => setPreferWs((v) => !v)}>
              {preferWs ? "Forcer SSE" : "Essayer WS"}
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Conversations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 px-3">
            <div className="space-y-1.5">
              <p className="flex items-center gap-1.5 px-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                <Users className="size-3.5" /> Groupes de travail
              </p>
              {groupesTravail.map((g) => (
                <ChannelButton
                  key={g.id}
                  channel={g}
                  group
                  active={roomId === g.id}
                  onSelect={() => setRoomId(g.id)}
                />
              ))}
            </div>

            <Separator />

            <div className="space-y-1.5">
              <p className="flex items-center gap-1.5 px-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                <MessageSquare className="size-3.5" /> Discussions privées
              </p>
              {discussionsPrivees.map((d) => (
                <ChannelButton
                  key={d.id}
                  channel={d}
                  active={roomId === d.id}
                  onSelect={() => setRoomId(d.id)}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        <Card data-tour="chat-thread" className="flex min-h-[580px] flex-col shadow-sm">
          <CardHeader className="flex-row items-center justify-between space-y-0 border-b border-border pb-4">
            <div className="flex items-center gap-3">
              <Avatar className="size-10">
                <AvatarFallback
                  className={cn(
                    "text-sm font-semibold",
                    isGroup ? "bg-primary/10 text-primary" : "bg-muted",
                  )}
                >
                  {activeChannel.initiales}
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-base">{activeChannel.name}</CardTitle>
                <p className="text-xs text-muted-foreground">
                  {activeChannel.subtitle}
                  {membres ? ` · ${membres} connectés` : ""}
                </p>
              </div>
            </div>
            <Pill tone={isGroup ? "primary" : "success"}>
              {isGroup ? "Groupe de travail" : activeChannel.enLigne ? "En ligne" : "Hors ligne"}
            </Pill>
          </CardHeader>

          <CardContent className="flex flex-1 flex-col gap-4 pt-4">
            <ScrollArea className="h-[400px] rounded-xl border border-border bg-muted/20 p-4">
              <div className="space-y-4">
                {messagesQuery.isLoading ? (
                  <p className="text-sm text-muted-foreground">Chargement des messages…</p>
                ) : null}

                {timeline.map((m) => {
                  const mine = m.senderId === senderId;
                  return (
                    <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                      <div
                        className={cn(
                          "max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm shadow-sm",
                          mine
                            ? "bg-primary text-primary-foreground"
                            : "border border-border bg-card text-foreground",
                        )}
                      >
                        {!mine ? (
                          <p className="text-[11px] font-semibold opacity-70">{m.senderName}</p>
                        ) : null}
                        <p className="mt-0.5 whitespace-pre-wrap leading-relaxed">{m.body}</p>
                        {m.attachment ? (
                          <AttachmentBubble attachment={m.attachment} mine={mine} />
                        ) : null}
                        <p className="mt-1.5 text-[10px] opacity-60">
                          {new Date(m.createdAt).toLocaleTimeString("fr-MA", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  );
                })}

                {timeline.length === 0 && !messagesQuery.isLoading ? (
                  <p className="text-sm text-muted-foreground">
                    Aucun message dans cette conversation.
                  </p>
                ) : null}
                <div ref={bottomRef} />
              </div>
            </ScrollArea>

            <form
              className="flex items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                sendMut.mutate();
              }}
            >
              <TooltipProvider delayDuration={200}>
                <div className="flex items-center gap-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Joindre une image"
                        onClick={() => joindre("image")}
                      >
                        <ImageIcon className="size-5 text-primary" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Joindre une image / capture PACS</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Enregistrer un message vocal"
                        onClick={() => joindre("audio")}
                      >
                        <Mic className="size-5 text-success" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Dictée / message vocal</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Joindre un document PDF"
                        onClick={() => joindre("file")}
                      >
                        <FileText className="size-5 text-destructive" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Joindre un compte rendu PDF</TooltipContent>
                  </Tooltip>
                </div>
              </TooltipProvider>

              <Input
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Écrire un message clinique…"
                aria-label="Écrire un message"
                className="h-10 bg-background"
              />
              <Button
                type="submit"
                size="icon"
                className="size-10 shrink-0 shadow-sm"
                aria-label="Envoyer le message"
                disabled={sendMut.isPending || !body.trim()}
              >
                {sendMut.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
