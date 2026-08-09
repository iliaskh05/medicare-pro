import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Loader2, MessageSquare, Radio, Send } from "lucide-react";
import { toast } from "sonner";

import { PageHeader, Pill } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useChatSocket, useEventSource } from "@/hooks/use-realtime";
import { apiFetch } from "@/lib/api-client";
import type { ChatMessage, ChatRoom, ChatUser } from "@/server/store/types";

export const Route = createFileRoute("/chat")({
  head: () => ({
    meta: [
      { title: "Chat médecins — RadioCRM" },
      {
        name: "description",
        content: "Messagerie interne temps réel entre médecins et techniciens (WebSocket + SSE).",
      },
    ],
  }),
  component: ChatPage,
});

function ChatPage() {
  const qc = useQueryClient();
  const [roomId, setRoomId] = useState("room-staff");
  const [senderId, setSenderId] = useState("doc-skalli");
  const [body, setBody] = useState("");
  const [preferWs, setPreferWs] = useState(true);

  const roomsQuery = useQuery({
    queryKey: ["chat-rooms"],
    queryFn: () =>
      apiFetch<{ rooms: ChatRoom[]; doctors: ChatUser[] }>("/api/chat/rooms"),
  });

  const messagesQuery = useQuery({
    queryKey: ["chat-messages", roomId],
    queryFn: () =>
      apiFetch<{ messages: ChatMessage[] }>(
        `/api/chat/messages?roomId=${encodeURIComponent(roomId)}`,
      ),
    refetchInterval: preferWs ? false : 8000,
  });

  const messages = messagesQuery.data?.messages ?? [];
  const rooms = roomsQuery.data?.rooms ?? [];
  const doctors = roomsQuery.data?.doctors ?? [];

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

  useEffect(() => {
    if (preferWs && status === "closed") {
      // silent fallback to SSE
    }
  }, [preferWs, status]);

  const sendMut = useMutation({
    mutationFn: async () => {
      const text = body.trim();
      if (!text) throw new Error("Message vide");
      if (preferWs && send({ type: "chat.send", roomId, senderId, body: text })) {
        return null;
      }
      return apiFetch<ChatMessage>("/api/chat/messages", {
        method: "POST",
        body: JSON.stringify({ roomId, senderId, body: text }),
      });
    },
    onSuccess: (msg) => {
      setBody("");
      if (msg) appendMessage(msg);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const transportLabel = useMemo(() => {
    if (preferWs && status === "open") return "WebSocket";
    if (sseConnected) return "SSE";
    if (preferWs && status === "connecting") return "Connexion WS…";
    return "Hors ligne";
  }, [preferWs, status, sseConnected]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Chat interne"
        subtitle="Salon médecins / techniciens — temps réel via WebSocket (fallback SSE)"
        actions={
          <div className="flex items-center gap-2">
            <Pill tone={transportLabel === "WebSocket" || transportLabel === "SSE" ? "success" : "warning"}>
              <Radio className="mr-1 size-3" />
              {transportLabel}
            </Pill>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPreferWs((v) => !v)}
            >
              {preferWs ? "Forcer SSE" : "Essayer WS"}
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Salons</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {rooms.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setRoomId(r.id)}
                className={`w-full rounded-lg border px-3 py-2 text-left ${
                  roomId === r.id ? "border-primary bg-primary/5" : "border-border"
                }`}
              >
                <p className="text-sm font-semibold">{r.name}</p>
                <p className="text-xs text-muted-foreground">{r.members.length} membres</p>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card className="shadow-none flex min-h-[520px] flex-col">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="size-4" />
              {rooms.find((r) => r.id === roomId)?.name ?? "Salon"}
            </CardTitle>
            <Select value={senderId} onValueChange={setSenderId}>
              <SelectTrigger className="w-56">
                <SelectValue placeholder="Identité" />
              </SelectTrigger>
              <SelectContent>
                {doctors.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-3">
            <div className="flex-1 space-y-3 overflow-y-auto rounded-lg border border-border bg-muted/20 p-3">
              {messagesQuery.isLoading ? (
                <p className="text-sm text-muted-foreground">Chargement des messages…</p>
              ) : null}
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                    m.senderId === senderId
                      ? "ml-auto bg-primary text-primary-foreground"
                      : "bg-background border border-border"
                  }`}
                >
                  <p className="text-[11px] font-semibold opacity-80">{m.senderName}</p>
                  <p className="mt-0.5 whitespace-pre-wrap">{m.body}</p>
                  <p className="mt-1 text-[10px] opacity-70">
                    {new Date(m.createdAt).toLocaleTimeString("fr-MA", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {m.studyId ? ` · ${m.studyId}` : ""}
                  </p>
                </div>
              ))}
              {messages.length === 0 && !messagesQuery.isLoading ? (
                <p className="text-sm text-muted-foreground">Aucun message dans ce salon.</p>
              ) : null}
            </div>

            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                sendMut.mutate();
              }}
            >
              <Input
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Écrire un message clinique…"
              />
              <Button type="submit" disabled={sendMut.isPending || !body.trim()}>
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
