"""
Import des médecins (Temara + Rabat) depuis Excel vers PostgreSQL.
Table cible : medecins_referents
"""

from __future__ import annotations

import os
import sys

import pandas as pd
from sqlalchemy import create_engine, text

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
EXCEL_PATH = os.path.join(BASE_DIR, "Medecins Temara et Rabat (1).xlsx")

# Modifier cette URL si besoin (user / password / host / port / database)
DB_URL = "postgresql://postgres:postgres@localhost:5433/medicare_db"

TARGET_COLUMNS = [
    "id_medecin_excel",
    "nom",
    "telephone",
    "email",
    "specialite",
    "adresse",
    "ville",
    "quartier",
]

SHEET_TEMARA = "Medecins Temara"
SHEET_RABAT = "Medecins Rabat"


def _clean_series(series: pd.Series) -> pd.Series:
    """Normalise les chaînes : strip, NaN si vide."""
    out = series.astype("string").str.strip()
    out = out.replace({"": pd.NA, "nan": pd.NA, "None": pd.NA})
    return out


def load_temara(path: str) -> pd.DataFrame:
    """
    Feuille Temara :
    - ligne 0 : en-têtes inutiles / vides  -> à supprimer
    - ligne 1 : vrais libellés
    - ligne 2+ : données
    Colonnes Excel (ordre) :
      Id medecin | Nom | Téléphone | (email?) | Specialité | Adresse | Ville | Quartier
    """
    print(f"  -> Lecture de la feuille '{SHEET_TEMARA}'...")
    raw = pd.read_excel(path, sheet_name=SHEET_TEMARA, header=None, engine="openpyxl")
    print(f"     {len(raw)} lignes brutes lues")

    # Suppression de l'index 0 (ligne d'en-têtes inutiles)
    raw = raw.drop(index=0).reset_index(drop=True)

    # La nouvelle 1re ligne contient les libellés -> on la retire aussi
    raw = raw.drop(index=0).reset_index(drop=True)

    if raw.shape[1] < 8:
        raise ValueError(
            f"Temara : attendu au moins 8 colonnes, trouvé {raw.shape[1]}"
        )

    df = pd.DataFrame(
        {
            "id_medecin_excel": _clean_series(raw.iloc[:, 0]),
            "nom": _clean_series(raw.iloc[:, 1]),
            "telephone": _clean_series(raw.iloc[:, 2]),
            "email": _clean_series(raw.iloc[:, 3]),
            "specialite": _clean_series(raw.iloc[:, 4]),
            "adresse": _clean_series(raw.iloc[:, 5]),
            "ville": _clean_series(raw.iloc[:, 6]),
            "quartier": _clean_series(raw.iloc[:, 7]),
        }
    )
    df = df.dropna(how="all")
    df = df[df["nom"].notna()].copy()
    print(f"     {len(df)} médecins Temara après nettoyage")
    return df


def load_rabat(path: str) -> pd.DataFrame:
    """
    Feuille Rabat :
    - plusieurs lignes vides en tête
    - puis une ligne d'en-têtes :
      Nom | Spécialté | Ville | Adresse | Numero mobile | Région
    Mapping vers le schéma cible (id_medecin_excel / email absents).
    """
    print(f"  -> Lecture de la feuille '{SHEET_RABAT}'...")
    raw = pd.read_excel(path, sheet_name=SHEET_RABAT, header=None, engine="openpyxl")
    print(f"     {len(raw)} lignes brutes lues")

    # Trouver la ligne d'en-tête (contient "Nom")
    header_idx = None
    for i, row in raw.iterrows():
        values = [str(v).strip().lower() for v in row.tolist() if pd.notna(v)]
        if any("nom" in v for v in values):
            header_idx = int(i)
            break

    if header_idx is None:
        raise ValueError("Rabat : ligne d'en-tête introuvable")

    print(f"     En-tête détecté à l'index {header_idx}")
    data = raw.iloc[header_idx + 1 :].reset_index(drop=True)

    if data.shape[1] < 6:
        raise ValueError(
            f"Rabat : attendu au moins 6 colonnes, trouvé {data.shape[1]}"
        )

    df = pd.DataFrame(
        {
            "id_medecin_excel": pd.Series([pd.NA] * len(data), dtype="string"),
            "nom": _clean_series(data.iloc[:, 0]),
            "telephone": _clean_series(data.iloc[:, 4]),
            "email": pd.Series([pd.NA] * len(data), dtype="string"),
            "specialite": _clean_series(data.iloc[:, 1]),
            "adresse": _clean_series(data.iloc[:, 3]),
            "ville": _clean_series(data.iloc[:, 2]),
            "quartier": _clean_series(data.iloc[:, 5]),
        }
    )
    df = df.dropna(how="all")
    df = df[df["nom"].notna()].copy()
    print(f"     {len(df)} médecins Rabat après nettoyage")
    return df


def ensure_table(engine) -> None:
    """Crée la table medecins_referents si elle n'existe pas encore."""
    ddl = """
    CREATE TABLE IF NOT EXISTS medecins_referents (
        id SERIAL PRIMARY KEY,
        id_medecin_excel TEXT,
        nom TEXT,
        telephone TEXT,
        email TEXT,
        specialite TEXT,
        adresse TEXT,
        ville TEXT,
        quartier TEXT,
        imported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """
    with engine.begin() as conn:
        conn.execute(text(ddl))
    print("  -> Table 'medecins_referents' prête (créée si absente)")


def main() -> int:
    print("=" * 60)
    print("IMPORT MÉDECINS Excel -> PostgreSQL")
    print("=" * 60)

    if not os.path.isfile(EXCEL_PATH):
        print(f"❌ Fichier introuvable : {EXCEL_PATH}")
        return 1

    print(f"\n[1/4] Fichier source : {EXCEL_PATH}")

    print("\n[2/4] Lecture et nettoyage des feuilles Excel...")
    df_temara = load_temara(EXCEL_PATH)
    df_rabat = load_rabat(EXCEL_PATH)

    print("\n[3/4] Concaténation des deux feuilles...")
    df = pd.concat([df_temara, df_rabat], ignore_index=True)
    df = df[TARGET_COLUMNS]

    # Convertir les NA pandas en None pour SQL
    df = df.where(df.notna(), None)

    print(f"  -> DataFrame final : {len(df)} lignes / {len(df.columns)} colonnes")
    print(f"  -> Colonnes : {list(df.columns)}")
    print(f"  -> Aperçu (3 premières lignes) :")
    print(df.head(3).to_string(index=False))

    print("\n[4/4] Connexion PostgreSQL et insertion...")
    print(f"  -> URL : {DB_URL}")
    engine = create_engine(DB_URL)

    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        print("  -> Connexion OK")
    except Exception as exc:
        print(f"❌ Impossible de se connecter à PostgreSQL : {exc}")
        print("   Vérifie que le service PostgreSQL est démarré,")
        print("   puis adapte DB_URL en haut du script si besoin.")
        return 1

    ensure_table(engine)

    print("  -> Insertion (if_exists='append', index=False)...")
    df.to_sql("medecins_referents", engine, if_exists="append", index=False)

    with engine.connect() as conn:
        total = conn.execute(text("SELECT COUNT(*) FROM medecins_referents")).scalar()

    print("\n" + "=" * 60)
    print(f"✅ Succès ! {len(df)} médecins importés.")
    print(f"   Total actuel dans medecins_referents : {total}")
    print("=" * 60)
    return 0


if __name__ == "__main__":
    sys.exit(main())
