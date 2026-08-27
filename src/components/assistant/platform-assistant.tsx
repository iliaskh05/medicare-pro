import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { toast } from "sonner";

import { AssistantLauncher } from "@/components/assistant/assistant-launcher";
import { AssistantPanel } from "@/components/assistant/assistant-panel";
import type { AssistantChatMessage } from "@/components/assistant/assistant-message";
import { useRole } from "@/hooks/use-role";
import { askAssistant } from "@/lib/api/assistant";
import {
  assistantQuickActionsForRoute,
  assistantWelcome,
  resolveAssistantReply,
  type AssistantAction,
  type AssistantContext,
} from "@/lib/assistant-engine";

const STORAGE_KEY = "radiocrm.assistant.session";

function heure() {
  return new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

export function PlatformAssistant() {
  const [open, setOpen] = useState(false);
  const [typing, setTyping] = useState(false);
  const [messages, setMessages] = useState<AssistantChatMessage[]>([]);
  const [actions, setActions] = useState<AssistantAction[]>([]);
  const [hydrated, setHydrated] = useState(false);

  const seq = useRef(0);
  const timers = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const abortRef = useRef<AbortController | null>(null);
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { role } = useRole();

  const ctx = useMemo<AssistantContext>(() => ({ pathname, role }), [pathname, role]);

  const nextId = useCallback(() => {
    seq.current += 1;
    return `asst-${seq.current}`;
  }, []);

  const bootstrap = useCallback(() => {
    const welcome = assistantWelcome(ctx);
    setMessages([{ id: nextId(), auteur: "assistant", texte: welcome.text, heure: heure() }]);
    setActions(welcome.actions);
  }, [ctx, nextId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as AssistantChatMessage[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
          seq.current = parsed.length;
        }
      }
    } catch {
      window.sessionStorage.removeItem(STORAGE_KEY);
    }
    setHydrated(true);
    const pending = timers.current;
    return () => {
      pending.forEach(clearTimeout);
      abortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return;
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {
      /* quota indisponible */
    }
  }, [messages, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    if (messages.length === 0) bootstrap();
    else setActions(assistantQuickActionsForRoute(ctx));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, ctx, messages.length]);

  const answer = useCallback(
    (question: string) => {
      setTyping(true);
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      void (async () => {
        let text = "";
        try {
          const remote = await askAssistant(
            { message: question, pathname: ctx.pathname, role: ctx.role },
            controller.signal,
          );
          if (remote?.gemini && remote.text?.trim()) {
            text = remote.text.trim();
          }
        } catch {
          /* repli moteur local */
        }

        if (!text) {
          text = resolveAssistantReply(question, ctx).text;
        }

        if (controller.signal.aborted) return;
        setTyping(false);
        setMessages((prev) => [
          ...prev,
          { id: nextId(), auteur: "assistant", texte: text, heure: heure() },
        ]);
        setActions(assistantQuickActionsForRoute(ctx));
      })();
    },
    [ctx, nextId],
  );

  const send = useCallback(
    (texte: string) => {
      setMessages((prev) => [
        ...prev,
        { id: nextId(), auteur: "utilisateur", texte, heure: heure() },
      ]);
      answer(texte);
    },
    [answer, nextId],
  );

  const handleAction = useCallback(
    (action: AssistantAction) => {
      if (action.kind === "navigate") {
        void navigate({ to: action.to });
        toast.info(`Navigation vers ${action.label.replace(/^Ouvrir\s/, "")}`);
        setMessages((prev) => [
          ...prev,
          {
            id: nextId(),
            auteur: "assistant",
            texte: `Ouverture de **${action.label.replace(/^Ouvrir\s/, "")}**.`,
            heure: heure(),
          },
        ]);
        return;
      }
      send(action.prompt);
    },
    [navigate, nextId, send],
  );

  const clear = useCallback(() => {
    timers.current.forEach(clearTimeout);
    abortRef.current?.abort();
    setTyping(false);
    setMessages([]);
    toast.info("Conversation de l'assistant effacée.");
  }, []);

  const restart = useCallback(() => {
    timers.current.forEach(clearTimeout);
    abortRef.current?.abort();
    setTyping(false);
    seq.current = 0;
    bootstrap();
    toast.success("Conversation effacée.");
  }, [bootstrap]);

  if (!open) {
    return <AssistantLauncher onClick={() => setOpen(true)} />;
  }

  return (
    <AssistantPanel
      messages={messages}
      actions={actions}
      typing={typing}
      onSend={send}
      onAction={handleAction}
      onClose={() => setOpen(false)}
      onMinimize={() => setOpen(false)}
      onClear={clear}
      onRestart={restart}
    />
  );
}
