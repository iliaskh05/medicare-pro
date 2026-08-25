import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Stethoscope, Wallet, Save, RotateCcw, FileDown } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ActionButton } from "@/components/action-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader, Pill, IconTile } from "@/components/ui-kit";
import { fetchInvoices, submitInvoice, type InvoicePayload } from "@/lib/api/billing";
import { fetchPatients, type PatientRow } from "@/lib/api/patients";
import { fetchPrescripteurs } from "@/lib/api/dashboard";
import { formatMAD, typesExamen, type Facture, type Medecin } from "@/types/domain";
import { telechargerDossierPdf } from "@/lib/pdf-export";

export const Route = createFileRoute("/facturation")({
  head: () => ({
    meta: [
      { title: "Saisie des actes & facturation — RadioCRM" },
      {
        name: "description",
        content:
          "Enregistrez un examen d'imagerie, la part mutuelle et le reste à charge patient en MAD, puis suivez l'historique des factures.",
      },
      { property: "og:title", content: "Saisie des actes & facturation — RadioCRM" },
      {
        property: "og:description",
        content: "Formulaire de saisie des actes et historique des factures du centre.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: FacturationPage,
});

const statutTone = {
  Payé: "success",
  "En attente de mutuelle": "warning",
  Annulé: "destructive",
} as const;

const modesPaiement: { value: InvoicePayload["modePaiement"]; label: string }[] = [
  { value: "espèces", label: "Espèces" },
  { value: "carte", label: "Carte bancaire" },
  { value: "chèque", label: "Chèque" },
  { value: "virement", label: "Virement" },
];

const emptyForm = {
  patientId: "",
  examen: "",
  medecinId: "",
  dateActe: "",
  observations: "",
  total: 0,
  partMutuelle: 0,
  modePaiement: "carte" as InvoicePayload["modePaiement"],
};

function FacturationPage() {
  const [factures, setFactures] = useState<Facture[]>([]);
  const [patients, setPatients] = useState<PatientRow[]>([]);
  const [medecins, setMedecins] = useState<Medecin[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [form, setForm] = useState(emptyForm);

  const reste = Math.max(0, form.total - form.partMutuelle);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);

    Promise.all([
      fetchInvoices(controller.signal),
      fetchPatients(controller.signal),
      fetchPrescripteurs(controller.signal),
    ])
      .then(([invoices, patientRows, medecinRows]) => {
        setFactures(invoices);
        setPatients(patientRows);
        setMedecins(medecinRows);
      })
      .catch((e: unknown) => {
        if (controller.signal.aborted) return;
        setFactures([]);
        setPatients([]);
        setMedecins([]);
        setError(e instanceof Error ? e : new Error("Service indisponible"));
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, [reloadKey]);

  const retry = useCallback(() => setReloadKey((k) => k + 1), []);

  const enregistrer = useCallback(async () => {
    const patient = patients.find((p) => p.id === form.patientId);
    await submitInvoice({
      patientId: form.patientId,
      patientName: patient?.nomComplet ?? "",
      acte: form.examen,
      montant: form.total,
      acompte: 0,
      modePaiement: form.modePaiement,
    });
  }, [form, patients]);

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Gestion"
        title="Facturation"
        subtitle="Actes, encaissements et historique des factures du centre"
        actions={
          <ActionButton
            variant="outline"
            toastKind="info"
            toastMessage="Formulaire de saisie réinitialisé."
            onDone={() => setForm(emptyForm)}
          >
            <RotateCcw className="mr-2 size-4" /> Réinitialiser
          </ActionButton>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center gap-3">
            <IconTile tone="primary">
              <Stethoscope className="size-5" />
            </IconTile>
            <div>
              <CardTitle>Informations médicales</CardTitle>
              <p className="text-sm text-muted-foreground">Patient, examen et prescripteur</p>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Patient</Label>
              <Select
                value={form.patientId}
                onValueChange={(patientId) => setForm((f) => ({ ...f, patientId }))}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      patients.length === 0 ? "Aucun patient disponible" : "Sélectionner un patient"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {patients.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nomComplet} — {p.cin}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Type d'examen</Label>
              <Select
                value={form.examen}
                onValueChange={(examen) => setForm((f) => ({ ...f, examen }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un examen" />
                </SelectTrigger>
                <SelectContent>
                  {typesExamen.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Médecin prescripteur</Label>
                <Select
                  value={form.medecinId}
                  onValueChange={(medecinId) => setForm((f) => ({ ...f, medecinId }))}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        medecins.length === 0 ? "Aucun prescripteur disponible" : "Sélectionner"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {medecins.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.nom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="date-acte">Date de l'acte</Label>
                <Input
                  id="date-acte"
                  type="date"
                  value={form.dateActe}
                  onChange={(e) => setForm((f) => ({ ...f, dateActe: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="obs">Observations</Label>
              <Textarea
                id="obs"
                rows={3}
                value={form.observations}
                onChange={(e) => setForm((f) => ({ ...f, observations: e.target.value }))}
                placeholder="Indication clinique, antécédents…"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center gap-3">
            <IconTile tone="success">
              <Wallet className="size-5" />
            </IconTile>
            <div>
              <CardTitle>Finances</CardTitle>
              <p className="text-sm text-muted-foreground">Montants en dirhams (MAD)</p>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="total">Montant total (MAD)</Label>
                <Input
                  id="total"
                  type="number"
                  value={form.total}
                  onChange={(e) => setForm((f) => ({ ...f, total: Number(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="part">Part mutuelle (MAD)</Label>
                <Input
                  id="part"
                  type="number"
                  value={form.partMutuelle}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, partMutuelle: Number(e.target.value) || 0 }))
                  }
                />
              </div>
            </div>

            <div className="rounded-xl border border-border bg-primary-soft/60 p-4">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Reste à charge patient
              </p>
              <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums text-foreground">
                {formatMAD(reste)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Taux de prise en charge :{" "}
                {form.total > 0 ? Math.round((form.partMutuelle / form.total) * 100) : 0} %
              </p>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>Mode de paiement</Label>
              <Select
                value={form.modePaiement}
                onValueChange={(modePaiement) =>
                  setForm((f) => ({
                    ...f,
                    modePaiement: modePaiement as InvoicePayload["modePaiement"],
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {modesPaiement.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <ActionButton
              className="w-full"
              disabled={!form.patientId || !form.examen || form.total <= 0}
              action={enregistrer}
              toastMessage="Acte enregistré et facture générée."
              errorMessage="Enregistrement impossible pour le moment"
              onDone={() => {
                setForm(emptyForm);
                retry();
              }}
            >
              <Save className="mr-2 size-4" /> Enregistrer l'acte
            </ActionButton>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Historique des factures</CardTitle>
          <p className="text-sm text-muted-foreground">Dernières saisies du secrétariat</p>
        </CardHeader>
        <CardContent className="px-0">
          {isLoading ? (
            <div className="space-y-3 px-6">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : factures.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">Facture</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead className="hidden md:table-cell">Examen</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="hidden text-right lg:table-cell">Mutuelle</TableHead>
                    <TableHead className="text-right">Reste</TableHead>
                    <TableHead className="hidden md:table-cell">Paiement</TableHead>
                    <TableHead className="text-right">Statut</TableHead>
                    <TableHead className="pr-6 text-right">Dossier</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {factures.map((f) => (
                    <TableRow key={f.id}>
                      <TableCell className="pl-6">
                        <p className="font-mono text-xs font-semibold">{f.id}</p>
                        <p className="text-xs text-muted-foreground">{f.date}</p>
                      </TableCell>
                      <TableCell className="font-medium">{f.patient}</TableCell>
                      <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                        {f.examen}
                      </TableCell>
                      <TableCell className="text-right text-sm">{formatMAD(f.total)}</TableCell>
                      <TableCell className="hidden text-right text-sm text-muted-foreground lg:table-cell">
                        {formatMAD(f.partMutuelle)}
                      </TableCell>
                      <TableCell className="text-right text-sm font-semibold">
                        {formatMAD(f.resteACharge)}
                      </TableCell>
                      <TableCell className="hidden text-sm md:table-cell">{f.paiement}</TableCell>
                      <TableCell className="text-right">
                        <Pill tone={statutTone[f.statut]}>{f.statut}</Pill>
                      </TableCell>
                      <TableCell className="pr-6 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5"
                          onClick={() =>
                            void telechargerDossierPdf({
                              titre: "Dossier de facturation",
                              reference: f.id,
                              lignes: [
                                { label: "Patient", valeur: f.patient },
                                { label: "Examen", valeur: f.examen },
                                { label: "Date", valeur: f.date },
                                { label: "Total facturé", valeur: formatMAD(f.total) },
                                { label: "Part mutuelle", valeur: formatMAD(f.partMutuelle) },
                                {
                                  label: "Reste à charge patient",
                                  valeur: formatMAD(f.resteACharge),
                                },
                                { label: "Mode de paiement", valeur: f.paiement },
                                { label: "Statut", valeur: f.statut },
                              ],
                              blocs: [
                                {
                                  titre: "Mention légale",
                                  contenu:
                                    "Facture émise en dirhams marocains (MAD). Document valable comme justificatif de remboursement auprès de la mutuelle.",
                                },
                              ],
                            })
                          }
                        >
                          <FileDown className="size-4" />
                          Télécharger (PDF)
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
