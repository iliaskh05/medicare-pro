# État actuel — MediCare Pro

**Mise à jour 2026-09-04 (2e passe)** — voir `docs/REQUIREMENTS-MATRIX.md`.

### Second pass (functional parity)

- **Check-in → ARRIVED** : RDV check-in place le patient en file d'attente (`arrivedAt`)
- Agenda : Confirmer / Check-in / Reporter / No-show / Annuler
- Worklist : champs cliniques + timestamps + auto-refresh préférences
- Patient 360 : onglet Rendez-vous
- CR : modèles/trames (`report_templates` V19) + mark-printed
- Examen complémentaire : API `POST /api/worklist/{id}/complementaire`
- File d'attente : rafraîchissement silencieux 20s

### Limitations restantes

- PACS / scanner physique / imprimante thermique : frontières seulement
- Dictionnaires pas encore branchés en combobox CR
- PDF facture par id invoice (hors examen) : partiel
- Avance RDV : notée sur le RDV ; encaissement au check-in/caisse

---

Date d’origine du document : 17 août 2026.  
Référence frontend : `docs/FRONTEND-BACKEND-CONTRACT.md`.

## 1. Ce qui existait avant l’intervention backend (cette branche)

Stack déjà en place :

- Frontend React / TypeScript (TanStack Router, Vite)
- Backend Spring Boot 3.4 / Java 17 / JPA / JWT
- PostgreSQL (`medicare_db`), schéma via Hibernate `ddl-auto=update`
- Microservice FastAPI `services/ml` (fraude / imaging heuristics)

Backend opérationnel limité :

- Auth JWT (`/api/auth/login|register|forgot-password|reset-password`)
- Worklist examens (`GET/POST /api/worklist`, `PATCH …/status`)
- `GET /api/patients` (liste d’entités, sans DTO/âge/CRUD)
- `GET /api/medecins`
- PDF facture à la volée, imagerie stub, dashboard `stats`, audit fraude stub
- 4 rôles (`DIRECTEUR`, `RADIOLOGUE`, `MANIPULATEUR`, `SECRETARIAT`) sans `@PreAuthorize`
- 0 test, 0 migration versionnée

Tables métier : `patients`, `examens`, `historique_examen`, `medecins_referents`, `utilisateurs`, `password_reset_tokens`.

## 2. Ce qui a été modifié ici (agent)

### Conservé (justifié)

- **Session auth** (`src/lib/auth-session.ts`, `src/hooks/use-auth.tsx`) : lecture synchrone du JWT pour survivre au F5 / hydrate SSR. Les clés restent `radiocrm:token` / `radiocrm:user` du contrat.
- **`use-role.tsx`** : init synchrone depuis le storage, **en plus** du RBAC Lovable (`can`, `backendRole`, `src/lib/rbac.ts`). Pas de second système de permissions UI.
- **Client HTTP** : réutilise `javaApi` / `ApiError`. 401/403 → logout + redirect, comme le contrat et Lovable, en déléguant le nettoyage à `clearAuthStorage()` (une seule source de clés).
- **`errors.ts`** : fichier Lovable intact, sauf usage du `message` backend quand il est métier (le contrat promet `{ message, code }`).
- **Backend** : Flyway V1–V3, entités étendues (pas de rename des tables existantes), `WorkflowEngine`, audit immuable, `@PreAuthorize`, API patients réelle, worklist `compte-rendu` / `assign` / `PATCH`.
- **Erreurs API** : `{ message, code }` conservés ; champs additionnels (`timestamp`, `status`, `path`, `correlationId`, `validationErrors`) — le frontend ne lit que `message`.

### Annulé / fusionné (conflit)

- La page **dashboard** allégée (uniquement `/api/dashboard/stats`) a été **restaurée** vers la version Lovable. Un écran manquant d’API doit afficher l’état d’erreur/vide, pas être réécrit.

### Non touché volontairement

- `src/lib/rbac.ts`
- `src/hooks/use-api-resource.ts`
- `src/components/data-state.tsx`
- `src/routes/patients.tsx` (déjà câblé sur `useApiResource` + `DataState`)
- `docs/FRONTEND-BACKEND-CONTRACT.md`

## 3. Ce que Lovable avait déjà livré (P0)

| Fichier | Rôle |
| --- | --- |
| `src/lib/api/errors.ts` | Traduction HTTP → messages métier |
| `src/lib/rbac.ts` | Matrice `resource:action` pour 12 rôles backend |
| `src/hooks/use-api-resource.ts` | loading / ready / empty / error |
| `src/components/data-state.tsx` | `DataState`, `LoadingState`, `NoDataState`, `ErrorState` |
| `src/routes/patients.tsx` | Liste patients via `useApiResource(fetchPatients)` |
| `src/hooks/use-role.tsx` | `can()`, `canAccess()`, `backendRole` |
| `docs/FRONTEND-BACKEND-CONTRACT.md` | Endpoints consommés vs attendus |

Règle Lovable : **pas de donnée métier fictive**. Endpoint absent → état d’erreur/vide.

## 4. Conflits / doublons détectés

