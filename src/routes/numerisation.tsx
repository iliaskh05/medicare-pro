import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { FileUp, Link2, ScanLine, Tags, Unlink, ExternalLink } from "lucide-react";
import { toast } from "sonner";

import { PatientLabelPrintMenu } from "@/components/patients/patient-label-print-menu";
import { SejourBadge } from "@/components/sejour-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState, IconTile, PageHeader } from "@/components/ui-kit";
import { uploadDocument } from "@/lib/api/documents";
import { fetchPatients } from "@/lib/api/patients";
import { fetchWorklist } from "@/lib/api/worklist";

export const Route = createFileRoute("/numerisation")({
  head: () => ({
    meta: [
      { title: "Numérisation & étiquettes — Accueil | RadioCRM" },
      {
        name: "description",
        content:
          "Numérisation des ordonnances et pièces d'identité, puis impression des étiquettes patient.",
      },
    ],
  }),
  component: NumerisationPage,
});

function NumerisationPage() {
  const [patientQuery, setPatientQuery] = useState("");
  const [patientId, setPatientId] = useState("");
  const [patientName, setPatientName] = useState("");
  const [numeroDossier, setNumeroDossier] = useState("");
  const [cin, setCin] = useState("");
  const [sejour, setSejour] = useState("");
  const [linkedSejour, setLinkedSejour] = useState("");
  const [examenId, setExamenId] = useState<string | null>(null);
  const [docType, setDocType] = useState("ORDONNANCE");
  const [busy, setBusy] = useState(false);
  const [uploaded, setUploaded] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const resolvePatient = async () => {
    const q = patientQuery.trim();
    if (!q) {
      toast.error("Indiquez CIN, n° dossier ou nom");
      return;
    }
    try {
      const rows = await fetchPatients();
      const hit = rows.find(
        (p) =>
          p.cin?.toLowerCase() === q.toLowerCase() ||
          p.numeroDossier?.toLowerCase() === q.toLowerCase() ||
          p.nomComplet?.toLowerCase().includes(q.toLowerCase()),
      );
      if (!hit) {
        toast.error("Aucun patient trouvé");
        return;
      }
      setPatientId(String(hit.id));
      setPatientName(hit.nomComplet);
      setNumeroDossier(hit.numeroDossier ?? String(hit.id));
      setCin(hit.cin || "");
      toast.success("Patient sélectionné");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Recherche impossible");
    }
  };

  const resolveSejour = async () => {
    const ref = sejour.trim();
    if (!ref) {
      toast.error("Indiquez un n° de séjour");
      return;
    }
    try {
      const rows = await fetchWorklist({ search: ref });
      const hit = rows.find((r) => r.numSejour?.toLowerCase() === ref.toLowerCase()) ?? rows[0];
      if (!hit?.numSejour) {
        toast.error("Séjour introuvable");
        setExamenId(null);
        setLinkedSejour("");
        return;
      }
      setExamenId(hit.id);
      setSejour(hit.numSejour);
      setLinkedSejour(hit.numSejour);
      if (hit.patientId) {
        setPatientId(String(hit.patientId));
        setPatientName(hit.patient || String(hit.patientId));
        if (!numeroDossier || numeroDossier === patientId) {
          setNumeroDossier(String(hit.patientId));
        }
        setCin(hit.cin || "");
      }
      toast.success(`Séjour lié : ${hit.numSejour}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Recherche séjour impossible");
    }
  };

  const detachSejour = () => {
    setExamenId(null);
    setLinkedSejour("");
    setSejour("");
    toast.message("Examen détaché — le document ira uniquement au dossier patient");
  };

  const attachFiles = async () => {
    const files = Array.from(fileRef.current?.files ?? []);
    if (!patientId || files.length === 0) {
      toast.error("Patient et fichier(s) requis");
      return;
    }
    setBusy(true);
    try {
      const names: string[] = [];
      for (const file of files) {
        await uploadDocument({
          patientId,
          examenId,
          type: docType,
          file,
        });
        names.push(file.name);
      }
      setUploaded((prev) => [...names, ...prev]);
      toast.success(`${names.length} document(s) enregistré(s)`);
      if (fileRef.current) fileRef.current.value = "";
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload impossible");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Documents"
        title="Numérisation"
        subtitle="Import réel vers le dossier patient (PostgreSQL) et impression d'étiquettes"
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center gap-3">
            <IconTile>
              <ScanLine className="size-4" />
            </IconTile>
            <CardTitle className="text-base">Numériser un document</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="num-patient">Patient (CIN / n° dossier / nom)</Label>
              <div className="flex gap-2">
                <Input
                  id="num-patient"
                  value={patientQuery}
                  onChange={(e) => setPatientQuery(e.target.value)}
                  placeholder="Ex. BE123456 ou PAT-000012"
                />
                <Button type="button" variant="outline" onClick={() => void resolvePatient()}>
                  Chercher
                </Button>
              </div>
              {patientName ? (
                <p className="text-xs text-muted-foreground">
                  Sélection : {patientName} · dossier {numeroDossier}
                </p>
              ) : null}
            </div>

            <div className="space-y-2 rounded-lg border border-primary/20 bg-primary/5 p-3">
              <Label htmlFor="num-sejour" className="flex items-center gap-1.5">
                <Link2 className="size-3.5" />
                Lier à un examen (n° de séjour)
              </Label>
              <div className="flex gap-2">
                <Input
                  id="num-sejour"
                  value={sejour}
                  onChange={(e) => {
                    setSejour(e.target.value);
                    if (examenId) {
                      setExamenId(null);
                      setLinkedSejour("");
                    }
                  }}
                  placeholder="Ex. SJ-2026-000123"
                  className="font-mono"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void resolveSejour();
                    }
                  }}
                />
                <Button type="button" variant="outline" onClick={() => void resolveSejour()}>
                  Lier
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Visible dans la{" "}
                <Link
                  to="/worklist"
                  className="inline-flex items-center gap-0.5 font-medium text-primary underline-offset-2 hover:underline"
                >
                  Worklist
                  <ExternalLink className="size-3" />
                </Link>
                , colonne <span className="font-medium text-foreground">N° séjour</span> (ex.
                SJ-2026-000123). Sans lien, le document reste uniquement au dossier patient.
              </p>
              {examenId && linkedSejour ? (
                <div className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-background px-3 py-2">
                  <span className="text-xs font-medium text-muted-foreground">Examen lié :</span>
                  <SejourBadge value={linkedSejour} size="sm" />
                  {patientName ? (
                    <span className="text-xs text-muted-foreground truncate">{patientName}</span>
                  ) : null}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="ml-auto h-7 text-xs"
                    onClick={detachSejour}
                  >
                    <Unlink className="mr-1 size-3.5" /> Détacher
                  </Button>
                </div>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label>Type de document</Label>
              <Select value={docType} onValueChange={setDocType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ORDONNANCE">Ordonnance</SelectItem>
                  <SelectItem value="CIN">CIN / identité</SelectItem>
                  <SelectItem value="MUTUELLE">Mutuelle</SelectItem>
                  <SelectItem value="AUTRE">Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="num-file">Fichier (PDF ou image)</Label>
              <Input id="num-file" ref={fileRef} type="file" multiple accept="image/*,application/pdf" />
            </div>
            <Button disabled={busy || !patientId} onClick={() => void attachFiles()}>
              <FileUp className="mr-2 size-4" /> {busy ? "Envoi…" : "Enregistrer au dossier"}
            </Button>
            {uploaded.length > 0 ? (
              <ul className="space-y-1 text-xs text-muted-foreground">
                {uploaded.map((f) => (
                  <li key={f} className="truncate">
                    • {f}
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                icon={ScanLine}
                title="Aucun document envoyé"
                description="Les fichiers sont stockés côté serveur et liés au patient."
                compact
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center gap-3">
            <IconTile tone="success">
              <Tags className="size-4" />
            </IconTile>
            <CardTitle className="text-base">Impression d&apos;étiquettes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Chaque impression est liée au dossier patient sélectionné : étiquette, auto-collant,
              ou les deux (impression navigateur).
            </p>
            {patientId ? (
              <PatientLabelPrintMenu
                payload={{
                  patientId,
                  nom: patientName || "Patient",
                  numeroDossier: numeroDossier || patientId,
                  ...(cin ? { cin } : {}),
                  ...(linkedSejour ? { examen: linkedSejour } : {}),
                }}
              />
            ) : (
              <p className="text-sm text-muted-foreground">Sélectionnez un patient pour imprimer.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
