import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, MessageCircle, RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, PageHeader, ServiceNotice } from "@/components/ui-kit";
import { WaChatThread } from "@/components/whatsapp/wa-chat-thread";
import { WaContextPanel } from "@/components/whatsapp/wa-context-panel";
import { WaConversationList } from "@/components/whatsapp/wa-conversation-list";
import { fetchWaConversations, sendWaMessage } from "@/lib/api/whatsapp";
import {
  waStatutLabel,
  type WaConversation,
  type WaMessage,
  type WaQuickReply,
  type WaStatut,
} from "@/types/whatsapp";

export const Route = createFileRoute("/whatsapp")({
  head: () => ({
    meta: [
      { title: "Chatbot WhatsApp patients — Centre d'Imagerie Médicale" },
      {
        name: "description",
        content:
          "Console WhatsApp du centre d'imagerie : prise de rendez-vous, préparation d'examen, questions mutuelle, rappels et transfert au secrétariat.",
      },
      { property: "og:title", content: "Chatbot WhatsApp patients — Centre d'Imagerie Médicale" },
      {
        property: "og:description",
        content: "Console de supervision des conversations WhatsApp avec les patients.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: WhatsAppPage,
});

function WhatsAppSkeleton() {
  return (
    <div className="grid h-[calc(100dvh-18rem)] min-h-[560px] grid-cols-1 gap-px overflow-hidden lg:grid-cols-[320px_1fr]">
      <div className="space-y-3 p-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
      <div className="hidden space-y-3 p-4 lg:block">
        <Skeleton className="h-12 w-2/3 rounded-lg" />
        <Skeleton className="h-12 w-1/2 rounded-lg" />
        <Skeleton className="h-12 w-3/5 rounded-lg" />
      </div>
    </div>
  );
}

function WhatsAppPage() {
  const [conversations, setConversations] = useState<WaConversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string>("");
  const [query, setQuery] = useState("");
  const [filtre, setFiltre] = useState<"toutes" | WaStatut>("toutes");
  const [draft, setDraft] = useState("");
  const [modeAgent, setModeAgent] = useState(false);
  const [vueMobile, setVueMobile] = useState<"liste" | "conversation">("liste");
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);
    fetchWaConversations(controller.signal)
      .then((rows) => {
        setConversations(rows);
        setActiveId((prev) => prev || (rows[0]?.id ?? ""));
      })
      .catch((e: unknown) => {
        if (controller.signal.aborted) return;
        setError(
          e instanceof Error ? e.message : "Impossible de charger les conversations WhatsApp.",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });
    return () => controller.abort();
  }, [reloadToken]);

  const liste = useMemo(() => {
    const q = query.trim().toLowerCase();
    return conversations.filter((c) => {
      const matchQuery =
        !q ||
        c.patient.toLowerCase().includes(q) ||
        c.telephone.includes(q) ||
        c.apercu.toLowerCase().includes(q);
      const matchFiltre = filtre === "toutes" || c.statut === filtre;
      return matchQuery && matchFiltre;
    });
  }, [conversations, query, filtre]);

  const active = conversations.find((c) => c.id === activeId) ?? liste[0] ?? conversations[0];

  const envoyer = async () => {
    const texte = draft.trim();
    if (!texte || !active) return;
    setDraft("");
    setEnvoiEnCours(true);
    try {
      const message: WaMessage = await sendWaMessage(active.id, texte);
      setConversations((prev) =>
        prev.map((c) =>
          c.id === active.id
            ? {
                ...c,
                messages: [...c.messages, message],
                apercu: message.texte.split("\n")[0] ?? c.apercu,
                derniereHeure: message.heure ?? c.derniereHeure,
              }
            : c,
        ),
      );
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Échec de l'envoi du message.");
      setDraft(texte);
    } finally {
      setEnvoiEnCours(false);
    }
  };

  const handleQuickReply = async (reply: WaQuickReply) => {
    if (!active) return;
    setEnvoiEnCours(true);
    try {
      const message = await sendWaMessage(active.id, reply.payload);
      setConversations((prev) =>
        prev.map((c) =>
          c.id === active.id
            ? {
                ...c,
                messages: [...c.messages, message],
                apercu: message.texte.split("\n")[0] ?? c.apercu,
                derniereHeure: message.heure ?? c.derniereHeure,
              }
            : c,
        ),
      );
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Échec de l'envoi de la réponse rapide.");
    } finally {
      setEnvoiEnCours(false);
    }
  };

  const handleStatut = (statut: WaStatut) => {
    if (!active) return;
    setConversations((prev) => prev.map((c) => (c.id === active.id ? { ...c, statut } : c)));
    setModeAgent(statut === "secretariat");
    toast.info(`Statut mis à jour : ${waStatutLabel[statut]}.`);
  };

  const selectionner = (id: string) => {
    setActiveId(id);
    setVueMobile("conversation");
    setModeAgent(conversations.find((c) => c.id === id)?.statut === "secretariat");
    setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, nonLus: 0 } : c)));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Communication"
        title="WhatsApp patients"
        subtitle="Conversations, préparation d'examen et transfert au secrétariat."
        actions={
          <Button variant="outline" className="gap-2" onClick={() => setReloadToken((t) => t + 1)}>
            <RotateCcw className="size-4" aria-hidden="true" />
            Actualiser
          </Button>
        }
      />

      {error ? (
        <ServiceNotice
          message="Conversations WhatsApp en attente de connexion au serveur du centre."
          onRetry={() => setReloadToken((t) => t + 1)}
        />
      ) : null}

      <Card className="overflow-hidden p-0 shadow-sm">
        {isLoading ? (
          <WhatsAppSkeleton />
        ) : conversations.length === 0 ? (
          <EmptyState
            icon={MessageCircle}
            title="Aucune donnée disponible"
            description="Aucune conversation WhatsApp n'est encore enregistrée pour ce centre."
          />
        ) : (
          <div className="grid h-[calc(100dvh-18rem)] min-h-[560px] grid-cols-1 grid-rows-[minmax(0,1fr)] overflow-hidden lg:grid-cols-[320px_1fr] xl:grid-cols-[320px_1fr_300px]">
            <div
              className={
                vueMobile === "liste"
                  ? "min-h-0 min-w-0 overflow-hidden"
                  : "hidden min-h-0 min-w-0 overflow-hidden lg:block"
              }
            >
              <WaConversationList
                conversations={liste}
                activeId={active?.id ?? ""}
                query={query}
                filtre={filtre}
                onQueryChange={setQuery}
                onFiltreChange={setFiltre}
                onSelect={selectionner}
              />
            </div>

            <div
              className={
                vueMobile === "conversation"
                  ? "min-h-0 min-w-0 overflow-hidden"
                  : "hidden min-h-0 min-w-0 overflow-hidden lg:block"
              }
            >
              {active ? (
                <WaChatThread
                  conversation={active}
                  draft={draft}
                  envoiEnCours={envoiEnCours}
                  modeAgent={modeAgent}
                  onDraftChange={setDraft}
                  onEnvoyer={() => void envoyer()}
                  onQuickReply={(reply) => void handleQuickReply(reply)}
                  onToggleMode={() => setModeAgent((v) => !v)}
                  onRetour={() => setVueMobile("liste")}
                />
              ) : null}
            </div>

            {active ? (
              <div className="hidden min-h-0 min-w-0 overflow-hidden xl:block">
                <WaContextPanel conversation={active} onStatutChange={handleStatut} />
              </div>
            ) : null}
          </div>
        )}
      </Card>
    </div>
  );
}
