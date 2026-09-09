# API HTTP

Base : `http://SERVER:8080`. Tous les chemins existent aussi sous `/api/v1/...`. Auth : `Authorization: Bearer <jwt>` sauf santé et auth.

Erreurs JSON : `{ message, code, status, path, correlationId, ... }`. Codes métier fréquents : `slot_conflict`, `patient_slot_conflict`, `patient_duplicate_cin`, `invoice_not_payable`.

## Auth & système

| Méthode | Chemin | Authz |
| --- | --- | --- |
| POST | `/api/auth/login` | public |
| POST | `/api/auth/register` | public si `radiocrm.auth.public-register` |
| POST | `/api/auth/forgot-password` | public |
| POST | `/api/auth/reset-password` | public |
| GET | `/api/system/health` | public |
| GET | `/api/system/status` | SETTINGS_READ |
| GET/POST | `/api/me/avatar` | authentifié |

## Patients

`GET/POST /api/patients`, `GET/PUT /api/patients/{id}`, duplicates, historique, imagerie, ordonnances, factures, dossier-financier, timeline, appointments, reports, anomalies.

## Agenda & salles

| Méthode | Chemin |
| --- | --- |
| GET/POST | `/api/appointments` |
| GET/PATCH | `/api/appointments/{id}` |
| POST | `/api/appointments/{id}/confirm\|cancel\|reschedule\|check-in\|no-show` |
| GET/POST | `/api/resources` |
| GET | `/api/resources/occupancy?date=` |
| PATCH | `/api/resources/{id}` (actif) |

## File d’attente

`GET /api/waiting-room`, `POST /api/waiting-room/{examenId}/advance`, `GET .../history`. Alias lecture : `/api/salle-attente`.

## Worklist

`GET/POST /api/worklist`, `GET /{id}`, `PATCH /{id}`, `PATCH /{id}/status`, `PUT /{id}/compte-rendu`, `GET /{id}/compte-rendu.pdf`, `GET/POST /{id}/paiements`, `PATCH /{id}/assign`, `POST /{id}/complementaire`, `GET /dossiers`, `GET /impayes`.

## Factures & CR

Voir `docs/BILLING.md`. CR : `/api/reports` (alias `/api/comptes-rendus`) — CRUD, submit, validate, amend, versions, pdf, mark-printed. Trames : `/api/report-templates`.

## Autres

| Domaine | Préfixe |
| --- | --- |
| Catalogue | `/api/catalogue/examens` |
| Médecins référents | `/api/medecins` |
| Documents | `/api/documents` |
| Imaging metadata | `/api/imaging` |
| Insurance | `/api/insurance` |
| Dashboard | `/api/dashboard/stats`, `/kpis` |
| Settings | `/api/settings` |
| Chat | `/api/chat/*` + WS `/ws/chat?token=` |
| Audit / fraude | `/api/audit`, `/api/audit-trail` |
| Dictionnaires | `/api/dictionaries` |
| Admin data / démo | `/api/admin/data` |
| Assistant Gemini | `POST /api/assistant/chat` |
| Radiologues | `/api/staff/radiologues` |

Pas de contrôleur Java `/api/whatsapp` : l’écran front affiche non configuré.

## WebSocket

`/ws/chat?token=<jwt>`. Le handshake HTTP est `permitAll` ; le token est lu dans la query (limite : fuite logs / historique).
