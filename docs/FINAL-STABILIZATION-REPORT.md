# Rapport de stabilisation

Date : 2026-09-09. Périmètre : code réel du dépôt `medicare-pro`, pas le README Lovable.

## Verdict

**NOT READY** pour une mise en production cabinet (go-live patients réels).

Les chemins métier **cœur** compilent, les tests Java passent, le frontend `npm run build` passe. Il reste des trous opérationnels, de sécurité et d’intégration qui interdisent un READY.

## Preuves automatisées (cette passe)

- `mvn test` : **exit 0** (66+ tests, dont `AppointmentLifecycleTest`, `InvoiceBillingServiceTest`, `WorklistExamPersistenceTest`, `FlywayMigrationConventionTest` V22–V23).
- `npm run build` : **exit 0**.
- Non exécuté : parcours navigateur 20 étapes, charge LAN multi-postes, Flyway sur PostgreSQL réel de ce run.

## Ce qui a été corrigé / livré

### Réseau (P0)

- Fallback API : si `VITE_JAVA_API_URL` est loopback et que la page n’est pas localhost → `hostname:8080`.
- `GET /api/system/health` (public) et `/api/system/status` (SETTINGS_READ).
- Mapping d’erreurs : conflits créneau / patient, messages 500 / réseau.
- `.env.example` documente `SERVER_IP`, ICE/IF/TP, WhatsApp non implémenté.

### Salles

- `/salles` charge ressources et RDV **indépendamment** (un 404 occupancy ne vide plus la page).
- `GET /api/resources/occupancy`, `PATCH /api/resources/{id}`.

### Agenda

- Chevauchement **salle** et **patient** (`patient_slot_conflict`).
- Check-in idempotent + `SELECT FOR UPDATE`.
- Erreurs agenda via `describeApiError`.

### Facturation

- V22 champs fiscaux Maroc + séquence + backfill `MIG-*` **sans drop** de `paiements_examen`.
- V23 `year` → `seq_year` (H2 / SQL portable).
- Numéros `FAC-YYYY-NNNNNN` sous verrou pessimiste.
- Caisse worklist paie le ledger facture ; l’acompte examen déjà encaissé est reporté (évite le surpaiement).
- PDF ICE/IF/TP ; mention « pas une e-facture DGI ».
- E-facture : hash local uniquement.

### RBAC front

- 4 rôles canoniques ; alias explicites ; inconnu = deny.
- `PermissionGuard` s’aligne sur le rôle backend.

### Qualité

- Fuite `SecurityContext` après `ChatServiceTest` (FK `created_by_id` fantôme).
- `createdBy` patient/examen/RDV seulement si l’utilisateur existe encore en base.

## Matrice succès (demandée)

| Critère | État |
| --- | --- |
| Réseau LAN (pas localhost client) | Code prêt ; **non vérifié** sur PCs du centre |
| Salles / occupancy | API + UI ; **non vérifié** navigateur |
| Agenda / conflits / check-in | **Tests Java OK** |
| File d’attente | Walk-in testé ; advance UI non E2E |
| Worklist / caisse | Persistence + overpay testés |
| CR | Double stockage encore là |
| Facturation unifiée + PDF Maroc | Tests + PDF code ; e-DGI **non** |
| RBAC 4 rôles | Serveur + front alignés ; pas d’admin users |
| WhatsApp / PACS / SMS | **Non livrés** (stubs / NOT CONFIGURED) |

## Bloquants restants (pourquoi NOT READY)

1. **Pas de validation navigateur** du flux RDV → check-in → file → salle → CR → caisse → PDF.
2. **Secrets** : JWT et `postgres:postgres` encore utilisables en profil dev ; prod exige des env vars — à imposer au run réel.
3. **Token chat en query string**.
4. **Double écriture** paiements examen + facture ; **double stockage** CR examen + `reports`.
5. **Pas d’assistant DGI**, pas de PACS, pas de WhatsApp Java.
6. Wizard RDV 6 étapes **non** livré (dialog confirm existant).
7. Pas d’UI utilisateurs / rôles ; tables SQL RBAC V2 mortes.
8. TanStack Query monté, **zéro** `useQuery` métier.
9. CORS / build `VITE_*` doivent être recollés à l’IP du serveur à chaque build.

## Fichiers doc

- `docs/ARCHITECTURE.md`
- `docs/DEPLOYMENT.md`
- `docs/BILLING.md`
- `docs/RBAC.md`
- `docs/API.md`

## Prochaine passe utile (ordre)

1. Flyway V22–V23 sur le PostgreSQL du centre + health depuis un PC client.
2. Parcours métier manuel (ou Playwright) des 20 étapes.
3. Secret JWT + CORS LAN + `RADIOCRM_PUBLIC_REGISTER=false`.
4. Arrêter la double écriture caisse (un seul ledger) une fois la prod stable.
5. Admin utilisateurs. Puis PACS / DGI / WhatsApp **seulement** s’ils sont contractuels.
