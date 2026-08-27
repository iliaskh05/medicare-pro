import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Download,
  Eye,
  FilePenLine,
  FileText,
  History,
  Lock,
  RefreshCw,
  Save,
  Search,
  Send,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState, PageHeader, Pill, type Tone } from "@/components/ui-kit";
import { useRole } from "@/hooks/use-role";
import {
  amendReport,
  downloadReportPdf,
  fetchReports,
  fetchReportVersions,
  getReport,
  REPORT_STATUS_LABEL,
  saveBlob,
  saveReportDraft,
  submitReport,
  validateReport,
  type ReportStatus,
  type ReportSummary,
  type ReportVersion,
} from "@/lib/api/reports";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/comptes-rendus")({
  head: () => ({
    meta: [
      { title: "Comptes rendus — Dictée & signature | RadioCRM" },
      {
        name: "description",
        content:
          "Éditeur professionnel de comptes rendus radiologiques : brouillon, relecture, validation, amendement et export PDF.",
      },
      { property: "og:title", content: "Comptes rendus — Dictée & signature | RadioCRM" },
      {
        property: "og:description",
        content:
          "Rédaction, validation et historique de versions des comptes rendus pour le centre d'imagerie.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ComptesRendusPage,
});

type StatusFilter = "tous" | ReportStatus;
type SortKey = "date" | "patient" | "status";

type EditorFields = {
  indication: string;
  technique: string;
  resultats: string;
  conclusion: string;
};

const STATUS_FILTERS: StatusFilter[] = [
  "tous",
  "draft",
  "in_review",
  "validated",
  "amended",
];

const EMPTY_FIELDS: EditorFields = {
  indication: "",
  technique: "",
  resultats: "",
  conclusion: "",
};

function statusTone(status: ReportStatus): Tone {
  switch (status) {
    case "validated":
      return "success";
    case "in_review":
      return "warning";
    case "amended":
      return "info";
    default:
      return "neutral";
  }
}

function statusBadgeVariant(
  status: ReportStatus,
): "default" | "secondary" | "outline" | "destructive" {
  if (status === "validated") return "default";
  if (status === "in_review") return "outline";
  if (status === "amended") return "secondary";
  return "secondary";
}

function isEditableStatus(status: ReportStatus): boolean {
  return status === "draft" || status === "in_review" || status === "amended";
}

function fieldsFromReport(report: ReportSummary): EditorFields {
  const indication = report.indication ?? "";
  const technique = report.technique ?? "";
  const resultats = report.resultats ?? "";
  const conclusion = report.conclusion ?? "";
  const hasStructured = Boolean(indication || technique || resultats || conclusion);
  if (hasStructured) {
    return { indication, technique, resultats, conclusion };
  }
  const fallback = report.body ?? report.texte ?? "";
  return {
    indication: "",
    technique: "",
    resultats: fallback,
    conclusion: "",
  };
}

function fieldsFromVersion(version: ReportVersion): EditorFields {
  const indication = version.indication ?? "";
  const technique = version.technique ?? "";
  const resultats = version.resultats ?? "";
  const conclusion = version.conclusion ?? "";
  if (indication || technique || resultats || conclusion) {
    return { indication, technique, resultats, conclusion };
  }
  return {
    indication: "",
    technique: "",
    resultats: version.body ?? "",
    conclusion: "",
  };
}

function formatReportDate(value: string): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function buildMarkdownPreview(fields: EditorFields, report: ReportSummary | null): string {
  const lines = [
    `# Compte rendu`,
    report ? `**Patient :** ${report.patientName || "—"}` : "",
    report ? `**Examen :** ${report.examLabel || "—"}` : "",
    report ? `**Radiologue :** ${report.radiologist || "—"}` : "",
    "",
    `## Indication`,
    fields.indication.trim() || "_Non renseignée_",
    "",
    `## Technique`,
    fields.technique.trim() || "_Non renseignée_",
    "",
    `## Résultats`,
    fields.resultats.trim() || "_Non renseignés_",
    "",
    `## Conclusion`,
    fields.conclusion.trim() || "_Non renseignée_",
  ];
  return lines.filter((l) => l !== undefined).join("\n");
}

function ComptesRendusPage() {
  const { canAccess, canEdit, canValidate } = useRole();
  const allowed = canAccess("reports");
  const editable = canEdit("reports");
  const canVal = canValidate("reports");

  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("tous");
  const [sortKey, setSortKey] = useState<SortKey>("date");

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selected, setSelected] = useState<ReportSummary | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [versions, setVersions] = useState<ReportVersion[]>([]);
  const [versionsLoading, setVersionsLoading] = useState(false);

  const [fields, setFields] = useState<EditorFields>(EMPTY_FIELDS);
  const [previewVersion, setPreviewVersion] = useState<ReportVersion | null>(null);
  const [actionBusy, setActionBusy] = useState(false);

  const [amendOpen, setAmendOpen] = useState(false);
  const [amendReason, setAmendReason] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    if (!allowed) {
      setIsLoading(false);
      return;
    }
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);

    fetchReports(undefined, controller.signal)
      .then((rows) => {
        setReports(rows);
        setSelectedId((prev) => {
          if (prev && rows.some((r) => r.id === prev)) return prev;
          return rows[0]?.id ?? null;
        });
      })
      .catch((e: unknown) => {
        if (controller.signal.aborted) return;
        setReports([]);
        setSelectedId(null);
        setSelected(null);
        setError(e instanceof Error ? e.message : "Impossible de charger les comptes rendus.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, [reloadKey, allowed]);

  useEffect(() => {
    if (!selectedId || !allowed) {
      setSelected(null);
      setFields(EMPTY_FIELDS);
      setVersions([]);
      setPreviewVersion(null);
      return;
    }

    const controller = new AbortController();
    setDetailLoading(true);
    setVersionsLoading(true);
    setPreviewVersion(null);

    getReport(selectedId, controller.signal)
      .then((report) => {
        setSelected(report);
        setFields(fieldsFromReport(report));
        setReports((prev) => prev.map((r) => (r.id === report.id ? { ...r, ...report } : r)));
      })
      .catch((e: unknown) => {
        if (controller.signal.aborted) return;
        toast.error(e instanceof Error ? e.message : "Chargement du compte rendu impossible");
      })
      .finally(() => {
        if (!controller.signal.aborted) setDetailLoading(false);
      });

    fetchReportVersions(selectedId, controller.signal)
      .then((rows) => setVersions(rows))
      .catch(() => {
        if (!controller.signal.aborted) setVersions([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) setVersionsLoading(false);
      });

    return () => controller.abort();
  }, [selectedId, allowed, reloadKey]);

  const counts = useMemo(() => {
    const base: Record<StatusFilter, number> = {
      tous: reports.length,
      draft: 0,
      in_review: 0,
      validated: 0,
      amended: 0,
    };
    for (const r of reports) {
      if (r.status in base) base[r.status] += 1;
    }
    return base;
  }, [reports]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = reports.filter((r) => {
      const matchStatus = statusFilter === "tous" || r.status === statusFilter;
      const matchQuery =
        !q ||
        r.patientName.toLowerCase().includes(q) ||
        r.examLabel.toLowerCase().includes(q) ||
        r.radiologist.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q);
      return matchStatus && matchQuery;
    });

    const sorted = [...list];
    sorted.sort((a, b) => {
      if (sortKey === "patient") {
        return a.patientName.localeCompare(b.patientName, "fr");
      }
      if (sortKey === "status") {
        return a.status.localeCompare(b.status);
      }
      return (b.createdAt || "").localeCompare(a.createdAt || "");
    });
    return sorted;
  }, [reports, query, statusFilter, sortKey]);

  const readOnly =
    Boolean(previewVersion) ||
    !editable ||
    !selected ||
    !isEditableStatus(selected.status);

  const updateField = (key: keyof EditorFields, value: string) => {
    setFields((prev) => ({ ...prev, [key]: value }));
  };

  const applyReportUpdate = (report: ReportSummary) => {
    setSelected(report);
    setFields(fieldsFromReport(report));
    setPreviewVersion(null);
    setReports((prev) => {
      const exists = prev.some((r) => r.id === report.id);
      if (!exists) return [report, ...prev];
      return prev.map((r) => (r.id === report.id ? { ...r, ...report } : r));
    });
  };

  const refreshVersions = async (id: string) => {
    try {
      const rows = await fetchReportVersions(id);
      setVersions(rows);
    } catch {
      /* keep previous */
    }
  };

  const handleSave = async () => {
    if (!selected || readOnly) return;
    setActionBusy(true);
    try {
      const updated = await saveReportDraft(selected.id, { ...fields });
      applyReportUpdate(updated);
      toast.success("Brouillon enregistré");
      await refreshVersions(selected.id);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Enregistrement impossible");
    } finally {
      setActionBusy(false);
    }
  };

  const handleSubmit = async () => {
    if (!selected || selected.status !== "draft" || !editable) return;
    setActionBusy(true);
    try {
      await saveReportDraft(selected.id, { ...fields });
      const updated = await submitReport(selected.id);
      applyReportUpdate(updated);
      toast.success("Compte rendu soumis pour relecture");
      await refreshVersions(selected.id);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Soumission impossible");
    } finally {
      setActionBusy(false);
    }
  };

  const handleValidate = async () => {
    if (!selected || !canVal) return;
    if (selected.status !== "in_review" && selected.status !== "amended") return;
    setActionBusy(true);
    try {
      if (isEditableStatus(selected.status) && editable) {
        await saveReportDraft(selected.id, { ...fields });
      }
      const updated = await validateReport(selected.id);
      applyReportUpdate(updated);
      toast.success("Compte rendu validé");
      await refreshVersions(selected.id);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Validation impossible");
    } finally {
      setActionBusy(false);
    }
  };

  const handleAmend = async () => {
    if (!selected || selected.status !== "validated" || !editable) return;
    const reason = amendReason.trim();
    if (!reason) {
      toast.error("Indiquez le motif d'amendement");
      return;
    }
    setActionBusy(true);
    try {
      const updated = await amendReport(selected.id, { reason, ...fields });
      applyReportUpdate(updated);
      setAmendOpen(false);
      setAmendReason("");
      toast.success("Compte rendu amendé — nouvelle version ouverte");
      await refreshVersions(selected.id);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Amendement impossible");
    } finally {
      setActionBusy(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!selected) return;
    setActionBusy(true);
    try {
      const blob = await downloadReportPdf(selected.id);
      const safeName = (selected.patientName || "compte-rendu")
        .replace(/[^\w\-]+/g, "_")
        .slice(0, 48);
      saveBlob(blob, `CR_${safeName}_v${selected.currentVersion ?? 1}.pdf`);
      setPreviewOpen(false);
      toast.success("PDF téléchargé");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Téléchargement PDF impossible");
    } finally {
      setActionBusy(false);
    }
  };

  const openVersionPreview = (version: ReportVersion) => {
    setPreviewVersion(version);
    setFields(fieldsFromVersion(version));
  };

  const restoreCurrentVersion = () => {
    if (!selected) return;
    setPreviewVersion(null);
    setFields(fieldsFromReport(selected));
  };

  if (!allowed) {
    return (
      <div className="page-shell">
        <PageHeader
          eyebrow="Activité médicale"
          title="Comptes rendus"
          subtitle="Accès restreint"
        />
        <EmptyState
          icon={Lock}
          title="Accès non autorisé"
          description="Votre rôle ne permet pas de consulter les comptes rendus."
        />
      </div>
    );
  }

  return (
    <div className="page-shell flex min-h-0 flex-col gap-4">
      <PageHeader
        eyebrow="Activité médicale"
        title="Comptes rendus"
        subtitle={
          isLoading
            ? "Chargement…"
            : error
              ? "Erreur de chargement"
              : `${reports.length} compte(s) rendu(s) — rédaction, validation et historique`
        }
        actions={
          <Button variant="outline" onClick={() => setReloadKey((k) => k + 1)} disabled={isLoading}>
            <RefreshCw className={cn("mr-2 size-4", isLoading && "animate-spin")} />
            Actualiser
          </Button>
        }
      />

      {error ? (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3"
        >
          <p className="min-w-0 flex-1 text-sm text-destructive">{error}</p>
          <Button variant="outline" size="sm" onClick={() => setReloadKey((k) => k + 1)}>
            <RefreshCw className="mr-2 size-4" /> Réessayer
          </Button>
        </div>
      ) : null}

      <div className="app-surface grid min-h-[calc(100dvh-14rem)] flex-1 overflow-hidden lg:grid-cols-[300px_minmax(0,1fr)_280px]">
        {/* Left: list + filters */}
        <aside className="flex min-h-0 flex-col border-b border-border lg:border-b-0 lg:border-r">
          <div className="space-y-3 border-b border-border p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Rechercher un compte rendu"
                placeholder="Patient, examen, radiologue…"
                className="pl-9"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {STATUS_FILTERS.map((key) => {
                const label = key === "tous" ? "Tous" : REPORT_STATUS_LABEL[key];
                const active = statusFilter === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setStatusFilter(key)}
                    className={cn(
                      "rounded-md transition-opacity",
                      active ? "opacity-100" : "opacity-70 hover:opacity-100",
                    )}
                  >
                    <Pill tone={active ? (key === "tous" ? "primary" : statusTone(key)) : "neutral"}>
                      {label}
                      <span className="tabular-nums opacity-80">{counts[key]}</span>
                    </Pill>
                  </button>
                );
              })}
            </div>
            <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
              <SelectTrigger aria-label="Trier la liste" className="h-9">
                <SelectValue placeholder="Trier par…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Plus récents</SelectItem>
                <SelectItem value="patient">Patient (A→Z)</SelectItem>
                <SelectItem value="status">Statut</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <ScrollArea className="min-h-0 flex-1">
            <div aria-busy={isLoading} className="p-2">
              {isLoading ? (
                <div className="space-y-2 p-1">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <Skeleton key={`sk-${i}`} className="h-[4.5rem] w-full rounded-lg" />
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <EmptyState
                  compact
                  icon={FileText}
                  title="Aucun compte rendu"
                  description="Aucun résultat pour ces critères."
                />
              ) : (
                <ul className="space-y-1">
                  {filtered.map((r) => {
                    const active = r.id === selectedId;
                    return (
                      <li key={r.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedId(r.id)}
                          className={cn(
                            "w-full rounded-lg border px-3 py-2.5 text-left transition-colors",
                            active
                              ? "border-primary/40 bg-primary/5"
                              : "border-transparent hover:bg-muted/60",
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="truncate text-sm font-semibold">{r.patientName || "—"}</p>
                            <Badge variant={statusBadgeVariant(r.status)} className="shrink-0 text-[10px]">
                              {REPORT_STATUS_LABEL[r.status] ?? r.status}
                            </Badge>
                          </div>
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">
                            {r.examLabel || "Examen non précisé"}
                          </p>
                          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
                            <span className="truncate">{r.radiologist || "—"}</span>
                            <span aria-hidden>·</span>
                            <span>{formatReportDate(r.createdAt)}</span>
                            <span aria-hidden>·</span>
                            <span className="tabular-nums">v{r.currentVersion ?? 1}</span>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </ScrollArea>
        </aside>

        {/* Center: editor */}
        <section className="flex min-h-0 min-w-0 flex-col border-b border-border lg:border-b-0 lg:border-r">
          {!selected && !detailLoading ? (
            <div className="flex flex-1 items-center justify-center p-6">
              <EmptyState
                icon={FilePenLine}
                title="Sélectionnez un compte rendu"
                description="Choisissez un dossier dans la liste pour rédiger ou valider."
              />
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-4 py-3">
                <div className="min-w-0">
                  {detailLoading ? (
                    <div className="space-y-2">
                      <Skeleton className="h-5 w-48" />
                      <Skeleton className="h-4 w-64" />
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="truncate text-base font-semibold">
                          {selected?.patientName || "Compte rendu"}
                        </h2>
                        {selected ? (
                          <Pill tone={statusTone(selected.status)}>
                            {REPORT_STATUS_LABEL[selected.status]}
                          </Pill>
                        ) : null}
                        {previewVersion ? (
                          <Pill tone="warning">Aperçu v{previewVersion.versionNumber}</Pill>
                        ) : null}
                        {readOnly && !previewVersion ? (
                          <Pill tone="neutral">
                            <Lock className="size-3" /> Lecture seule
                          </Pill>
                        ) : null}
                      </div>
                      <p className="mt-1 truncate text-sm text-muted-foreground">
                        {selected?.examLabel || "—"}
                        {selected?.radiologist ? ` · ${selected.radiologist}` : ""}
                        {selected ? ` · v${selected.currentVersion ?? 1}` : ""}
                      </p>
                    </>
                  )}
                </div>

                {selected && !detailLoading ? (
                  <div className="flex flex-wrap items-center gap-2">
                    {previewVersion ? (
                      <Button variant="outline" size="sm" onClick={restoreCurrentVersion}>
                        Revenir à la version courante
                      </Button>
                    ) : null}

                    {selected.status === "draft" && editable && !previewVersion ? (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={actionBusy}
                          onClick={() => void handleSave()}
                        >
                          <Save className="mr-1.5 size-4" /> Enregistrer
                        </Button>
                        <Button size="sm" disabled={actionBusy} onClick={() => void handleSubmit()}>
                          <Send className="mr-1.5 size-4" /> Soumettre
                        </Button>
                      </>
                    ) : null}

                    {selected.status === "in_review" && !previewVersion ? (
                      <>
                        {editable ? (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={actionBusy}
                            onClick={() => void handleSave()}
                          >
                            <Save className="mr-1.5 size-4" /> Enregistrer
                          </Button>
                        ) : null}
                        {canVal ? (
                          <Button
                            size="sm"
                            disabled={actionBusy}
                            onClick={() => void handleValidate()}
                          >
                            <CheckCircle2 className="mr-1.5 size-4" /> Valider
                          </Button>
                        ) : null}
                      </>
                    ) : null}

                    {selected.status === "validated" && !previewVersion ? (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={actionBusy}
                          onClick={() => setPreviewOpen(true)}
                        >
                          <Eye className="mr-1.5 size-4" /> PDF
                        </Button>
                        {editable ? (
                          <Button
                            size="sm"
                            disabled={actionBusy}
                            onClick={() => {
                              setAmendReason("");
                              setAmendOpen(true);
                            }}
                          >
                            <FilePenLine className="mr-1.5 size-4" /> Amender
                          </Button>
                        ) : null}
                      </>
                    ) : null}

                    {selected.status === "amended" && !previewVersion ? (
                      <>
                        {editable ? (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={actionBusy}
                            onClick={() => void handleSave()}
                          >
                            <Save className="mr-1.5 size-4" /> Enregistrer
                          </Button>
                        ) : null}
                        {canVal ? (
                          <Button
                            size="sm"
                            disabled={actionBusy}
                            onClick={() => void handleValidate()}
                          >
                            <CheckCircle2 className="mr-1.5 size-4" /> Valider
                          </Button>
                        ) : null}
                      </>
                    ) : null}
                  </div>
                ) : null}
              </div>

              <ScrollArea className="min-h-0 flex-1">
                <div className="space-y-4 p-4">
                  {detailLoading ? (
                    <div className="space-y-4">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <div key={`ed-sk-${i}`} className="space-y-2">
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="h-24 w-full" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <>
                      {(
                        [
                          ["indication", "Indication"],
                          ["technique", "Technique"],
                          ["resultats", "Résultats"],
                          ["conclusion", "Conclusion"],
                        ] as const
                      ).map(([key, label]) => (
                        <div key={key} className="space-y-2">
                          <Label htmlFor={`cr-${key}`}>{label}</Label>
                          <Textarea
                            id={`cr-${key}`}
                            value={fields[key]}
                            onChange={(e) => updateField(key, e.target.value)}
                            readOnly={readOnly}
                            disabled={readOnly}
                            rows={key === "resultats" ? 8 : 4}
                            placeholder={
                              readOnly
                                ? "—"
                                : `Saisir ${label.toLowerCase()}…`
                            }
                            className={cn(
                              "min-h-[5.5rem] resize-y",
                              readOnly && "bg-muted/40",
                            )}
                          />
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </ScrollArea>
            </>
          )}
        </section>

        {/* Right: context + versions */}
        <aside className="flex min-h-0 flex-col">
          <div className="border-b border-border px-4 py-3">
            <h3 className="text-sm font-semibold">Contexte</h3>
          </div>
          <ScrollArea className="min-h-0 flex-1">
            <div className="space-y-4 p-4">
              {detailLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              ) : selected ? (
                <dl className="space-y-3 text-sm">
                  <div>
                    <dt className="text-xs text-muted-foreground">Patient</dt>
                    <dd className="font-medium">{selected.patientName || "—"}</dd>
                    {selected.patientId ? (
                      <dd className="text-xs text-muted-foreground">ID {selected.patientId}</dd>
                    ) : null}
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Examen</dt>
                    <dd className="font-medium">{selected.examLabel || "—"}</dd>
                    {selected.examenId ? (
                      <dd className="text-xs text-muted-foreground">Examen #{selected.examenId}</dd>
                    ) : null}
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Radiologue</dt>
                    <dd>{selected.radiologist || selected.authorName || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Créé le</dt>
                    <dd>{formatReportDate(selected.createdAt)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Statut</dt>
                    <dd className="mt-1">
                      <Badge variant={statusBadgeVariant(selected.status)}>
                        {REPORT_STATUS_LABEL[selected.status]}
                      </Badge>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Version courante</dt>
                    <dd className="tabular-nums">v{selected.currentVersion ?? 1}</dd>
                  </div>
                </dl>
              ) : (
                <p className="text-sm text-muted-foreground">Aucun dossier sélectionné.</p>
              )}

              <div className="border-t border-border pt-4">
                <div className="mb-2 flex items-center gap-2">
                  <History className="size-4 text-muted-foreground" />
                  <h3 className="text-sm font-semibold">Historique des versions</h3>
                </div>
                {versionsLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={`v-sk-${i}`} className="h-14 w-full rounded-md" />
                    ))}
                  </div>
                ) : !selected ? null : versions.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Aucune version archivée.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {versions
                      .slice()
                      .sort((a, b) => b.versionNumber - a.versionNumber)
                      .map((v) => {
                        const active = previewVersion?.id === v.id;
                        return (
                          <li key={v.id}>
                            <button
                              type="button"
                              onClick={() => openVersionPreview(v)}
                              className={cn(
                                "w-full rounded-md border px-2.5 py-2 text-left text-xs transition-colors",
                                active
                                  ? "border-primary/40 bg-primary/5"
                                  : "border-border hover:bg-muted/50",
                              )}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-semibold tabular-nums">
                                  Version {v.versionNumber}
                                </span>
                                <span className="text-muted-foreground">
                                  {formatReportDate(v.createdAt)}
                                </span>
                              </div>
                              {v.authorName ? (
                                <p className="mt-0.5 truncate text-muted-foreground">
                                  {v.authorName}
                                </p>
                              ) : null}
                            </button>
                          </li>
                        );
                      })}
                  </ul>
                )}
              </div>
            </div>
          </ScrollArea>
        </aside>
      </div>

      {/* Amend dialog */}
      <Dialog open={amendOpen} onOpenChange={setAmendOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Amender le compte rendu</DialogTitle>
            <DialogDescription>
              Une nouvelle version amendée sera créée. Indiquez le motif clinique ou
              administratif de la correction.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="amend-reason">Motif d&apos;amendement</Label>
            <Textarea
              id="amend-reason"
              value={amendReason}
              onChange={(e) => setAmendReason(e.target.value)}
              rows={4}
              placeholder="Ex. Correction de la conclusion suite à relecture…"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAmendOpen(false)} disabled={actionBusy}>
              Annuler
            </Button>
            <Button onClick={() => void handleAmend()} disabled={actionBusy || !amendReason.trim()}>
              Confirmer l&apos;amendement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PDF preview dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Aperçu avant export PDF</DialogTitle>
            <DialogDescription>
              Vérifiez les sections du compte rendu avant le téléchargement.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[55vh] rounded-md border border-border bg-muted/30 p-4">
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
              {buildMarkdownPreview(fields, selected)}
            </pre>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewOpen(false)} disabled={actionBusy}>
              Fermer
            </Button>
            <Button onClick={() => void handleDownloadPdf()} disabled={actionBusy || !selected}>
              <Download className="mr-1.5 size-4" /> Télécharger le PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
