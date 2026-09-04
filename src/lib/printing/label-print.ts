/**
 * Abstraction impression d'étiquettes patient — liée au dossier patient.
 * Navigateur : fenêtre d'impression CSS. Hardware thermique : à brancher ici.
 */

export type LabelPrintKind = "etiquette" | "autocollant" | "les_deux";

export type PatientLabelPayload = {
  /** Identifiant patient (dossier) — source de vérité */
  patientId: string;
  nom: string;
  prenom?: string;
  numeroDossier: string;
  cin?: string;
  examen?: string;
  dateHeure?: string;
  barcodeValue?: string;
};

function formatCss(kind: "etiquette" | "autocollant"): string {
  return kind === "autocollant"
    ? "width:89mm;min-height:36mm;"
    : "width:62mm;min-height:29mm;";
}

function buildLabelHtml(
  payload: PatientLabelPayload,
  kind: "etiquette" | "autocollant",
): string {
  const fullName = [payload.nom, payload.prenom].filter(Boolean).join(" ");
  const barcode = payload.barcodeValue || payload.numeroDossier;
  const title =
    kind === "autocollant" ? "Auto-collant patient" : "Étiquette patient";
  const kindLabel = kind === "autocollant" ? "AUTO-COLLANT" : "ÉTIQUETTE";

  return `<!doctype html><html><head><title>${title} — ${escapeHtml(payload.numeroDossier)}</title>
<style>
  body{font-family:ui-sans-serif,system-ui,sans-serif;margin:12px;color:#111}
  .label{border:1px solid #222;padding:8px 10px;${formatCss(kind)}box-sizing:border-box;page-break-after:always}
  .kind{font-size:9px;font-weight:700;letter-spacing:.08em;color:#555}
  .name{font-size:14px;font-weight:700;margin-top:2px}
  .meta{font-size:11px;margin-top:4px}
  .barcode{font-family:ui-monospace,monospace;font-size:16px;letter-spacing:2px;margin-top:8px}
  @media print{body{margin:0}.label{border:none}}
</style></head><body>
<div class="label">
  <div class="kind">${kindLabel}</div>
  <div class="name">${escapeHtml(fullName)}</div>
  <div class="meta">Dossier ${escapeHtml(payload.numeroDossier)}${payload.cin ? " · CIN " + escapeHtml(payload.cin) : ""}</div>
  <div class="meta">Patient #${escapeHtml(payload.patientId)}${payload.examen ? " · " + escapeHtml(payload.examen) : ""}</div>
  <div class="meta">${escapeHtml(payload.dateHeure || new Date().toLocaleString("fr-MA"))}</div>
  <div class="barcode">*${escapeHtml(barcode)}*</div>
</div>
</body></html>`;
}

/** Imprime une étiquette (papier standard) ou un auto-collant pour un dossier patient. */
export function printPatientLabel(
  payload: PatientLabelPayload,
  kind: "etiquette" | "autocollant" = "etiquette",
): void {
  openPrintWindow(buildLabelHtml(payload, kind));
}

/** Imprime les deux supports pour le même dossier patient. */
export function printPatientLabelBoth(payload: PatientLabelPayload): void {
  const html = `<!doctype html><html><head><title>Étiquettes — ${escapeHtml(payload.numeroDossier)}</title>
<style>
  body{font-family:ui-sans-serif,system-ui,sans-serif;margin:12px;color:#111}
  .label{border:1px solid #222;padding:8px 10px;box-sizing:border-box;margin-bottom:16px;page-break-after:always}
  .etiquette{width:62mm;min-height:29mm}
  .autocollant{width:89mm;min-height:36mm}
  .kind{font-size:9px;font-weight:700;letter-spacing:.08em;color:#555}
  .name{font-size:14px;font-weight:700;margin-top:2px}
  .meta{font-size:11px;margin-top:4px}
  .barcode{font-family:ui-monospace,monospace;font-size:16px;letter-spacing:2px;margin-top:8px}
  @media print{body{margin:0}.label{border:none}}
</style></head><body>
${labelBlock(payload, "etiquette")}
${labelBlock(payload, "autocollant")}
<script>window.onload=()=>{window.print();}</script>
</body></html>`;
  openPrintWindow(html);
}

export function printPatientLabels(
  payload: PatientLabelPayload,
  kind: LabelPrintKind,
): void {
  if (kind === "les_deux") {
    printPatientLabelBoth(payload);
    return;
  }
  printPatientLabel(payload, kind);
}

function labelBlock(payload: PatientLabelPayload, kind: "etiquette" | "autocollant"): string {
  const fullName = [payload.nom, payload.prenom].filter(Boolean).join(" ");
  const barcode = payload.barcodeValue || payload.numeroDossier;
  const kindLabel = kind === "autocollant" ? "AUTO-COLLANT" : "ÉTIQUETTE";
  const cls = kind === "autocollant" ? "autocollant" : "etiquette";
  return `<div class="label ${cls}">
  <div class="kind">${kindLabel}</div>
  <div class="name">${escapeHtml(fullName)}</div>
  <div class="meta">Dossier ${escapeHtml(payload.numeroDossier)}${payload.cin ? " · CIN " + escapeHtml(payload.cin) : ""}</div>
  <div class="meta">Patient #${escapeHtml(payload.patientId)}${payload.examen ? " · " + escapeHtml(payload.examen) : ""}</div>
  <div class="meta">${escapeHtml(payload.dateHeure || new Date().toLocaleString("fr-MA"))}</div>
  <div class="barcode">*${escapeHtml(barcode)}*</div>
</div>`;
}

function openPrintWindow(html: string): void {
  const withPrint = html.includes("window.print")
    ? html
    : html.replace("</body>", `<script>window.onload=()=>{window.print();}</script></body>`);
  const w = window.open("", "_blank", "noopener,noreferrer,width=480,height=420");
  if (!w) throw new Error("Popup bloquée — autorisez les fenêtres pour imprimer");
  w.document.write(withPrint);
  w.document.close();
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
