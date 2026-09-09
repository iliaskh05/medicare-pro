import { useEffect, useMemo, useRef, useState } from "react";
import {
  Download,
  Eye,
  FileText,
  FileUp,
  FolderPlus,
  Image as ImageIcon,
  ImagePlus,
  Receipt,
  Shield,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState, Pill } from "@/components/ui-kit";
import {
  downloadDocumentFile,
  fetchPatientDocuments,
  isDicomDocument,
  isImageDocument,
  uploadDocument,
  type DocumentItem,
} from "@/lib/api/documents";
import { formatCentreDateTime } from "@/lib/date";
import { cn } from "@/lib/utils";

type UploadMode = "image" | "document" | "dossier" | null;

const DOC_TYPE_OPTIONS = [
  { value: "OTHER", label: "Administratif / autre" },
  { value: "INSURANCE", label: "Assurance / mutuelle" },
  { value: "PRESCRIPTION", label: "Ordonnance / prescription" },
  { value: "RECEIPT", label: "Reçu" },
  { value: "INVOICE", label: "Facture (scan)" },
  { value: "REPORT", label: "Compte rendu (scan)" },
] as const;

function typeLabel(type: string): string {
  const t = (type || "").toUpperCase();
  switch (t) {
    case "IMAGE":
      return "Image";
    case "INSURANCE":
      return "Assurance";
    case "PRESCRIPTION":
      return "Prescription";
    case "RECEIPT":
      return "Reçu";
    case "INVOICE":
      return "Facture";
    case "REPORT":
      return "Compte rendu";
    case "OTHER":
      return "Administratif";
    default:
      return type || "Document";
  }
}

function isMedicalImage(doc: DocumentItem): boolean {
  const t = (doc.type || "").toUpperCase();
  return t === "IMAGE" || isImageDocument(doc) || isDicomDocument(doc);
}

function categoryOf(doc: DocumentItem): "factures" | "comptes-rendus" | "assurance" | "admin" | "autres" {
  const t = (doc.type || "").toUpperCase();
  if (t === "INVOICE" || t === "RECEIPT") return "factures";
  if (t === "REPORT") return "comptes-rendus";
  if (t === "INSURANCE") return "assurance";
  if (t === "PRESCRIPTION" || t === "OTHER") return "admin";
  return "autres";
}

export type PatientDocumentsPanelProps = {
  patientId: string;
  examenId?: string;
  /** External trigger: open upload dialog without scrolling */
  openUpload?: UploadMode;
  onUploadHandled?: () => void;
  onChanged?: () => void;
  /** Show only images section, only documents, or both */
  mode?: "all" | "images" | "documents";
};

