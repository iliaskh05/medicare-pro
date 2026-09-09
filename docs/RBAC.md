# RBAC

L’autorisation réelle est **Spring** (`PermissionCatalog` + `@PreAuthorize`). Le masquage UI (`src/lib/rbac.ts`) doit rester aligné ; il n’est pas une barrière de sécurité.

## Rôles canoniques (enum JWT)

`DIRECTEUR` · `RADIOLOGUE` · `MANIPULATEUR` · `SECRETARIAT`

Les tables SQL `roles` / `permissions` (Flyway V2) **ne sont pas utilisées** par le code d’auth.

## Alias front (explicites)

| Alias | Canonique |
| --- | --- |
| DIRECTION, SUPER_ADMIN, ADMIN | DIRECTEUR |
| TECHNICIEN | MANIPULATEUR |
| ACCUEIL, SECRETAIRE, CAISSIER | SECRETARIAT |

Un rôle inconnu → **aucune** permission (plus de fallback silencieux vers secrétariat).

## Permissions serveur

| Rôle | Droits |
| --- | --- |
| DIRECTEUR | Toutes (`PATIENT_*`, `EXAM_*`, `REPORT_*`, `INVOICE_*`, `PAYMENT_CREATE`, `DOCUMENT_*`, `SETTINGS_*`, `AUDIT_READ`, `FRAUD_REVIEW`, `USER_MANAGE`, `CHAT_*`, …) |
| RADIOLOGUE | Lecture patients/examens, màj examens, CR (écriture / validation / amendement), documents, chat |
| MANIPULATEUR | Lecture patients/examens, màj / assign worklist, lecture documents, chat |
| SECRETARIAT | Patients CRUD, examens, factures + paiements, documents, lecture settings, chat |

Alias serveur : `APPOINTMENT_*` = `EXAM_*`, `PAYMENT_READ` = `INVOICE_READ`, `WORKLIST_READ` = `EXAM_READ`.

## UI (`resource:action`)

Ressources : patients, appointments, waiting-room, worklist, imaging, reports, billing, doctors, dashboard, fraud, settings, messaging.

Actions : view, create, edit, validate, delete, export.

`PermissionGuard` / `useWriteAccess` utilisent le rôle **backend** canonique et l’action demandée.

## Endpoints publics

- `POST /api/auth/login|register|forgot-password|reset-password` (+ `/api/v1/...`)
- `GET /api/system/health`, `/actuator/health`
- `OPTIONS /**`
- `/ws/chat` (auth par token query, pas par filtre HTTP)

`RADIOCRM_PUBLIC_REGISTER=false` en production. Il n’y a pas d’écran d’administration des utilisateurs : les comptes se créent hors UI (register si ouvert, ou SQL / bootstrap).
