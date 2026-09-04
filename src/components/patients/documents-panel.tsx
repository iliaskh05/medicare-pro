import { useEffect, useState } from "react";
import { FileUp, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui-kit";
import {
  downloadDocumentFile,
  fetchPatientDocuments,
  isDicomDocument,
  isImageDocument,
  uploadDocument,
  type DocumentItem,
} from "@/lib/api/documents";

export function PatientDocumentsPanel({
  patientId,
  examenId,
}: {
  patientId: string;
  examenId?: string;
}) {
  const [docs, setDocs] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);

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

  const general = docs.filter((d) => !d.examenId);
  const linked = docs.filter((d) => d.examenId);

  return (
    <div className="space-y-4">
      <label className="inline-flex cursor-pointer items-center gap-2">
        <Button asChild variant="outline" size="sm">
          <span>
            <FileUp className="mr-2 size-4" /> Ajouter un document
          </span>
        </Button>
        <input
          type="file"
          className="hidden"
          accept=".jpg,.jpeg,.png,.pdf,.dcm,.dicom"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            try {
              const doc = await uploadDocument({
                patientId,
                examenId,
                type: examenId ? "examen" : "document",
                file,
              });
              setDocs((list) => [doc, ...list]);
              toast.success("Document importé.");
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Import impossible.");
            }
          }}
        />
      </label>
      {loading ? (
        <p className="text-sm text-muted-foreground">Chargement des documents…</p>
      ) : docs.length === 0 ? (
        <EmptyState
          icon={ImageIcon}
          title="Aucun document"
          description="Les fichiers importés ici restent liés au dossier patient. Les images d'examen s'affichent aussi depuis la fiche examen."
          compact
        />
      ) : (
        <>
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Documents du dossier
            </h3>
            <DocList items={general} />
          </section>
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Images liées à un examen
            </h3>
            <DocList items={linked} />
          </section>
        </>
      )}
    </div>
  );
}

function DocList({ items }: { items: DocumentItem[] }) {
  if (items.length === 0) {
    return <p className="mt-2 text-sm text-muted-foreground">Aucun fichier dans cette catégorie.</p>;
  }
  return (
    <ul className="mt-2 space-y-2">
      {items.map((doc) => (
        <li key={doc.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
          <div>
            <p className="text-sm font-medium">{doc.nomOriginal}</p>
            <p className="text-xs text-muted-foreground">
              {doc.type}
              {isImageDocument(doc) ? " · image" : ""}
              {isDicomDocument(doc) ? " · DICOM" : ""} · {Math.round(doc.taille / 1024)} Ko
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={async () => {
              try {
                const blob = await downloadDocumentFile(doc.id);
                const url = URL.createObjectURL(blob);
                window.open(url, "_blank", "noopener");
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Téléchargement impossible");
              }
            }}
          >
            Ouvrir
          </Button>
        </li>
      ))}
    </ul>
  );
}
