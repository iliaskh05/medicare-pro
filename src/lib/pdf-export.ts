/**
 * Génère un dossier PDF imprimable : ouvre un aperçu propre
 * dans une nouvelle fenêtre puis déclenche l'impression / export PDF.
 */
import { fetchSettings } from "@/lib/api/settings";

export type DossierPdf = {
  titre: string;
  reference: string;
  lignes: { label: string; valeur: string }[];
  blocs?: { titre: string; contenu: string }[];
  mention?: string;
  /** Si omis, chargé depuis /api/settings (centre.nom). */
  centreNom?: string;
};

const escape = (v: string) => v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const FALLBACK_CENTRE = "Centre d'Imagerie Médicale";
let cachedCentreNom: string | null = null;

async function resolveCentreNom(override?: string): Promise<string> {
  if (override?.trim()) return override.trim();
  if (cachedCentreNom) return cachedCentreNom;
  try {
    const settings = await fetchSettings("centre.");
    cachedCentreNom = settings["centre.nom"]?.trim() || FALLBACK_CENTRE;
  } catch {
    cachedCentreNom = FALLBACK_CENTRE;
  }
  return cachedCentreNom;
}

export async function telechargerDossierPdf(dossier: DossierPdf): Promise<boolean> {
  const brand = await resolveCentreNom(dossier.centreNom);
  const win = window.open("", "_blank", "width=900,height=1200");
  if (!win) return false;

  const rows = dossier.lignes
    .map((l) => `<tr><th>${escape(l.label)}</th><td>${escape(l.valeur)}</td></tr>`)
    .join("");

  const blocs = (dossier.blocs ?? [])
    .map((b) => `<section><h2>${escape(b.titre)}</h2><p>${escape(b.contenu)}</p></section>`)
    .join("");

  win.document.write(`<!doctype html>
<html lang="fr"><head><meta charset="utf-8" />
<title>${escape(dossier.titre)} — ${escape(dossier.reference)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: "Plus Jakarta Sans", system-ui, sans-serif; margin: 0; padding: 40px; color: #0f172a; }
  header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #2563eb; padding-bottom: 16px; }
  .brand { font-weight: 800; font-size: 18px; color: #2563eb; }
  .brand small { display: block; font-weight: 500; color: #64748b; font-size: 12px; }
  h1 { font-size: 20px; margin: 28px 0 4px; }
  .ref { font-family: ui-monospace, monospace; color: #64748b; font-size: 12px; }
  table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 13px; }
  th, td { text-align: left; padding: 9px 12px; border-bottom: 1px solid #e2e8f0; }
  th { width: 40%; color: #475569; font-weight: 600; background: #f8fafc; }
  section { margin-top: 22px; }
  h2 { font-size: 13px; text-transform: uppercase; letter-spacing: .06em; color: #2563eb; margin-bottom: 6px; }
  section p { margin: 0; font-size: 13px; line-height: 1.6; }
  footer { margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 12px; font-size: 11px; color: #94a3b8; }
</style></head>
<body>
  <header>
    <div class="brand">${escape(brand)}<small>Imagerie médicale</small></div>
    <div class="ref">Édité le ${new Date().toLocaleString("fr-MA")}</div>
  </header>
  <h1>${escape(dossier.titre)}</h1>
  <p class="ref">Référence ${escape(dossier.reference)}</p>
  <table>${rows}</table>
  ${blocs}
  <footer>${escape(dossier.mention ?? "Document généré automatiquement par RadioCRM — usage interne et transmission comptable.")}</footer>
</body></html>`);
  win.document.close();
  win.focus();
  win.addEventListener("load", () => win.print(), { once: true });
  if (win.document.readyState === "complete") win.print();
  return true;
}
