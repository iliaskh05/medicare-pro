import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { BookMarked, Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader, Pill } from "@/components/ui-kit";
import {
  createAnatomicalZone,
  createPathology,
  createPathologyFamily,
  fetchAnatomicalZones,
  fetchPathologies,
  fetchPathologyFamilies,
  patchAnatomicalZone,
  patchPathology,
  patchPathologyFamily,
  type DictionaryItem,
} from "@/lib/api/dictionaries";

export const Route = createFileRoute("/dictionnaires")({
  head: () => ({ meta: [{ title: "Dictionnaires médicaux | RadioCRM" }] }),
  component: DictionnairesPage,
});

function DictionnairesPage() {
  const [zones, setZones] = useState<DictionaryItem[]>([]);
  const [families, setFamilies] = useState<DictionaryItem[]>([]);
  const [pathologies, setPathologies] = useState<DictionaryItem[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [z, f, p] = await Promise.all([
        fetchAnatomicalZones(false),
        fetchPathologyFamilies(false),
        fetchPathologies({ q: q || undefined }),
      ]);
      setZones(z);
      setFamilies(f);
      setPathologies(p);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Chargement impossible");
    } finally {
      setLoading(false);
    }
  }, [q]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Administration"
        title="Dictionnaires médicaux"
        subtitle="Zones anatomiques, familles et pathologies — référentiel centre"
      />

      <Tabs defaultValue="zones">
        <TabsList>
          <TabsTrigger value="zones">Zones anatomiques</TabsTrigger>
          <TabsTrigger value="families">Familles</TabsTrigger>
          <TabsTrigger value="pathologies">Pathologies</TabsTrigger>
        </TabsList>

        <TabsContent value="zones" className="space-y-4">
          <DictCreate
            onCreate={async (code, label) => {
              await createAnatomicalZone({ code, label });
              await reload();
            }}
          />
          <DictList
            loading={loading}
            items={zones}
            onToggle={async (item, active) => {
              await patchAnatomicalZone(item.id, { active });
              await reload();
            }}
          />
        </TabsContent>

        <TabsContent value="families" className="space-y-4">
          <DictCreate
            onCreate={async (code, label) => {
              await createPathologyFamily({ code, label });
              await reload();
            }}
          />
          <DictList
            loading={loading}
            items={families}
            onToggle={async (item, active) => {
              await patchPathologyFamily(item.id, { active });
              await reload();
            }}
          />
        </TabsContent>

        <TabsContent value="pathologies" className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Filtrer pathologie…"
              className="max-w-sm"
            />
            <Button variant="outline" onClick={() => void reload()}>
              Filtrer
            </Button>
          </div>
          <DictCreate
            onCreate={async (code, label) => {
              await createPathology({ code, label });
              await reload();
            }}
          />
          <DictList
            loading={loading}
            items={pathologies}
            subtitle={(i) => i.familyLabel || undefined}
            onToggle={async (item, active) => {
              await patchPathology(item.id, { active });
              await reload();
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DictCreate({ onCreate }: { onCreate: (code: string, label: string) => Promise<void> }) {
  const [code, setCode] = useState("");
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Plus className="size-4" /> Ajouter
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label>Code</Label>
          <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="THORAX" />
        </div>
        <div className="space-y-1">
          <Label>Libellé</Label>
          <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Thorax" />
        </div>
        <Button
          disabled={busy || !code.trim() || !label.trim()}
          onClick={() => {
            setBusy(true);
            void onCreate(code.trim(), label.trim())
              .then(() => {
                setCode("");
                setLabel("");
                toast.success("Entrée créée");
              })
              .catch((e: unknown) => toast.error(e instanceof Error ? e.message : "Erreur"))
              .finally(() => setBusy(false));
          }}
        >
          Enregistrer
        </Button>
      </CardContent>
    </Card>
  );
}

function DictList({
  items,
  loading,
  onToggle,
  subtitle,
}: {
  items: DictionaryItem[];
  loading: boolean;
  onToggle: (item: DictionaryItem, active: boolean) => Promise<void>;
  subtitle?: (item: DictionaryItem) => string | undefined;
}) {
  if (loading) return <p className="text-sm text-muted-foreground">Chargement…</p>;
  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center gap-3 p-6 text-sm text-muted-foreground">
          <BookMarked className="size-4" /> Aucune entrée — créez le référentiel du centre.
        </CardContent>
      </Card>
    );
  }
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <Card key={item.id}>
          <CardContent className="flex items-center justify-between gap-3 p-4">
            <div>
              <p className="font-medium">
                {item.label}{" "}
                <span className="font-mono text-xs text-muted-foreground">{item.code}</span>
              </p>
              {subtitle?.(item) ? (
                <p className="text-xs text-muted-foreground">{subtitle(item)}</p>
              ) : null}
            </div>
            <div className="flex items-center gap-3">
              <Pill tone={item.active ? "success" : "neutral"}>
                {item.active ? "Actif" : "Inactif"}
              </Pill>
              <Switch
                checked={item.active}
                onCheckedChange={(v) => {
                  void onToggle(item, v).catch((e: unknown) =>
                    toast.error(e instanceof Error ? e.message : "Mise à jour impossible"),
                  );
                }}
              />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
