import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Stethoscope, Wallet, Save, RotateCcw, FileDown } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ActionButton } from "@/components/action-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
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
import { factures, medecins, patients, typesExamen, formatMAD } from "@/data/mock";
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
    ],
  }),
  component: FacturationPage,
});

const statutTone = {
  Payé: "success",
  "En attente de mutuelle": "warning",
  Annulé: "destructive",
} as const;

function FacturationPage() {
  const [total, setTotal] = useState(2500);
  const [partMutuelle, setPartMutuelle] = useState(1750);
  const reste = Math.max(0, total - partMutuelle);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Saisie des actes & facturation"
        subtitle="Enregistrement d'un examen et de sa prise en charge"
        actions={
          <ActionButton
            variant="outline"
            toastKind="info"
            toastMessage="Formulaire de saisie réinitialisé."
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
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un patient" />
                </SelectTrigger>
                <SelectContent>
                  {patients.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nom} — {p.cin}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Type d'examen</Label>
              <Select defaultValue="IRM Cérébrale">
                <SelectTrigger>
                  <SelectValue />
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
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner" />
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
                <Input id="date-acte" type="date" defaultValue="2026-08-05" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="obs">Observations</Label>
              <Textarea id="obs" rows={3} placeholder="Indication clinique, antécédents…" />
            </div>
          </CardContent>
        </Card>

        <Card data-tour="facturation-finance">
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
                  value={total}
                  onChange={(e) => setTotal(Number(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="part">Part mutuelle (MAD)</Label>
                <Input
                  id="part"
                  type="number"
                  value={partMutuelle}
                  onChange={(e) => setPartMutuelle(Number(e.target.value) || 0)}
                />
              </div>
            </div>

            <div className="rounded-xl border border-border bg-primary/5 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Reste à charge patient
              </p>
              <p className="mt-1 text-3xl font-bold tracking-tight text-primary">
                {formatMAD(reste)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Taux de prise en charge : {total > 0 ? Math.round((partMutuelle / total) * 100) : 0}{" "}
                %
              </p>
            </div>

            <Separator />

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Mode de paiement</Label>
                <Select defaultValue="Carte bancaire">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Espèces">Espèces</SelectItem>
                    <SelectItem value="Carte bancaire">Carte bancaire</SelectItem>
                    <SelectItem value="Chèque">Chèque</SelectItem>
                    <SelectItem value="Virement">Virement</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Statut de la facture</Label>
                <Select defaultValue="En attente de mutuelle">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Payé">Payé</SelectItem>
                    <SelectItem value="En attente de mutuelle">En attente de mutuelle</SelectItem>
                    <SelectItem value="Annulé">Annulé</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              className="w-full"
              onClick={() => toast.success("Acte enregistré et facture générée (démonstration)")}
            >
              <Save className="mr-2 size-4" /> Enregistrer l'acte
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Historique des dernières factures</CardTitle>
          <p className="text-sm text-muted-foreground">8 dernières saisies du secrétariat</p>
        </CardHeader>
        <CardContent className="px-0">
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
                        className="gap-1.5 border-primary/25 bg-primary/5 font-semibold text-primary shadow-sm transition-shadow hover:bg-primary/10 hover:shadow-md"
                        onClick={() =>
                          telechargerDossierPdf({
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
        </CardContent>
      </Card>
    </div>
  );
}
