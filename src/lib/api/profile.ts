import { javaApiForm, JAVA_API_BASE } from "./config";
import { AUTH_USER_KEY, readAuthToken } from "@/lib/auth-session";

export async function uploadMyAvatar(file: File, signal?: AbortSignal): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  const res = await javaApiForm<{ avatarUrl: string }>("/api/me/avatar", form, { signal });
  const url = res?.avatarUrl || "/api/me/avatar";
  persistAvatarUrl(url);
  return url;
}

export function persistAvatarUrl(avatarUrl: string | null) {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(AUTH_USER_KEY);
    const user = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
    if (avatarUrl) user.avatarUrl = avatarUrl;
    else delete user.avatarUrl;
    window.localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
    window.dispatchEvent(new CustomEvent("radiocrm:avatar", { detail: avatarUrl }));
  } catch {
    /* ignore */
  }
}

export function readStoredAvatarUrl(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(AUTH_USER_KEY);
    if (!raw) return null;
    const user = JSON.parse(raw) as { avatarUrl?: string };
    return user.avatarUrl ?? null;
  } catch {
    return null;
  }
}

/** Fetch avatar bytes with JWT → object URL (caller must revoke). */
export async function fetchMyAvatarBlob(signal?: AbortSignal): Promise<Blob> {
  const token = readAuthToken();
  const res = await fetch(`${JAVA_API_BASE}/api/me/avatar`, {
    signal,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error("Avatar indisponible");
  return res.blob();
}
