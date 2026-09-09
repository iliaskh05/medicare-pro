# Architecture — MediCare Pro (RadioCRM)

Document généré à partir du code (septembre 2026). Le README Lovable (5 écrans mock) ne décrit plus ce dépôt.

## Stack réelle

| Couche | Technologie |
| --- | --- |
| UI | React 19, TanStack Router / Start, Vite 8, Tailwind 4, shadcn |
| API métier | Spring Boot 3.4, Java 17, JWT, `@PreAuthorize` |
| Schéma | PostgreSQL + Flyway V1–V23 (`ddl-auto=validate` hors tests) |
| ML optionnel | FastAPI `services/ml` port 8090 |
| Chat temps réel | WebSocket Spring `/ws/chat?token=` |

Le navigateur appelle `VITE_JAVA_API_URL` (pas de proxy Vite). Si cette URL est absente ou en loopback alors que la page n’est pas sur localhost, le client réécrit vers `window.location.hostname:8080` (`src/lib/api/config.ts`).

Les contrôleurs sont montés en double : `/api/...` et `/api/v1/...`.

## Flux clinique (FSM)

Source unique : `WorkflowEngine`.

```
SCHEDULED → ARRIVED → WAITING → PREPARING → IN_PROGRESS
         → COMPLETED → REPORT_PENDING → VALIDATED → DISCHARGED
         + CANCELLED / NO_SHOW
```

Check-in RDV (`POST /api/appointments/{id}/check-in`) : verrou pessimiste, idempotent si déjà `CHECKED_IN` + examen lié. Place l’examen en `ARRIVED` (file d’attente).

## Domaines

- **Agenda / salles** : `appointments` + `resources`. Chevauchement salle et patient. Occupancy : `GET /api/resources/occupancy?date=`.
- **Worklist** : `examens` + historique. Caisse worklist écrit le ledger facture (`InvoiceBillingService.ensureAndPayForExam`) puis un duplicat `paiements_examen` (dénormalisé).
- **CR** : colonnes `examens` **et** table versionnée `reports` (double écriture encore présente).
- **Facturation** : ledger autoritatif = `invoices` / `payments` / `refunds`. Colonnes `examens.montant` / `acompte` conservées.
- **Documents** : `documents_examen` (fichiers cabinet). **Imagerie** : tables `imaging_*` (métadonnées, pas de PACS).
- **Chat** : canaux groupe + DM. Auth WS par query string (limite connue).
- **Notifications patient** : `NoOpNotificationProvider`. WhatsApp / SMS non branchés côté Java.

## Frontières non implémentées

| Sujet | État réel |
| --- | --- |
| PACS / modalité DICOM | Métadonnées DB uniquement (`radiocrm.imaging.provider=db`) |
| Facture électronique DGI | Hash + événements locaux, **pas d’API DGI** |
| WhatsApp Cloud | Pas de contrôleur Java ; écran UI = non configuré |
| Admin utilisateurs | Rôles = enum JWT, pas d’UI CRUD rôles |

## Fuseau

Afrique/Casablanca (JPA, Jackson, services métier).
