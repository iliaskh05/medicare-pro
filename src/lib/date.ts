const longDate = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

/** Ex. « Lundi 10 août 2026 ». */
export function formatFrenchDate(date: Date = new Date()): string {
  const label = longDate.format(date);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

const shortTime = new Intl.DateTimeFormat("fr-FR", {
  hour: "2-digit",
  minute: "2-digit",
});

export function formatFrenchTime(date: Date = new Date()): string {
  return shortTime.format(date);
}
