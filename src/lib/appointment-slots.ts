/** Créneaux agenda / salles : 08:30–18:30 par pas de 30 min. */

export const SLOT_START_MINUTES = 8 * 60 + 30;
export const SLOT_END_MINUTES = 18 * 60 + 30;
export const SLOT_STEP_MINUTES = 30;

export function generateDaySlots(): string[] {
  const slots: string[] = [];
  // Dernier créneau démarre à 18:00 pour se terminer à 18:30.
  for (let m = SLOT_START_MINUTES; m < SLOT_END_MINUTES; m += SLOT_STEP_MINUTES) {
    const h = Math.floor(m / 60);
    const min = m % 60;
    slots.push(`${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`);
  }
  return slots;
}

export function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

export function minutesToTime(total: number): string {
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** HH:mm depuis startsAt (ISO, espace, ou tableau Jackson rare). */
export function appointmentTime(startsAt: string | null | undefined): string {
  if (!startsAt) return "—:—";
  if (typeof startsAt !== "string") {
    const arr = startsAt as unknown;
    if (Array.isArray(arr) && arr.length >= 5) {
      return `${String(arr[3]).padStart(2, "0")}:${String(arr[4]).padStart(2, "0")}`;
    }
    return "—:—";
  }
  const m = startsAt.match(/T(\d{2}):(\d{2})/) ?? startsAt.match(/\s(\d{2}):(\d{2})/);
  if (m) return `${m[1]}:${m[2]}`;
  const d = new Date(startsAt);
  if (!Number.isNaN(d.getTime())) {
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }
  return "—:—";
}

export function appointmentDayKey(startsAt: string | null | undefined): string {
  return (startsAt ?? "").slice(0, 10);
}

export function isActiveAppointmentStatus(statut: string): boolean {
  return statut !== "CANCELLED" && statut !== "NO_SHOW";
}

export function rangesOverlap(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number,
): boolean {
  return aStart < bEnd && bStart < aEnd;
}
