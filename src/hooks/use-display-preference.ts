/**
 * Préférences d'affichage — défauts centre via /api/settings (display.*),
 * override personnel en localStorage + sync serveur /api/preferences.
 */
import { useEffect, useState } from "react";

import { AUTH_USER_KEY } from "@/lib/auth-session";
import { fetchMyPreference, saveMyPreference } from "@/lib/api/preferences";
import { fetchSettings } from "@/lib/api/settings";

export type DisplayMode = "table" | "cards" | "calendar" | "list" | "compact" | "detailed";

const LEGACY_STORAGE_KEY = "radiocrm:displayPreferences";
const USER_STORAGE_PREFIX = "radiocrm:displayPreferences:";

const SECTION_SETTING_KEY: Record<string, string> = {
  worklist: "display.worklist",
  agenda: "display.agenda",
  patients: "display.patients",
  appointments: "display.appointments",
};

type Prefs = Record<string, DisplayMode>;

const VALID_MODES = new Set<DisplayMode>([
  "table",
  "cards",
  "calendar",
  "list",
  "compact",
  "detailed",
]);

function asMode(value: unknown): DisplayMode | null {
  return typeof value === "string" && VALID_MODES.has(value as DisplayMode)
    ? (value as DisplayMode)
    : null;
}

function readAuthUserId(): string {
  if (typeof window === "undefined") return "anonymous";
  try {
    const raw = window.localStorage.getItem(AUTH_USER_KEY);
    if (!raw) return "anonymous";
    const parsed = JSON.parse(raw) as { id?: string | number };
    if (parsed?.id != null && String(parsed.id).trim() !== "") return String(parsed.id);
  } catch {
    /* ignore */
  }
  return "anonymous";
}

function storageKeyForUser(userId: string): string {
  return `${USER_STORAGE_PREFIX}${userId}`;
}

function readPrefs(userId: string): Prefs {
  if (typeof window === "undefined") return {};
  try {
    const keyed = window.localStorage.getItem(storageKeyForUser(userId));
    if (keyed) return JSON.parse(keyed) as Prefs;
    const legacy = window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacy) {
      const parsed = JSON.parse(legacy) as Prefs;
      window.localStorage.setItem(storageKeyForUser(userId), legacy);
      return parsed;
    }
  } catch {
    /* ignore */
  }
  return {};
}

function writePrefs(userId: string, prefs: Prefs) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKeyForUser(userId), JSON.stringify(prefs));
}

export function useDisplayPreference(section: string, fallback: DisplayMode = "table") {
  const [userId] = useState(readAuthUserId);
  const [mode, setModeState] = useState<DisplayMode>(() => {
    const stored = asMode(readPrefs(readAuthUserId())[section]);
    return stored ?? fallback;
  });

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const uid = readAuthUserId();
    const userPrefs = readPrefs(uid);
    const userMode = asMode(userPrefs[section]);

    void (async () => {
      try {
        const remote = await fetchMyPreference("display", controller.signal);
        if (cancelled) return;
        const remoteMode = asMode(remote?.[section]);
        if (remoteMode) {
          setModeState(remoteMode);
          const all = readPrefs(uid);
          all[section] = remoteMode;
          writePrefs(uid, all);
          return;
        }
      } catch {
        /* offline / unauthorized — fall through */
      }

      if (userMode) {
        if (!cancelled) setModeState(userMode);
        return;
      }

      const settingKey = SECTION_SETTING_KEY[section];
      if (!settingKey) {
        if (!cancelled) setModeState(fallback);
        return;
      }

      try {
        const settings = await fetchSettings("display.", controller.signal);
        if (cancelled) return;
        const fromServer = asMode(settings[settingKey]);
        setModeState(fromServer ?? fallback);
      } catch {
        if (!cancelled) setModeState(fallback);
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [section, fallback, userId]);

  const setMode = (next: DisplayMode) => {
    setModeState(next);
    const uid = readAuthUserId();
    const all = readPrefs(uid);
    all[section] = next;
    writePrefs(uid, all);
    void saveMyPreference("display", { ...all }).catch(() => {
      /* local cache already updated */
    });
  };

  return {
    mode,
    setMode,
    isTableView: mode === "table" || mode === "detailed",
    isCardsView: mode === "cards",
    isCalendarView: mode === "calendar",
    isListView: mode === "list" || mode === "compact",
  };
}
