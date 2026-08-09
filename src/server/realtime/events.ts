import type { RealtimeEvent } from "../store/types";

type Subscriber = {
  id: string;
  send: (event: RealtimeEvent) => void;
  filter?: (event: RealtimeEvent) => boolean;
};

const g = globalThis as typeof globalThis & {
  __radiocrmBus?: {
    subs: Map<string, Subscriber>;
    seq: number;
  };
};

const bus = g.__radiocrmBus ?? (g.__radiocrmBus = { subs: new Map(), seq: 0 });

export function publish(event: RealtimeEvent): void {
  for (const sub of bus.subs.values()) {
    if (sub.filter && !sub.filter(event)) continue;
    try {
      sub.send(event);
    } catch {
      bus.subs.delete(sub.id);
    }
  }
}

export function subscribe(
  send: (event: RealtimeEvent) => void,
  filter?: (event: RealtimeEvent) => boolean,
): () => void {
  const id = `sub-${++bus.seq}-${Date.now()}`;
  bus.subs.set(id, { id, send, filter });
  return () => bus.subs.delete(id);
}

export function subscriberCount(): number {
  return bus.subs.size;
}

/** Encode SSE frame. */
export function toSse(event: RealtimeEvent, id?: string): string {
  const lines = [
    id ? `id: ${id}` : null,
    `event: ${event.type}`,
    `data: ${JSON.stringify(event.payload)}`,
    "",
    "",
  ].filter((l) => l !== null);
  return lines.join("\n");
}
