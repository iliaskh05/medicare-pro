# MediCare Pro / RadioCRM — Contrat frontend ↔ backend

Ce document est la référence unique des endpoints consommés par le frontend.
Règle du projet : **aucune donnée métier fictive**. Quand un endpoint n'existe pas
encore, l'écran affiche un état d'erreur/vide propre et l'endpoint attendu est
documenté ici.

Base URL : `VITE_JAVA_API_URL` (défaut `http://localhost:8080`).
Microservice IA : `VITE_ML_API_URL`.
Auth : `Authorization: Bearer <JWT>` (token en `localStorage["radiocrm:token"]`).
Erreurs : JSON `{ "message": string, "code"?: string }` + code HTTP réel.
Listes vides : renvoyer `[]`, jamais `null`.

## Couche technique frontend (P0 — livrée)

| Fichier | Rôle |
| --- | --- |
| `src/lib/api/config.ts` | client HTTP unique (JWT, timeout, 401/403 → déconnexion) |
| `src/lib/api/errors.ts` | traduction 400/401/403/404/409/422/500/timeout/réseau en messages métier |
| `src/lib/rbac.ts` | matrice de permissions `resource:action` pour 12 rôles backend |
| `src/hooks/use-role.tsx` | `can()`, `canAccess()`, `canCreate()`, `canEdit()`, `canValidate()`, `canExport()` |
| `src/hooks/use-api-resource.ts` | états `loading / ready / empty / error`, annulation, `reload()`, `lastUpdated` |
| `src/components/data-state.tsx` | `DataState`, `LoadingState`, `NoDataState`, `ErrorState`, `LastUpdated` |

Rappel sécurité : le RBAC frontend ne masque que des actions impossibles.
L'autorisation réelle est celle du backend (`@PreAuthorize`, 403).

## Endpoints existants et consommés

| Domaine | Méthode | Endpoint |
| --- | --- | --- |
| Auth | POST | `/api/auth/login`, `/api/auth/register`, `/api/auth/forgot-password`, `/api/auth/reset-password` |
| Patients | GET/POST | `/api/patients`, `/api/patients/{id}` |
| Patients | GET | `/api/patients/{id}/historique|imagerie|ordonnances|factures|dossier-financier` |
| Worklist | GET/POST | `/api/worklist?date=&search=&status=` |
| Worklist | PATCH/PUT | `/api/worklist/{id}`, `/api/worklist/{id}/status`, `/api/worklist/{id}/compte-rendu` |
| Médecins | GET/POST | `/api/medecins`, `/api/medecins/prescripteurs` |
| Facturation | GET/POST/PATCH | `/api/factures`, `/api/factures/{reference}/reglement` |
| Dashboard | GET | `/api/dashboard/kpis`, `/api/salle-attente`, `/api/alertes` |
| Audit | GET/PATCH | `/api/audit/kpis`, `/api/audit/anomalies`, `/api/audit/anomalies/{id}` |
| Imagerie | GET/POST | `/api/imagerie/scans`, `/api/imagerie/{studyId}/analyse` |

## Endpoints attendus (non encore disponibles)

### Patient 360 — recherche paginée
`GET /api/patients?search=&mutuelle=&page=0&size=20&sort=nomComplet,asc`
→ `{ content: PatientDto[], page: number, size: number, totalElements: number, totalPages: number }`
Erreurs : 401, 403, 500.

### Détection de doublons patient
`GET /api/patients/duplicates?nom=&cin=&telephone=&naissance=`
→ `[{ patientId, score, champsIdentiques: string[] }]`

### Rendez-vous
- `GET /api/appointments?from=&to=&modalite=&medecinId=` → `AppointmentDto[]`
- `POST /api/appointments` → `AppointmentDto` (409 si créneau occupé)
- `PATCH /api/appointments/{id}` `{ dateHeure?, statut?, priorite?, duree? }`
- `DELETE /api/appointments/{id}` (annulation) → 204
`statut ∈ scheduled | confirmed | cancelled | rescheduled | no_show`

### Salle d'attente temps réel
`GET /api/waiting-room`
→ `[{ id, patient, examen, modalite, heureArrivee, heurePrevue, attenteMinutes, priorite, statut, operateur }]`
`statut ∈ scheduled | arrived | waiting | preparing | in_progress | completed | report_pending | validated | discharged | cancelled | no_show`
Les durées d'attente et retards sont **calculés côté backend**.

### Comptes-rendus (workflow)
- `GET /api/reports?statut=&modalite=&page=&size=`
- `POST /api/reports`, `PUT /api/reports/{id}` (409 si `validated`)
- `POST /api/reports/{id}/validate`, `POST /api/reports/{id}/amend` `{ motif }`
- `GET /api/reports/{id}/versions`, `GET /api/reports/{id}/pdf`
`statut ∈ draft | in_review | validated | amended`

### Facturation (source de vérité financière)
- `GET /api/factures/{id}` → `{ lignes[], total, partAssurance, partPatient, montantPaye, resteAPayer, statut }`
- `POST /api/factures/{id}/paiements` `{ montant, moyen }`
- `POST /api/factures/{id}/refund`, `POST /api/factures/{id}/cancel`
`statut ∈ draft | issued | partially_paid | paid | cancelled | refunded`

### Médecins prescripteurs — statistiques
`GET /api/medecins/{id}/stats`
→ `{ patientsReferes, examens, parModalite: { modalite, count }[], evolutionPct, activiteRecente: [{ date, libelle }] }`

### Dashboard direction
`GET /api/dashboard/kpis?période=today|week|month`
→ `{ operationnel: { patientsJour, examensJour, attenteMoyenneMin, examensEnRetard, crEnRetard, occupationMachines }, financier: { chiffreAffaires, encaissements, creances, resteAPayer }, activite: { parModalite[], evolution[] }, fraude: { alertes, alertesCritiques, scoreMoyen, montantARisque }, generatedAt }`

### Fraude / IA
- `GET /api/audit/anomalies?statut=&risque=&from=&to=` → inclut `raisons[]`, `historique[]`, `score`, `niveau`
- `PATCH /api/audit/anomalies/{id}` `{ statut: under_review | confirmed | dismissed, commentaire }`
`statut ∈ pending | under_review | confirmed | dismissed`

### Imagerie / DICOM
- `GET /api/imaging/studies?patientId=` → `StudyDto[]`
- `GET /api/imaging/studies/{id}/series` → `SeriesDto[]`
- `GET /api/imaging/series/{id}/instances` → `InstanceDto[]` (`wadoUri`)
Le viewer actuel n'est **pas** un viewer DICOM : il affiche des images
fournies par l'API et prépare la structure étude → série → instance.

## Reste à faire (roadmap)

P1 : rendez-vous, salle d'attente, refonte worklist (pagination serveur),
comptes-rendus versionnés, facturation paiements.
P2 : CRM médecins, dashboard direction câblé, investigation fraude,
notifications, imagerie DICOM.
