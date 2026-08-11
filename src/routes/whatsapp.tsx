import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Bot, RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader, Pill } from "@/components/ui-kit";
import { WaChatThread } from "@/components/whatsapp/wa-chat-thread";
import { WaContextPanel } from "@/components/whatsapp/wa-context-panel";
import { WaConversationList } from "@/components/whatsapp/wa-conversation-list";
import {
  conversationsWhatsApp,
  waStatutLabel,
  type WaConversation,
  type WaMessage,
  type WaQuickReply,
  type WaStatut,
} from "@/types/whatsapp";
import {
  reponseBot,
  scenarioMessages,
  statutApresScenario,
  type WaDraftMessage,
  type WaScenario,
} from "@/lib/whatsapp-bot";

export const Route = createFileRoute("/whatsapp")({
  head: () => ({
    meta: [
      { title: "Chatbot WhatsApp patients — Centre d'Imagerie Médicale" },
      {
        name: "description",
        content:
          "Console WhatsApp simulée du centre d'imagerie : prise de rendez-vous, préparation d'examen, questions mutuelle, rappels et transfert au secrétariat.",
      },
      { property: "og:title", content: "Chatbot WhatsApp patients — Centre d'Imagerie Médicale" },
      {
        property: "og:description",
        content:
          "Console de supervision des conversations WhatsApp automatisées avec les patients (démonstration).",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: WhatsAppPage,
});

function heureCourante() {
  return new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

/** Clone profond du jeu de démonstration pour permettre une réinitialisation propre. */
function conversationsInitiales(): WaConversation[] {
  return conversationsWhatsApp.map((c) => ({ ...c, messages: c.messages.map((m) => ({ ...m })) }));
}

function WhatsAppPage() {
  const [conversations, setConversations] = useState<WaConversation[]>(conversationsInitiales);
  const [activeId, setActiveId] = useState(conversationsWhatsApp[0]?.id ?? "");
  const [query, setQuery] = useState("");
  const [filtre, setFiltre] = useState<"toutes" | WaStatut>("toutes");
  const [draft, setDraft] = useState("");
  const [typing, setTyping] = useState(false);
  const [modeAgent, setModeAgent] = useState(false);
  const [vueMobile, setVueMobile] = useState<"liste" | "conversation">("liste");

  const seq = useRef(0);
  const timers = useRef<Array<ReturnType<typeof setTimeout>>>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const nextId = () => {
    seq.current += 1;
    return `wa-live-${seq.current}`;
  };

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

  const appliquerMessages = (drafts: WaDraftMessage[], statut?: WaStatut) => {
    if (!active) return;
    const messages: WaMessage[] = drafts.map((d) => ({
      ...d,
      id: nextId(),
      heure: heureCourante(),
    }));
    const dernier = messages[messages.length - 1];
    setConversations((prev) =>
      prev.map((c) =>
        c.id === active.id
          ? {
              ...c,
              statut: statut ?? c.statut,
              messages: [...c.messages, ...messages],
              apercu: dernier ? (dernier.texte.split("\n")[0] ?? c.apercu) : c.apercu,
              derniereHeure: dernier?.heure ?? c.derniereHeure,
            }
          : c,
      ),
    );
  };

  /** Réponse du bot après un délai simulé (500–1000 ms). */
  const repondre = (entree: string) => {
    if (!active) return;
    if (active.statut === "secretariat" || active.statut === "cloture") return;
    setTyping(true);
    const drafts = reponseBot(entree, active);
    const transfert = drafts.some((d) => d.auteur === "agent");
    const timer = setTimeout(
      () => {
        setTyping(false);
        appliquerMessages(drafts, transfert ? "secretariat" : undefined);
      },
      600 + (seq.current % 5) * 80,
    );
    timers.current.push(timer);
  };

  const envoyer = () => {
    const texte = draft.trim();
    if (!texte || !active) return;
    setDraft("");
    if (modeAgent) {
      appliquerMessages([{ auteur: "agent", texte, etat: "delivre" }], "secretariat");
      return;
    }
    appliquerMessages([{ auteur: "patient", texte, etat: "lu" }]);
    repondre(texte);
  };

  const handleQuickReply = (reply: WaQuickReply) => {
    if (!active) return;
    appliquerMessages([{ auteur: "patient", texte: reply.label, etat: "lu" }]);
    repondre(reply.payload);
  };

  const handleScenario = (scenario: WaScenario) => {
    if (!active) return;
    setTyping(true);
    const drafts = scenarioMessages(scenario, active);
    const timer = setTimeout(() => {
      setTyping(false);
      appliquerMessages(drafts, statutApresScenario(scenario, active.statut));
      if (scenario === "handoff") setModeAgent(true);
    }, 700);
    timers.current.push(timer);
  };

  const handleStatut = (statut: WaStatut) => {
    if (!active) return;
    appliquerMessages(
      [{ auteur: "systeme", texte: `Statut mis à jour : ${waStatutLabel[statut]}.` }],
      statut,
    );
    setModeAgent(statut === "secretariat");
  };

  const reinitialiser = () => {
    timers.current.forEach(clearTimeout);
    seq.current = 0;
    setTyping(false);
    setModeAgent(false);
    setConversations(conversationsInitiales());
    setActiveId(conversationsWhatsApp[0]?.id ?? "");
    setQuery("");
    setFiltre("toutes");
    setDraft("");
    toast.success("Démonstration WhatsApp réinitialisée.");
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
        title="Chatbot WhatsApp patients"
        subtitle="Console de supervision simulée : prise de rendez-vous, préparation d'examen, mutuelle, rappels et transfert au secrétariat."
        actions={
          <>
            <Pill tone="success">
              <Bot className="size-3.5" aria-hidden="true" /> Simulation IA
            </Pill>
            <Button variant="outline" className="gap-2" onClick={reinitialiser}>
              <RotateCcw className="size-4" aria-hidden="true" />
              Réinitialiser la démo
            </Button>
          </>
        }
      />

      <Card className="overflow-hidden p-0 shadow-sm">
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
                typing={typing}
                modeAgent={modeAgent}
                onDraftChange={setDraft}
                onEnvoyer={envoyer}
                onQuickReply={handleQuickReply}
                onScenario={handleScenario}
                onToggleMode={() => setModeAgent((v) => !v)}
                onRetour={() => setVueMobile("liste")}
              />
            ) : null}
          </div>

          {active ? (
            <div className="hidden min-h-0 min-w-0 overflow-hidden xl:block">
              <WaContextPanel
                conversation={active}
                onStatutChange={handleStatut}
                onEnvoyerPreparation={() => handleScenario("preparation-irm")}
              />
            </div>
          ) : null}
        </div>
      </Card>
    </div>
  );
}
