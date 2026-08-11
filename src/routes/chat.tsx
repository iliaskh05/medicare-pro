import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Hash, Radio, Users } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { PageHeader, Pill } from "@/components/ui-kit";
import { MessageList } from "@/components/chat/message-list";
import { MessageInput } from "@/components/chat/message-input";
import { channels } from "@/data/chat-channels";
import { useChatChannel } from "@/hooks/use-chat-channel";
import { useRole } from "@/hooks/use-role";
import type { ChannelId } from "@/lib/api/chat";

export const Route = createFileRoute("/chat")({
  head: () => ({
    meta: [
      { title: "Messagerie interne du centre — RadioCRM" },
      {
        name: "description",
        content:
          "Messagerie interne temps réel du centre d'imagerie : canaux Accueil - Médecins, Techniciens - Médecins et Général.",
      },
      { property: "og:title", content: "Messagerie interne du centre — RadioCRM" },
      {
        property: "og:description",
        content: "Canaux internes du centre d'imagerie médicale, prêts pour le temps réel.",
      },
    ],
  }),
  component: ChatPage,
});

function ChatPage() {
  const { profile } = useRole();
  const [channelId, setChannelId] = useState<ChannelId>("accueil-medecins");
  const author = {
    id: `me-${profile.id}`,
    name: profile.nom,
    role: profile.label.split(" (")[0] ?? profile.label,
  };
  const { messages, status, isLoading, sendMessage } = useChatChannel(channelId, author);
  const active = channels.find((c) => c.id === channelId) ?? channels[0]!;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Messagerie interne"
        subtitle="Canaux du centre d'imagerie médicale — coordination accueil, techniciens et médecins"
        actions={
          <Pill tone={status === "open" ? "success" : "neutral"}>
            <Radio className="size-3.5" />
            {status === "open"
              ? "Temps réel connecté"
              : status === "connecting"
                ? "Connexion…"
                : "Mode hors temps réel"}
          </Pill>
        }
      />

      <div data-tour="chat" className="grid gap-4 lg:grid-cols-[18rem_1fr]">
        <Card className="h-fit">
          <CardContent className="space-y-1.5 p-3">
            <p className="px-2 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Canaux
            </p>
            {channels.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setChannelId(c.id)}
                aria-current={c.id === channelId}
                className={`w-full rounded-lg border px-3 py-2.5 text-left transition-colors ${
                  c.id === channelId
                    ? "border-primary/40 bg-primary/10"
                    : "border-transparent hover:bg-accent"
                }`}
              >
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <Hash className="size-4 shrink-0 text-primary" />
                  <span className="truncate">{c.name}</span>
                </span>
                <span className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <Users className="size-3.5" /> {c.membersCount} membres
                </span>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card className="flex h-[34rem] min-w-0 flex-col overflow-hidden">
          <header className="border-b border-border px-4 py-3">
            <h2 className="truncate text-sm font-bold tracking-tight">{active.name}</h2>
            <p className="truncate text-xs text-muted-foreground">{active.description}</p>
          </header>
          <MessageList messages={messages} currentAuthorId={author.id} isLoading={isLoading} />
          <MessageInput channelName={active.name} onSend={sendMessage} />
        </Card>
      </div>
    </div>
  );
}
