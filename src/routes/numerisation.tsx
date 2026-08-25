import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { FileUp, Printer, QrCode, ScanLine, Tags } from "lucide-react";
import { toast } from "sonner";

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

export const Route = createFileRoute("/numerisation")({
  head: () => ({
    meta: [
      { title: "Numérisation & étiquettes — Accueil | RadioCRM" },
      {
        name: "description",
        content:
          "Numérisation des ordonnances et pièces d'identité, puis impression des étiquettes patient et codes-barres de séjour.",
      },
      { property: "og:title", content: "Numérisation & étiquettes — Accueil | RadioCRM" },
      {
        property: "og:description",
        content: "Poste d'accueil : scan des documents patients et impression d'étiquettes.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: NumerisationPage,
});

function NumerisationPage() {
  const [sejour, setSejour] = useState("");
  const [format, setFormat] = useState("Étiquette 62 × 29 mm");
  const [fichiers, setFichiers] = useState<string[]>([]);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Documents"
        title="Numérisation"
        subtitle="Import de documents patients et impression d'étiquettes de séjour"
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
              <Label htmlFor="num-sejour">N° de séjour</Label>
              <Input
                id="num-sejour"
                value={sejour}
                onChange={(e) => setSejour(e.target.value)}
                placeholder="Ex. SJ-2026-000123"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="num-file">Ordonnance, CIN, mutuelle (PDF ou image)</Label>
              <Input
                id="num-file"
                type="file"
                multiple
                accept="image/*,application/pdf"
                onChange={(e) => {
                  const names = Array.from(e.target.files ?? []).map((f) => f.name);
                  setFichiers(names);
                  if (names.length > 0) toast.success(`${names.length} document(s) prêt(s) à envoyer`);
                }}
              />
            </div>
            <Button
              disabled={!sejour.trim() || fichiers.length === 0}
              onClick={() => toast.success("Documents rattachés au séjour " + sejour)}
            >
              <FileUp className="mr-2 size-4" /> Rattacher au dossier
            </Button>
            {fichiers.length > 0 ? (
              <ul className="space-y-1 text-xs text-muted-foreground">
                {fichiers.map((f) => (
                  <li key={f} className="truncate">
                    • {f}
                  </li>
                ))}
              </ul>
            ) : null}
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
            <div className="space-y-2">
              <Label>Format d&apos;étiquette</Label>
              <Select value={format} onValueChange={setFormat}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Étiquette 62 × 29 mm">Étiquette 62 × 29 mm</SelectItem>
                  <SelectItem value="Étiquette 89 × 36 mm">Étiquette 89 × 36 mm</SelectItem>
                  <SelectItem value="Planche A4 (24 étiquettes)">
                    Planche A4 (24 étiquettes)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="rounded-xl border border-dashed border-border p-4">
              <div className="flex items-center gap-3">
                <QrCode className="size-10 text-muted-foreground" aria-hidden />
                <div className="min-w-0 text-sm">
                  <p className="font-semibold">{sejour.trim() || "N° séjour —"}</p>
                  <p className="text-xs text-muted-foreground">
                    Centre d&apos;Imagerie Médicale · {format}
                  </p>
                </div>
              </div>
            </div>
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="mr-2 size-4" /> Imprimer l&apos;étiquette
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Documents numérisés récemment</CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <EmptyState
            icon={ScanLine}
            title="Aucun document disponible"
            description="Les documents numérisés apparaîtront ici dès la connexion au serveur du centre."
          />
        </CardContent>
      </Card>
    </div>
  );
}
