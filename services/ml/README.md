# MediCare Pro — Moteur de détection d'anomalies

Service ML **indépendant** du backend Spring Boot. Il détecte des opérations/comportements **anormaux** nécessitant une vérification humaine.

> **Le modèle détecte des anomalies, il ne déclare pas une fraude.**

## Architecture

```
Spring Boot (futur)
    ↓  payloads opération + stats historiques
FastAPI (services/ml)
    ↓
Feature Builder → StandardScaler → KMeans + IsolationForest + Rules → Score
    ↓
Réponse JSON (score, niveau, reasons, decision=pending)
```

```
services/ml/
├── app/
│   ├── main.py              # FastAPI + routes legacy
│   ├── config.py            # Configuration (env)
│   ├── engine.py            # Orchestrateur (singleton)
│   ├── api/routes.py        # /health, /score, /train, /model/info
│   ├── features/
│   │   ├── builder.py       # Feature engineering
│   │   └── schema.py        # Features documentées
│   ├── models/
│   │   ├── clustering.py    # KMeans
│   │   ├── anomaly.py       # IsolationForest
│   │   ├── rules.py         # Moteur de règles métier
│   │   └── scoring.py       # Score final pondéré
│   ├── training/train.py    # Pipeline d'entraînement
│   ├── storage/model_registry.py
│   └── data/synthetic.py    # Données synthétiques (tests/bootstrap)
├── tests/
├── requirements.txt
├── Dockerfile
└── README.md
```

## Installation

```bash
cd services/ml
pip install -r requirements.txt
```

## Démarrage

```bash
uvicorn app.main:app --reload --port 8000
```

Documentation interactive : http://localhost:8000/docs

## API

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/health` | Santé du service |
| GET | `/model/info` | Métadonnées du modèle actif |
| POST | `/score` | Score une opération |
| POST | `/score/batch` | Score un lot (max configurable) |
| POST | `/train` | Entraîne une nouvelle version |

Endpoints legacy conservés : `/fraud/score`, `/fraud/train`, `/fraud/analyze`, `/imaging/analyze`.

### Exemple POST /score

```json
{
  "operation_id": "FAC-2026-000123",
  "catalogue_price": 1000,
  "billed_amount": 400,
  "discount_amount": 600,
  "discount_percentage": 60,
  "dossier_not_retrieved": true,
  "operator_non_retrieval_rate": 0.65,
  "operator_discount_rate": 0.35
}
```

Réponse :

```json
{
  "ok": true,
  "data": {
    "operation_id": "FAC-2026-000123",
    "score": 72,
    "niveau": "élevé",
    "cluster_id": 2,
    "cluster_distance": 3.45,
    "isolation_anomaly": true,
    "triggered_rules": ["RULE_HIGH_DISCOUNT", "RULE_OPERATOR_NON_RETRIEVAL_OUTLIER"],
    "reasons": ["Remise de 60%", "Taux de dossiers non récupérés inhabituellement élevé"],
    "decision": "pending",
    "model_version": "fraud-v1"
  }
}
```

## Features

Voir `app/features/schema.py` pour la liste complète documentée (patient, examen, facturation, temps, dossier, documents, opérateur, comportement).

**Aucun tarif hardcodé** : `catalogue_price` est fourni par Spring Boot depuis le catalogue réel.

## Algorithmes

- **StandardScaler** : normalisation (entraîné uniquement sur données d'entraînement)
- **KMeans** : segmentation comportementale, distance au centroïde
- **IsolationForest** : détection d'anomalies multivariées
- **Règles métier** : signaux explicables indépendants du ML

Le GradientBoosting de l'ancienne version n'est plus requis pour le scoring (extension future si labels suffisants).

## Scoring

```
score = 40% × cluster + 30% × isolation + 30% × rules
```

Niveaux :

| Score | Niveau |
|-------|--------|
| 0-29 | faible |
| 30-49 | modéré |
| 50-69 | moyen |
| 70-84 | élevé |
| 85-100 | critique |

## Règles métier

- `RULE_HIGH_DISCOUNT`
- `RULE_DISCOUNT_OUTLIER`
- `RULE_OPERATOR_DISCOUNT_OUTLIER`
- `RULE_HIGH_NON_RETRIEVAL_RATE`
- `RULE_OPERATOR_NON_RETRIEVAL_OUTLIER`
- `RULE_DUPLICATE_DOCUMENT`
- `RULE_EXCESSIVE_MODIFICATIONS`
- `RULE_EXCESSIVE_REFUNDS`
- `RULE_UNUSUAL_PAYMENT_SEQUENCE`
- `RULE_PRICE_DEVIATION`
- `RULE_HIGH_FREQUENCY_PATIENT`

Une règle déclenchée = **signal**, pas une fraude confirmée.

## Training & Model Registry

```bash
curl -X POST http://localhost:8000/train \
  -H "Content-Type: application/json" \
  -d '{"operations": [...], "version": "fraud-v2"}'
```

Versions sauvegardées dans `models_store/` (joblib) : `fraud-v1`, `fraud-v2`, etc.

## Sécurité

Variable `ML_SERVICE_API_KEY` : si définie, les endpoints `/score`, `/score/batch`, `/train`, `/model/info` exigent le header `X-API-Key`.

Le service ne doit pas être exposé directement au navigateur. Intégration future :

```
PostgreSQL → Spring Boot → FastAPI Python → Spring Boot → Dashboard Directeur
```

## Data leakage

Les statistiques opérateur (`operator_*`) doivent être calculées par Spring Boot **uniquement sur l'historique antérieur** à l'opération analysée. Le service Python ne lit pas PostgreSQL dans cette phase.

## Tests

```bash
cd services/ml
pytest -v
```

## Docker

```bash
docker build -t medicare-ml .
docker run -p 8000:8000 -e ML_SERVICE_API_KEY=secret medicare-ml
```

## Limites actuelles

- Pas de connexion directe PostgreSQL
- Modèle non supervisé, pas de labels de fraude confirmée
- Données synthétiques utilisées pour le bootstrap initial
- GradientBoosting supervisé non activé (données labellisées insuffisantes)

## Entraîner fraud-v2 avec décisions humaines

1. Spring Boot enregistre les décisions humaines (`confirmed_anomaly`, `false_positive`, etc.)
2. Exporter les opérations + features + label humain
3. `POST /train` avec le jeu enrichi → version `fraud-v2`
4. Comparer les métriques via `/model/info`
5. Activer `fraud-v2` en production via `ML_DEFAULT_MODEL_VERSION`
