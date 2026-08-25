/** QR sécurisé : référence opaque uniquement (pas de données médicales). */

export function qrPayload(kind: "patient" | "examen" | "facture", id: string | number): string {
  return `radiocrm://${kind}/${encodeURIComponent(String(id))}`;
}

/** URL image QR via API publique (pas de PHI dans le QR — seulement la référence). */
export function qrImageUrl(payload: string, size = 160): string {
  const data = encodeURIComponent(payload);
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${data}`;
}
