import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Circle,
  FileDown,
  History,
  Loader2,
  Save,
  ScanLine,
  Receipt,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/ui-kit";
import {
  CompteRenduBadge,
  DossierBadge,
  EtatPatientBadge,
  PaiementBadge,
} from "@/components/worklist/status-badges";
import {
  fetchPaiements,
  recordPaiement,
  saveCompteRendu,
  updateWorklistStatut,
  type PaiementItem,
  type WorklistItem,
} from "@/lib/api/worklist";
import {
  fetchExamenDocuments,
  isDicomDocument,
  isImageDocument,
  uploadDocument,
  type DocumentItem,
} from "@/lib/api/documents";
import {
  downloadCompteRenduExamen,
  downloadFactureExamen,
  previewCompteRenduExamen,
  previewFactureExamen,
} from "@/lib/api/factures";
import { formatMAD } from "@/types/domain";

function Field({ label, value }: { label: string; value?: string | number | undefined }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">{label}</p>
      <p className="truncate text-sm font-medium">{value === undefined || value === "" ? "—" : value}</p>
    </div>
  );
}

function Check({ ok, label }: { ok: boolean; label: string }) {
  const Icon = ok ? CheckCircle2 : Circle;
  return (
    <li className="flex items-center gap-2 text-sm">
      <Icon className={ok ? "size-4 text-success" : "size-4 text-muted-foreground"} />
      {label}
    </li>
  );
}