export function PatientDocumentsPanel({
  patientId,
  examenId,
  openUpload = null,
  onUploadHandled,
  onChanged,
  mode = "all",
}: PatientDocumentsPanelProps) {
  const [docs, setDocs] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadMode, setUploadMode] = useState<UploadMode>(null);
  const [docType, setDocType] = useState<string>("OTHER");
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<{
    items: DocumentItem[];
    index: number;
    zoom: number;
  } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = () => {
    setLoading(true);
    fetchPatientDocuments(patientId)
      .then(setDocs)
      .catch(() => setDocs([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [patientId]);

  useEffect(() => {
    if (openUpload) {
      setUploadMode(openUpload);
      if (openUpload === "document" || openUpload === "dossier") {
        setDocType(openUpload === "dossier" ? "OTHER" : "OTHER");
      }
      onUploadHandled?.();
    }
  }, [openUpload, onUploadHandled]);

  const images = useMemo(() => docs.filter(isMedicalImage), [docs]);
  const documents = useMemo(() => docs.filter((d) => !isMedicalImage(d)), [docs]);

  const groupedDocs = useMemo(() => {
    const groups: Record<string, DocumentItem[]> = {
      factures: [],
      "comptes-rendus": [],
      assurance: [],
      admin: [],
      autres: [],
    };
    for (const d of documents) {
      groups[categoryOf(d)].push(d);
    }
    return groups;
  }, [documents]);

  const openFilePicker = () => {
    fileRef.current?.click();
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length || !uploadMode) return;
    setUploading(true);
    try {
      const list = Array.from(files);
      const acceptImages = uploadMode === "image";
      for (const file of list) {
        const isImg =
          file.type.startsWith("image/") || /\.(jpe?g|png|dcm|dicom)$/i.test(file.name);
        if (acceptImages && !isImg) {
          toast.error(`« ${file.name} » n'est pas une image supportée (JPG, PNG, DICOM).`);
          continue;
        }
        if (!acceptImages && isImg && uploadMode !== "dossier") {
          toast.message(
            `« ${file.name} » semble être une image — utilisez « Ajouter une image » pour les images médicales.`,
          );
        }
        const type =
          uploadMode === "image"
            ? "IMAGE"
            : uploadMode === "dossier"
              ? "OTHER"
              : docType;
        await uploadDocument({
          patientId,
          examenId: examenId ?? undefined,
          type,
          file,
        });
      }
      toast.success(
        uploadMode === "image"
          ? "Image ajoutée au dossier du patient."
          : "Document ajouté au dossier du patient.",
      );
      setUploadMode(null);
      load();
      onChanged?.();
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Impossible d'enregistrer le fichier. Vérifiez le format et réessayez.",
      );
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const openPreview = (items: DocumentItem[], index: number) => {
    setPreview({ items, index, zoom: 1 });
  };

  const currentPreview = preview ? preview.items[preview.index] : null;

  const showImages = mode === "all" || mode === "images";
  const showDocuments = mode === "all" || mode === "documents";

  return (
    <div className="space-y-6">
      <input
        ref={fileRef}
        type="file"
        className="hidden"
        multiple={uploadMode === "image"}
        accept={
          uploadMode === "image"
            ? ".jpg,.jpeg,.png,.dcm,.dicom,image/*"
            : ".jpg,.jpeg,.png,.pdf,.dcm,.dicom,application/pdf"
        }
        onChange={(e) => void handleFiles(e.target.files)}
      />

      {showImages ? (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold tracking-wide text-foreground">
              Images
            </h3>
            <Button size="sm" variant="outline" onClick={() => setUploadMode("image")}>
              <ImagePlus className="mr-1.5 size-4" /> Ajouter une image
            </Button>
          </div>
          {loading ? (
            <p className="text-sm text-muted-foreground">Chargement des images…</p>
          ) : images.length === 0 ? (
            <EmptyState
              icon={ImageIcon}
              title="Aucune image enregistrée pour ce patient."
              description="Ajoutez des clichés ou photos liés au dossier (JPG, PNG, DICOM)."
              compact
              action={
                <Button size="sm" onClick={() => setUploadMode("image")}>
                  <ImagePlus className="mr-1.5 size-4" /> Ajouter une image
                </Button>
              }
            />
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {images.map((doc, idx) => (
                <li
                  key={doc.id}
                  className="overflow-hidden rounded-lg border border-border bg-card"
                >
                  <button
                    type="button"
                    className="group relative block w-full bg-muted/40"
                    onClick={() => openPreview(images, idx)}
                    aria-label={`Aperçu ${doc.nomOriginal}`}
                  >
                    <ImageThumb doc={doc} />
                    <span className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition group-hover:bg-black/30 group-hover:opacity-100">
                      <Eye className="size-6 text-white" />
                    </span>
                  </button>
                  <div className="space-y-1 p-3">
                    <p className="truncate text-sm font-medium">{doc.nomOriginal}</p>
                    <p className="text-xs text-muted-foreground">
                      {doc.createdAt ? formatCentreDateTime(doc.createdAt) : "—"}
                      {doc.createdBy ? ` · ${doc.createdBy}` : ""}
                    </p>
                    {doc.examenId ? (
                      <Pill tone="info">Examen #{doc.examenId}</Pill>
                    ) : (
                      <Pill tone="neutral">Dossier patient</Pill>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {showDocuments ? (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold tracking-wide text-foreground">
              Documents patient
            </h3>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => setUploadMode("document")}>
                <FileUp className="mr-1.5 size-4" /> Ajouter un document
              </Button>
              <Button size="sm" variant="outline" onClick={() => setUploadMode("dossier")}>
                <FolderPlus className="mr-1.5 size-4" /> Ajouter au dossier
              </Button>
            </div>
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground">Chargement des documents…</p>
          ) : documents.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="Aucun document enregistré."
              description="Factures scannées, assurances, prescriptions et PDF administratifs apparaîtront ici."
              compact
              action={
                <Button size="sm" onClick={() => setUploadMode("document")}>
                  <FileUp className="mr-1.5 size-4" /> Ajouter un document
                </Button>
              }
            />
          ) : (
            <div className="space-y-4">
              <DocCategory
                title="Factures & reçus"
                icon={Receipt}
                items={groupedDocs.factures}
                onPreview={(i) => openPreview(groupedDocs.factures, i)}
              />
              <DocCategory
                title="Comptes rendus (fichiers)"
                icon={FileText}
                items={groupedDocs["comptes-rendus"]}
                onPreview={(i) => openPreview(groupedDocs["comptes-rendus"], i)}
              />
              <DocCategory
                title="Assurance / mutuelle"
                icon={Shield}
                items={groupedDocs.assurance}
                onPreview={(i) => openPreview(groupedDocs.assurance, i)}
              />
              <DocCategory
                title="Documents administratifs"
                icon={FolderPlus}
                items={groupedDocs.admin}
                onPreview={(i) => openPreview(groupedDocs.admin, i)}
              />
              <DocCategory
                title="Autres documents"
                icon={FileText}
                items={groupedDocs.autres}
                onPreview={(i) => openPreview(groupedDocs.autres, i)}
              />
            </div>
          )}
        </section>
      ) : null}

      <Dialog open={uploadMode != null} onOpenChange={(o) => !o && setUploadMode(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {uploadMode === "image"
                ? "Ajouter une image"
                : uploadMode === "dossier"
                  ? "Ajouter au dossier"
                  : "Ajouter un document"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm text-muted-foreground">
            {uploadMode === "image" ? (
              <p>Sélectionnez une ou plusieurs images médicales (JPG, PNG, DICOM).</p>
            ) : uploadMode === "dossier" ? (
              <p>
                Ajoutez un fichier destiné au dossier physique à remettre (PDF ou scan
                administratif).
              </p>
            ) : (
              <>
                <p>Choisissez le type puis sélectionnez le fichier (PDF, images, etc.).</p>
                <Select value={docType} onValueChange={setDocType}>
                  <SelectTrigger aria-label="Type de document">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    {DOC_TYPE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setUploadMode(null)} disabled={uploading}>
              Annuler
            </Button>
            <Button onClick={openFilePicker} disabled={uploading}>
              {uploading ? "Envoi…" : "Choisir le fichier"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={preview != null} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-h-[92vh] max-w-4xl overflow-hidden p-0">
          {currentPreview ? (
            <div className="flex max-h-[92vh] flex-col">
              <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{currentPreview.nomOriginal}</p>
                  <p className="text-xs text-muted-foreground">
                    {typeLabel(currentPreview.type)}
                    {currentPreview.createdAt
                      ? ` · ${formatCentreDateTime(currentPreview.createdAt)}`
                      : ""}
                    {currentPreview.createdBy ? ` · ${currentPreview.createdBy}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {isImageDocument(currentPreview) ? (
                    <>
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label="Zoom arrière"
                        onClick={() =>
                          setPreview((p) =>
                            p ? { ...p, zoom: Math.max(0.5, p.zoom - 0.25) } : p,
                          )
                        }
                      >
                        <ZoomOut className="size-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label="Zoom avant"
                        onClick={() =>
                          setPreview((p) =>
                            p ? { ...p, zoom: Math.min(3, p.zoom + 0.25) } : p,
                          )
                        }
                      >
                        <ZoomIn className="size-4" />
                      </Button>
                    </>
                  ) : null}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void downloadOne(currentPreview)}
                  >
                    <Download className="mr-1.5 size-4" /> Télécharger
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Fermer"
                    onClick={() => setPreview(null)}
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              </div>
              <div className="flex flex-1 items-center justify-center overflow-auto bg-muted/30 p-4">
                <PreviewBody doc={currentPreview} zoom={preview?.zoom ?? 1} />
              </div>
              {preview && preview.items.length > 1 ? (
                <div className="flex items-center justify-between border-t border-border px-4 py-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={preview.index <= 0}
                    onClick={() =>
                      setPreview((p) => (p ? { ...p, index: Math.max(0, p.index - 1) } : p))
                    }
                  >
                    Précédent
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    {preview.index + 1} / {preview.items.length}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={preview.index >= preview.items.length - 1}
                    onClick={() =>
                      setPreview((p) =>
                        p
                          ? { ...p, index: Math.min(p.items.length - 1, p.index + 1) }
                          : p,
                      )
                    }
                  >
                    Suivant
                  </Button>
                </div>
              ) : null}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DocCategory({
  title,
  icon: Icon,
  items,
  onPreview,
}: {
  title: string;
  icon: typeof FileText;
  items: DocumentItem[];
  onPreview: (index: number) => void;
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <h4 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Icon className="size-3.5" /> {title}
      </h4>
      <ul className="space-y-2">
        {items.map((doc, idx) => (
          <li
            key={doc.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{doc.nomOriginal}</p>
              <p className="text-xs text-muted-foreground">
                {typeLabel(doc.type)}
                {doc.createdAt ? ` · ${formatCentreDateTime(doc.createdAt)}` : ""}
                {doc.createdBy ? ` · ${doc.createdBy}` : ""}
                {doc.examenId ? ` · Examen #${doc.examenId}` : ""}
              </p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => onPreview(idx)}>
                <Eye className="mr-1.5 size-3.5" /> Aperçu
              </Button>
              <Button size="sm" variant="ghost" onClick={() => void downloadOne(doc)}>
                <Download className="size-3.5" />
                <span className="sr-only">Télécharger</span>
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ImageThumb({ doc }: { doc: DocumentItem }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let revoked: string | null = null;
    let cancelled = false;
    if (!isImageDocument(doc)) {
      setUrl(null);
      return;
    }
    downloadDocumentFile(doc.id)
      .then((blob) => {
        if (cancelled) return;
        revoked = URL.createObjectURL(blob);
        setUrl(revoked);
      })
      .catch(() => {
        if (!cancelled) setUrl(null);
      });
    return () => {
      cancelled = true;
      if (revoked) URL.revokeObjectURL(revoked);
    };
  }, [doc.id, doc.contentType, doc.nomOriginal]);

  if (!url) {
    return (
      <div className="flex h-36 items-center justify-center text-muted-foreground">
        <ImageIcon className="size-8 opacity-40" />
      </div>
    );
  }
  return (
    <img src={url} alt={doc.nomOriginal} className="h-36 w-full object-cover" loading="lazy" />
  );
}

function PreviewBody({ doc, zoom }: { doc: DocumentItem; zoom: number }) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let revoked: string | null = null;
    let cancelled = false;
    setError(null);
    setUrl(null);
    downloadDocumentFile(doc.id)
      .then((blob) => {
        if (cancelled) return;
        revoked = URL.createObjectURL(blob);
        setUrl(revoked);
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Aperçu impossible");
        }
      });
    return () => {
      cancelled = true;
      if (revoked) URL.revokeObjectURL(revoked);
    };
  }, [doc.id]);

  if (error) {
    return <p className="text-sm text-destructive">{error}</p>;
  }
  if (!url) {
    return <p className="text-sm text-muted-foreground">Chargement de l'aperçu…</p>;
  }

  if (isImageDocument(doc)) {
    return (
      <img
        src={url}
        alt={doc.nomOriginal}
        style={{ transform: `scale(${zoom})`, transformOrigin: "center center" }}
        className={cn("max-h-[70vh] max-w-full object-contain transition-transform")}
      />
    );
  }

  if (doc.contentType.includes("pdf") || /\.pdf$/i.test(doc.nomOriginal)) {
    return (
      <iframe title={doc.nomOriginal} src={url} className="h-[70vh] w-full rounded border border-border bg-white" />
    );
  }

  return (
    <div className="space-y-3 text-center">
      <p className="text-sm text-muted-foreground">
        Aperçu non disponible pour ce format. Téléchargez le fichier pour l'ouvrir.
      </p>
      <Button onClick={() => void downloadOne(doc)}>
        <Download className="mr-1.5 size-4" /> Télécharger
      </Button>
    </div>
  );
}

async function downloadOne(doc: DocumentItem) {
  try {
    const blob = await downloadDocumentFile(doc.id);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = doc.nomOriginal || `document-${doc.id}`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (e) {
    toast.error(e instanceof Error ? e.message : "Téléchargement impossible");
  }
}

/** Imperative helpers for patient header quick actions */
export type DocumentUploadKind = Exclude<UploadMode, null>;
