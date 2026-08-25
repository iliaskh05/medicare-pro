import { api } from "./client";

export type CatalogueActe = {
  id: number;
  nom: string;
  code?: string | null;
  modalite: string;
  categorie?: string | null;
  dureeMinutes?: number | null;
  prix: number;
  description?: string | null;
  preparation?: string | null;
  actif: boolean;
};

export type CatalogueWritePayload = {
  nom: string;
  code?: string | null;
  modalite: string;
  categorie?: string | null;
  dureeMinutes?: number | null;
  prix: number;
  description?: string | null;
  preparation?: string | null;
  actif?: boolean;
};

function mapActe(row: Partial<CatalogueActe> & { id?: number | string; prix?: number | string }): CatalogueActe {
  return {
    id: Number(row.id),
    nom: row.nom ?? "",
    code: row.code ?? null,
    modalite: row.modalite ?? "",
    categorie: row.categorie ?? null,
    dureeMinutes: row.dureeMinutes ?? null,
    prix: Number(row.prix ?? 0),
    description: row.description ?? null,
    preparation: row.preparation ?? null,
    actif: Boolean(row.actif),
  };
}

export async function fetchCatalogue(
  actifs = true,
  signal?: AbortSignal,
): Promise<CatalogueActe[]> {
  const rows = await api.get<unknown[]>(
    `/api/catalogue/examens?actifs=${actifs ? "true" : "false"}`,
    signal ? { signal } : {},
  );
  return (rows ?? []).map((row) => mapActe(row as never));
}

export async function createCatalogueActe(payload: CatalogueWritePayload): Promise<CatalogueActe> {
  const row = await api.post<unknown>("/api/catalogue/examens", payload);
  return mapActe(row as never);
}

export async function updateCatalogueActe(
  id: number,
  payload: Partial<CatalogueWritePayload>,
): Promise<CatalogueActe> {
  const row = await api.patch<unknown>(`/api/catalogue/examens/${id}`, payload);
  return mapActe(row as never);
}