export function ExamenSheet({
  item,
  open,
  onOpenChange,
  onOpenImagerie,
  onDownloadFacture,
  onUpdated,
}: {
  item: WorklistItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenImagerie?: (item: WorklistItem) => void;
  onDownloadFacture?: (item: WorklistItem) => void;
  onUpdated?: (item: WorklistItem) => void;
  onStatus?: (id: string, etat: WorklistItem["etatPatient"]) => void;
}) {
  const [indication, setIndication] = useState("");
  const [technique, setTechnique] = useState("");
  const [resultats, setResultats] = useState("");
  const [conclusion, setConclusion] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [paiements, setPaiements] = useState<PaiementItem[]>([]);
  const [docs, setDocs] = useState<DocumentItem[]>([]);
  const [payAmount, setPayAmount] = useState("");
  const [payMode, setPayMode] = useState("especes");

  useEffect(() => {
    if (!item) return;
    setIndication(item.indication ?? "");
    setTechnique(item.technique ?? "");
    setResultats(item.resultats ?? "");
    setConclusion(item.conclusion ?? "");
    fetchPaiements(item.id).then(setPaiements).catch(() => setPaiements([]));
    fetchExamenDocuments(item.id).then(setDocs).catch(() => setDocs([]));
  }, [item]);

  if (!item) return null;

  const total = item.montant ?? 0;
  const paid = item.acompte ?? 0;
  const reste = item.reste ?? Math.max(total - paid, 0);

  const save = async () => {
    setIsSaving(true);
    try {
      const updated = await saveCompteRendu(item.id, {
        indication,
        technique,
        resultats,
        conclusion,
      });
      onUpdated?.(updated);
      toast.success("Compte rendu enregistré.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Enregistrement impossible.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-4 overflow-y-auto sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle className="truncate">{item.patient}</SheetTitle>
          <SheetDescription>
            {item.description} · {item.modalite} · séjour {item.numSejour}
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-wrap gap-2">
          <EtatPatientBadge etat={item.etatPatient} />
          <CompteRenduBadge statut={item.statutCr} />
          <PaiementBadge statut={item.paiement} />
          <DossierBadge statut={item.dossierStatut} />
          {item.priorite && item.priorite !== "ROUTINE" ? (
            <span className="rounded-md bg-destructive/10 px-2 py-0.5 text-[11px] font-semibold text-destructive">
              {item.priorite}
            </span>
          ) : null}
        </div>

        <ul className="grid gap-1 rounded-lg border border-border p-3 sm:grid-cols-2">
          <Check ok={Boolean(item.patient)} label="Patient" />
          <Check ok={Boolean(item.description)} label="Examen" />
          <Check ok={docs.length > 0} label="Images / documents" />
          <Check ok={item.statutCr === "signe" || item.statutCr === "imprime"} label="Compte rendu validé" />
          <Check ok={item.paiement === "paye" || total === 0} label="Paiement" />
          <Check ok={item.dossierStatut === "remis" || item.dossierStatut === "envoye"} label="Dossier remis" />
        </ul>

        <Tabs defaultValue="examen" className="flex min-h-0 flex-1 flex-col">
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="patient">Patient</TabsTrigger>
            <TabsTrigger value="examen">Examen</TabsTrigger>
            <TabsTrigger value="cr">Compte rendu</TabsTrigger>
            <TabsTrigger value="imagerie">Imagerie</TabsTrigger>
            <TabsTrigger value="facture">Facturation</TabsTrigger>
            <TabsTrigger value="dossier">Dossier</TabsTrigger>
            <TabsTrigger value="historique">Historique</TabsTrigger>
          </TabsList>

          <TabsContent value="patient" className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Nom complet" value={item.patient} />
            <Field label="CIN" value={item.cin} />
            <Field label="Âge" value={item.age !== undefined ? `${item.age} ans` : undefined} />
            <Field label="Sexe" value={item.sexe} />
            <Field label="Téléphone" value={item.telephone} />
            <Field label="N° séjour" value={item.numSejour} />
          </TabsContent>

          <TabsContent value="examen" className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Description" value={item.description} />
            <Field label="Modalité" value={item.modalite} />
            <Field label="Salle" value={item.salle} />
            <Field label="Date d'examen" value={item.dateExamen} />
            <Field label="Radiologue" value={item.medecin} />
            <Field label="Prescripteur" value={item.prescripteur} />
            <Field label="Montant" value={formatMAD(total)} />
            <Field label="Reste" value={formatMAD(reste)} />
          </TabsContent>

          <TabsContent value="cr" className="mt-4 flex min-h-0 flex-1 flex-col gap-3">
            <p className="text-xs text-muted-foreground">
              Éditeur de travail. Le document PDF officiel est généré séparément après enregistrement.
            </p>
            <div>
              <Label>Indication</Label>
              <Textarea value={indication} onChange={(e) => setIndication(e.target.value)} />
            </div>
            <div>
              <Label>Technique</Label>
              <Textarea value={technique} onChange={(e) => setTechnique(e.target.value)} />
            </div>
            <div>
              <Label>Observations</Label>
              <Textarea className="min-h-28" value={resultats} onChange={(e) => setResultats(e.target.value)} />
            </div>
            <div>
              <Label>Conclusion</Label>
              <Textarea value={conclusion} onChange={(e) => setConclusion(e.target.value)} />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={save} disabled={isSaving}>
                {isSaving ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Save className="mr-2 size-4" />}
                Enregistrer
              </Button>
              <Button variant="outline" onClick={() => previewCompteRenduExamen(item.id).catch((e) => toast.error(e.message))}>
                Prévisualiser
              </Button>
              <Button
                variant="outline"
                onClick={() => downloadCompteRenduExamen(item.id, item.patient).catch((e) => toast.error(e.message))}
              >
                <FileDown className="mr-2 size-4" /> PDF
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  updateWorklistStatut(item.id, { statutCr: "signe" })
                    .then((u) => {
                      onUpdated?.(u);
                      toast.success("Compte rendu marqué comme signé.");
                    })
                    .catch((e: unknown) => toast.error(e instanceof Error ? e.message : "Mise à jour impossible"))
                }
              >
                Valider / signer
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="imagerie" className="mt-4 space-y-3">
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => onOpenImagerie?.(item)} disabled={!onOpenImagerie}>
                <ScanLine className="mr-2 size-4" /> Ouvrir la visionneuse
              </Button>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-input px-3 py-2 text-sm">
                <Upload className="size-4" />
                Ajouter des images
                <input
                  type="file"
                  className="hidden"
                  accept=".jpg,.jpeg,.png,.pdf,.dcm,.dicom,image/jpeg,image/png,application/pdf"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (!file || !item.patientId) {
                      if (!item.patientId) toast.error("Patient introuvable pour cet examen.");
                      return;
                    }
                    try {
                      const doc = await uploadDocument({
                        patientId: item.patientId,
                        examenId: item.id,
                        type: "imagerie",
                        file,
                      });
                      setDocs((list) => [doc, ...list]);
                      toast.success("Fichier importé.");
                    } catch (err) {
                      toast.error(err instanceof Error ? err.message : "Import impossible.");
                    }
                  }}
                />
              </label>
            </div>
            {docs.length === 0 ? (
              <EmptyState
                icon={ScanLine}
                title="Aucune image liée à cet examen"
                description="Importez un fichier réellement supporté (JPG, PNG, PDF, DICOM). Aucune étude PACS n'est simulée."
                compact
              />
            ) : (
              <ul className="space-y-2">
                {docs.map((doc) => (
                  <li key={doc.id} className="rounded-lg border border-border px-3 py-2 text-sm">
                    <p className="font-medium">{doc.nomOriginal}</p>
                    <p className="text-xs text-muted-foreground">
                      {doc.type} · {Math.round(doc.taille / 1024)} Ko
                      {isImageDocument(doc) ? " · image" : isDicomDocument(doc) ? " · DICOM (fichier conservé tel quel)" : ""}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>

          <TabsContent value="facture" className="mt-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Total" value={formatMAD(total)} />
              <Field label="Avance" value={formatMAD(paid)} />
              <Field label="Reste" value={formatMAD(reste)} />
            </div>
            {paiements.length > 0 ? (
              <ul className="space-y-2">
                {paiements.map((p) => (
                  <li key={p.id} className="flex justify-between rounded-md border border-border px-3 py-2 text-sm">
                    <span>
                      {formatMAD(Number(p.montant))} · {p.mode}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {p.createdAt ? String(p.createdAt).replace("T", " ").slice(0, 16) : ""} {p.createdBy ?? ""}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Aucun paiement enregistré.</p>
            )}
            {reste > 0 ? (
              <div className="grid gap-2 sm:grid-cols-[1fr_8rem_auto]">
                <Input
                  type="number"
                  min={0}
                  max={reste}
                  step="0.01"
                  placeholder="Montant"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                />
                <select
                  className="h-10 rounded-md border border-input bg-background px-2 text-sm"
                  value={payMode}
                  onChange={(e) => setPayMode(e.target.value)}
                >
                  <option value="especes">Espèces</option>
                  <option value="carte">Carte</option>
                  <option value="virement">Virement</option>
                  <option value="cheque">Chèque</option>
                  <option value="autre">Autre</option>
                </select>
                <Button
                  onClick={async () => {
                    const amount = Number(payAmount);
                    if (!amount || amount <= 0 || amount > reste) {
                      toast.error("Montant invalide (avance ≤ reste).");
                      return;
                    }
                    try {
                      const updated = await recordPaiement(item.id, { montant: amount, mode: payMode });
                      onUpdated?.(updated);
                      setPayAmount("");
                      const list = await fetchPaiements(item.id);
                      setPaiements(list);
                      toast.success("Paiement enregistré.");
                    } catch (e) {
                      toast.error(e instanceof Error ? e.message : "Paiement refusé.");
                    }
                  }}
                >
                  Encaisser
                </Button>
              </div>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() =>
                  downloadFactureExamen(item.id, item.patient).catch((e) =>
                    toast.error(e instanceof Error ? e.message : "Téléchargement impossible"),
                  )
                }
              >
                <Receipt className="mr-2 size-4" /> Télécharger PDF
              </Button>
              <Button variant="outline" onClick={() => previewFactureExamen(item.id).catch((e) => toast.error(e.message))}>
                Prévisualiser
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="dossier" className="mt-4 space-y-3">
            <Field label="Statut" value={item.dossierStatut} />
            <Field label="Remis le" value={item.dossierRemisAt} />
            <Field label="Par" value={item.dossierRemisPar} />
            <div className="flex flex-wrap gap-2">
              {(["a_preparer", "pret", "remis", "non_remis", "envoye"] as const).map((s) => (
                <Button
                  key={s}
                  size="sm"
                  variant={item.dossierStatut === s ? "default" : "outline"}
                  onClick={() =>
                    updateWorklistStatut(item.id, { dossierStatut: s })
                      .then((u) => {
                        onUpdated?.(u);
                        toast.success("Statut dossier mis à jour.");
                      })
                      .catch((e: unknown) => toast.error(e instanceof Error ? e.message : "Mise à jour impossible"))
                  }
                >
                  {s.replace("_", " ")}
                </Button>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="historique" className="mt-4">
            {item.historique && item.historique.length > 0 ? (
              <ul className="space-y-3">
                {item.historique.map((h, i) => (
                  <li key={`${h.date}-${i}`} className="rounded-lg border border-border p-3">
                    <p className="text-sm font-medium">{h.action}</p>
                    <p className="text-xs text-muted-foreground">
                      {h.date} · {h.auteur}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState icon={History} title="Aucune action enregistrée" compact />
            )}
          </TabsContent>
        </Tabs>

        <Separator />
        <p className="text-xs text-muted-foreground">RadioCRM — Centre d&apos;imagerie médicale</p>
      </SheetContent>
    </Sheet>
  );
}