| Sujet | Décision |
| --- | --- |
| RBAC UI (`rbac.ts`) vs RBAC Java (`PermissionCatalog`) | **Deux couches distinctes**, pas un doublon. UI = masquage. Java = 403 réel. À aligner progressivement (noms différents : `patients:view` vs `PATIENT_READ`). |
| `GET /api/v1/patients` paginé vs `GET /api/patients` tableau | **Les deux**. Sans query, le tableau est conservé (`fetchPatients`). Avec `search` / `mutuelle` / `page`, réponse paginée du contrat. |
| Doublons patient (warnings à la création vs `GET /api/patients/duplicates`) | Contrat = endpoint dédié. Ajouté. La création bloque toujours sur CIN (409). |
| Dashboard `stats` vs `kpis` | Frontend Lovable appelle `kpis`, `salle-attente`, `alertes`. Backend n’a que `stats`. **Pas de mock de KPI.** L’écran Lovable restera en erreur/vide jusqu’à l’implémentation réelle. |
| Logout 401/403 retiré puis rétabli | Contrat + Lovable l’exigent. Fusionné avec `auth-session`. |
| `/api/v1/*` alias | Non cassant. Le frontend continue d’appeler `/api/*`. |

## 5. Endpoints existants (backend réel)

Auth : `POST /api/auth/login|register|forgot-password|reset-password`  
Patients : `GET/POST /api/patients`, `GET/PUT /api/patients/{id}`, 360 (`historique`, `imagerie`, `ordonnances`, `factures`, `dossier-financier`), `GET /api/patients/duplicates`, `GET /api/v1/patients` (page)  
Worklist : `GET/POST /api/worklist`, `PATCH /api/worklist/{id}`, `PATCH …/status`, `PUT …/compte-rendu`, `PATCH …/assign`  
Médecins : `GET /api/medecins`  
Facture PDF : `GET /api/factures/examen/{id}`  
Imagerie stub : `GET /api/imagerie/examen/{id}`  
Dashboard : `GET /api/dashboard/stats`  
Audit stub : `GET /api/audit/fraude/anomalies`  
Santé : `/actuator/health` (liveness/readiness)

## 6. Endpoints manquants (contrat, non mockés)

- `GET /api/dashboard/kpis`, `/api/salle-attente`, `/api/alertes`
- `GET/POST /api/factures`, `PATCH /api/factures/{ref}/reglement`, paiements / refund / cancel
- `GET /api/medecins/prescripteurs`, `POST /api/medecins`, `GET /api/medecins/{id}/stats`
- `GET/PATCH /api/audit/kpis|anomalies`
- `GET /api/imagerie/scans`, `POST /api/imagerie/{studyId}/analyse`
- Appointments, waiting-room, reports versionnés, imaging studies DICOM
- Chat / WhatsApp / documents PDF

Le frontend les appelle déjà : il doit continuer à afficher `ErrorState` / `ServiceNotice`, pas des jeux de données.

## 7. Fonctionnalités réellement fonctionnelles (données PostgreSQL)

- Login / register (register public **en profil `dev` seulement**) / reset password
- Worklist du jour : liste, création examen+patient, changement de statut (machine à états), CR texte, PDF facture
- Patients : liste, création, fiche, historique/imagerie/ordonnances/factures dérivés des **examens réels**
- Médecins référents : liste
- JWT + permissions backend sur les endpoints ci-dessus
- Audit `LOGIN` / `PATIENT_*` / `EXAM_*` en base (`audit_logs` immuable après Flyway)

## 8. Mocks encore présents

- `ImagerieService` : UIDs / images `placehold.co`
- `FactureService.montantFictif` si `montant ≤ 0` (barème Java — à remplacer par table `tariffs`)
- `DashboardService` revenus via le même barème
- `AuditController` : compteurs à 0
- ML : barèmes et training rows en dur ; routes frontend `/fraud/clustering` ≠ FastAPI `/fraud/score`
- UI : `MODALITES` / `SALLES` / `typesExamen` hardcodés ; canaux chat statiques
- `EMPTY_DASHBOARD_*` : zéros de **fallback d’erreur**, pas un jeu métier

## 9. Problèmes critiques

1. **Flyway + `ddl-auto=validate`** : premier boot sur une base Hibernate existante à tester (baseline V1 `IF NOT EXISTS`).
2. **Secrets** : JWT / SMTP retirés de `application.properties` — `MAIL_PASSWORD` et `RADIOCRM_JWT_SECRET` via env / `application-dev`. L’ancien mot de passe Gmail a été commité historiquement : le **faire tourner**.
3. **403 vs UI** : un radiologue (`RADIOLOGUE`) n’a pas `INVOICE_READ` ; l’onglet finance patient est déjà masqué (`canSeeFinance`). Un 403 ailleurs déclenche la déconnexion Lovable (volontaire au contrat).
4. **Rôles** : le Java n’émet encore que 4 enums ; `rbac.ts` en décrit 12. Mapping UI OK ; pas d’écriture des nouveaux rôles en base tant que l’enum n’est pas étendu.
5. **Dashboard Lovable** : plusieurs GET absents → états d’erreur jusqu’aux vrais agrégats.
6. **N+1 worklist** : `historique` lazy chargé dans `toDto`.
7. **`target/`** parfois staged : ne pas committer.

## 10. Prochaine étape recommandée

Stabilité, pas de nouveau domaine :

1. Compiler backend (`mvn test`) et frontend (`npm run build`) en local.
2. Appliquer Flyway sur `medicare_db` et valider login → worklist → patient 360 avec de vraies lignes.
3. Implémenter **uniquement** les endpoints déjà consommés par le dashboard Lovable, à partir de tables réelles : `GET /api/dashboard/kpis` (forme du contrat), puis `salle-attente` / `alertes` si les données existent.
4. Remplacer `montantFictif` par lecture `tariffs` / `exam_types` (déjà en V3).
5. Ensuite seulement P1 contrat : appointments, waiting-room, reports, paiements.

Ne pas ajouter de module (DICOM, notifications, chat) tant que ce câblage n’est pas vert.
