import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bot,
  CalendarCheck,
  CheckCheck,
  FileText,
  Paperclip,
  Phone,
  Search,
  Send,
  Smile,
  Video,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { PageHeader, Pill } from "@/components/ui-kit";
import {
  conversationsWhatsApp,
  reponsesDemo,
  type WaConversation,
  type WaMessage,
  type WaStatut,
} from "@/data/mock-whatsapp";

export const Route = createFileRoute("/whatsapp")({
  head: () => ({
    meta: [
      { title: "Chatbot WhatsApp patients — Centre Al Amal" },
      {
        name: "description",
        content:
          "Console WhatsApp du centre d'imagerie Al Amal : conversations patients traitées par l'IA, prise de rendez-vous et envoi des comptes rendus.",
      },
      { property: "og:title", content: "Chatbot WhatsApp patients — Centre Al Amal" },
      {
        property: "og:description",
        content: "Console de supervision des conversations WhatsApp automatisées avec les patients.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: WhatsAppPage,
});

const statutTone: Record<WaStatut, "primary" | "success" | "warning"> = {
  IA: "success",
  Attente: "warning",
  Secrétariat: "primary",
};

const filtres: Array<{ key: "toutes" | WaStatut; label: string }> = [
  { key: "toutes", label: "Toutes" },
  { key: "IA", label: "Traitées par l'IA" },
  { key: "Attente", label: "En attente" },
  { key: "Secrétariat", label: "Secrétariat" },
];

function heureCourante() {
  return new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function WhatsAppPage() {
  const [conversations, setConversations] = useState<WaConversation[]>(conversationsWhatsApp);
  const [activeId, setActiveId] = useState(conversationsWhatsApp[0]?.id ?? "");
  const [query, setQuery] = useState("");
  const [filtre, setFiltre] = useState<"toutes" | WaStatut>("toutes");
  const [draft, setDraft] = useState("");
  const [typing, setTyping] = useState(false);
  const timers = useRef<Array<ReturnType<typeof setTimeout>>>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const liste = useMemo(() => {
    const q = query.trim().toLowerCase();
    return conversations.filter((c) => {
      const matchQ =
        !q || c.patient.toLowerCase().includes(q) || c.telephone.includes(q) || c.apercu.toLowerCase().includes(q);
      const matchF = filtre === "toutes" || c.statut === filtre;
      return matchQ && matchF;
    });
  }, [conversations, query, filtre]);

  const active = conversations.find((c) => c.id === activeId) ?? liste[0] ?? conversations[0];

  const pushMessage = (msg: WaMessage) => {
    setConversations((prev) =>
      prev.map((c) =>
        c.id === active?.id
          ? { ...c, messages: [...c.messages, msg], apercu: msg.texte.split("\n")[0]!, derniereHeure: msg.heure }
          : c,
      ),
    );
  };

  const botRepond = (texte: string, piece?: WaMessage["piece"]) => {
    setTyping(true);
    const t = setTimeout(() => {
      setTyping(false);
      const msg: WaMessage = { id: `b-${Date.now()}`, auteur: "bot", texte, heure: heureCourante() };
      if (piece) msg.piece = piece;
      pushMessage(msg);
    }, 1400);
    timers.current.push(t);
  };

  const envoyer = () => {
    const texte = draft.trim();
    if (!texte) return;
    pushMessage({ id: `p-${Date.now()}`, auteur: "patient", texte, heure: heureCourante() });
    setDraft("");
    botRepond(reponsesDemo.ia);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Chatbot WhatsApp patients"
        subtitle="Supervisez les conversations automatisées : qualification, prise de rendez-vous et envoi des comptes rendus."
        actions={
          <Pill tone="success">
            <Bot className="size-3.5" /> Agent IA actif
          </Pill>
        }
      />

      <Card className="overflow-hidden p-0 shadow-sm transition-shadow hover:shadow-md">
        <div className="grid min-h-[640px] grid-cols-1 lg:grid-cols-[340px_1fr]">
          {/* ------------------------------- Colonne contacts ------------------------------- */}
          <aside className="flex flex-col border-b bg-muted/40 lg:border-b-0 lg:border-r">
            <div className="space-y-3 border-b bg-card/60 p-4">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  aria-label="Rechercher une conversation patient"
                  placeholder="Rechercher un patient ou un numéro"
                  className="rounded-full bg-background pl-9"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {filtres.map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setFiltre(f.key)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                      filtre === f.key
                        ? "bg-success text-success-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/70"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <ScrollArea className="max-h-[540px] flex-1">
              <ul className="divide-y">
                {liste.map((c) => {
                  const isActive = c.id === active?.id;
                  return (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveId(c.id);
                          setConversations((prev) =>
                            prev.map((x) => (x.id === c.id ? { ...x, nonLus: 0 } : x)),
                          );
                        }}
                        className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${
                          isActive ? "bg-card" : "hover:bg-card/70"
                        }`}
                      >
                        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-success/15 text-sm font-semibold text-success">
                          {c.initiales}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-baseline justify-between gap-2">
                            <span className="truncate text-sm font-semibold text-foreground">{c.patient}</span>
                            <span className="shrink-0 text-[11px] text-muted-foreground">{c.derniereHeure}</span>
                          </span>
                          <span className="mt-0.5 flex items-center gap-2">
                            <span className="truncate text-xs text-muted-foreground">{c.apercu}</span>
                            {c.nonLus > 0 && (
                              <span className="ml-auto flex size-5 shrink-0 items-center justify-center rounded-full bg-success text-[11px] font-bold text-success-foreground">
                                {c.nonLus}
                              </span>
                            )}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
                {liste.length === 0 && (
                  <li className="p-6 text-center text-sm text-muted-foreground">Aucune conversation trouvée.</li>
                )}
              </ul>
            </ScrollArea>
          </aside>

          {/* --------------------------------- Zone de chat --------------------------------- */}
          <section className="flex min-w-0 flex-col">
            <header className="flex items-center gap-3 border-b bg-card px-4 py-3">
              <span className="flex size-10 items-center justify-center rounded-full bg-success/15 text-sm font-semibold text-success">
                {active?.initiales}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">{active?.patient}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {active?.telephone} · {active?.dossier} · {active?.mutuelle}
                </p>
              </div>
              <div className="ml-auto flex items-center gap-2">
                {active && <Pill tone={statutTone[active.statut]}>{active.statut}</Pill>}
                <Button variant="ghost" size="icon" aria-label="Appeler le patient">
                  <Phone className="size-4" />
                </Button>
                <Button variant="ghost" size="icon" aria-label="Démarrer une visioconférence">
                  <Video className="size-4" />
                </Button>
              </div>
            </header>

            {/* Panneau de contrôle de démo */}
            <div className="flex flex-wrap items-center gap-2 border-b bg-muted/40 px-4 py-2.5">
              <span className="mr-1 text-xs font-medium text-muted-foreground">Démo :</span>
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => botRepond(reponsesDemo.ia)}>
                <Bot className="size-3.5" /> Déclencher réponse IA
              </Button>
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => botRepond(reponsesDemo.rdv)}>
                <CalendarCheck className="size-3.5" /> Simuler prise de RDV
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={() =>
                  botRepond(reponsesDemo.pdf, { nom: "CR_IRM_Lombaire_AlAmal.pdf", taille: "526 Ko" })
                }
              >
                <FileText className="size-3.5" /> Envoyer compte rendu PDF
              </Button>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto bg-muted/30 p-4 md:p-6">
              {(active?.messages ?? []).map((m) => (
                <div key={m.id} className={`flex ${m.auteur === "bot" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm shadow-sm animate-fade-in md:max-w-[70%] ${
                      m.auteur === "bot"
                        ? "rounded-br-sm bg-success/15 text-foreground"
                        : "rounded-bl-sm bg-card text-foreground"
                    }`}
                  >
                    <p className="whitespace-pre-line leading-relaxed">{m.texte}</p>
                    {m.piece && (
                      <div className="mt-2 flex items-center gap-2 rounded-xl border bg-background/70 px-3 py-2">
                        <FileText className="size-4 text-primary" />
                        <span className="min-w-0">
                          <span className="block truncate text-xs font-medium text-foreground">{m.piece.nom}</span>
                          <span className="block text-[11px] text-muted-foreground">PDF · {m.piece.taille}</span>
                        </span>
                      </div>
                    )}
                    <p className="mt-1 flex items-center justify-end gap-1 text-[10px] text-muted-foreground">
                      {m.heure}
                      {m.auteur === "bot" && <CheckCheck className="size-3 text-primary" />}
                    </p>
                  </div>
                </div>
              ))}

              {typing && (
                <div className="flex justify-end">
                  <div className="flex items-center gap-2 rounded-2xl rounded-br-sm bg-success/10 px-3.5 py-2.5 text-xs text-muted-foreground shadow-sm">
                    <Bot className="size-3.5 text-success" />
                    <span>En train d'écrire</span>
                    <span className="flex gap-1">
                      <span className="size-1.5 animate-bounce rounded-full bg-success [animation-delay:0ms]" />
                      <span className="size-1.5 animate-bounce rounded-full bg-success [animation-delay:150ms]" />
                      <span className="size-1.5 animate-bounce rounded-full bg-success [animation-delay:300ms]" />
                    </span>
                  </div>
                </div>
              )}
            </div>

            <footer className="flex items-center gap-2 border-t bg-card px-3 py-3">
              <Button variant="ghost" size="icon" aria-label="Ajouter un emoji">
                <Smile className="size-4" />
              </Button>
              <Button variant="ghost" size="icon" aria-label="Joindre un document">
                <Paperclip className="size-4" />
              </Button>
              <Input
                aria-label="Écrire un message au patient"
                placeholder="Écrivez un message…"
                className="rounded-full bg-muted/50"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    envoyer();
                  }
                }}
              />
              <Button size="icon" aria-label="Envoyer le message" onClick={envoyer} className="rounded-full">
                <Send className="size-4" />
              </Button>
            </footer>
          </section>
        </div>
      </Card>
    </div>
  );
}
