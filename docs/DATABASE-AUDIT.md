# Audit base de données — MediCare Pro

Date : 17 août 2026.  
Périmètre : persistence uniquement (JPA, PostgreSQL, Flyway, Hibernate).  
Aucune fonctionnalité métier nouvelle n’a été ajoutée dans cette étape.

PostgreSQL inspecté : `localhost:5433` / `medicare_db` / **PostgreSQL 18.4**.  
Avant cette étape : **pas de table `flyway_schema_history`**. Schéma issu de Hibernate `ddl-auto=update`.

## 1. Configuration

| Élément | Valeur |
| --- | --- |
| URL | `jdbc:postgresql://localhost:5433/medicare_db` (`DB_URL`) |
| Profil par défaut | `dev` |
| Hibernate `ddl-auto` | `validate` (dev / prod) — plus de `update` |
| Dialecte | `PostgreSQLDialect` |
| Time zone JDBC | `Africa/Casablanca` |
| `open-in-view` | `false` |
| Flyway | activé, `classpath:db/migration` |
| `baseline-on-migrate` | `true`, `baseline-version=0` (base Hibernate existante sans historique) |
| `validate-on-migrate` | `true` |
| `out-of-order` | `false` |
| Table Flyway | `flyway_schema_history` |
| Tests unitaires | Flyway **désactivé**, H2 `create-drop` (JSONB / triggers PG non supportés) |

Pas de `application.yml`. Pas de `CommandLineRunner` / seed Java.  
Seed SQL : rôles / permissions dans **V2** (catalogue RBAC). Pas d’utilisateur fictif, pas de patient de démo.

## 2. Entities JPA et tables mappées

| Entity | Table | PK | Relations |
| --- | --- | --- | --- |
| `Patient` | `patients` | `id` IDENTITY | `createdBy` → `utilisateurs` (`created_by_id`) |
| `Examen` | `examens` | `id` IDENTITY | `patient` (NOT NULL), `prescripteur` → `medecins_referents`, `createdBy` / `assignedRadiologue` → `utilisateurs`, `historique`, `statusHistory` |
| `HistoriqueExamen` | `historique_examen` | `id` IDENTITY | `examen` NOT NULL |
| `ExamStatusHistory` | `exam_status_history` | `id` IDENTITY | `examen` NOT NULL ; `actor_id` BIGINT sans `@ManyToOne` |
| `Utilisateur` | `utilisateurs` | `id` IDENTITY | aucune collection JPA vers `roles` |
| `PasswordResetToken` | `password_reset_tokens` | `id` IDENTITY | `utilisateur` NOT NULL |
| `MedecinReferent` | `medecins_referents` | `id` IDENTITY | aucune |
| `AuditLog` | `audit_logs` | `id` IDENTITY | aucune (immuable côté SQL) |
| `SecurityEvent` | `security_events` | `id` IDENTITY | aucune (immuable côté SQL) |

Enums Java (`@Enumerated(STRING)`) :

| Enum | Valeurs | Colonne |
| --- | --- | --- |
| `RoleUtilisateur` | DIRECTEUR, RADIOLOGUE, MANIPULATEUR, SECRETARIAT | `utilisateurs.role` |
| `Modalite` | Scanner, IRM, Mammographie, Radiologie, Échographie | `examens.modalite` |
| `EtatPatient` | attendu, arrive, retard, attente_longue | `examens.etat_patient` |
| `StatutCr` | a_faire, en_redaction, signe, imprime | `examens.statut_cr` |
| `Paiement` | impaye, cote, paye | `examens.paiement` |
| `EncounterStatus` | SCHEDULED … NO_SHOW | `examens.workflow_status` |

`Paiement` / `EtatPatient` / `Modalite` / `StatutCr` ne sont **pas** des `@Entity` : ce sont des enums.

Repositories : `PatientRepository`, `ExamenRepository`, `UtilisateurRepository`, `MedecinReferentRepository`, `PasswordResetTokenRepository`, `AuditLogRepository`, `SecurityEventRepository`, `ExamStatusHistoryRepository`.  
Pas de repository pour `HistoriqueExamen` (cascade depuis `Examen`).

## 3. Tables existantes (avant Flyway, snapshot live)

6 tables, données conservées :

| Table | Lignes | Notes live |
| --- | --- | --- |
| `patients` | 1 | Colonne orpheline `age` (INTEGER), **pas** d’unicité sur `cin` |
| `examens` | 1 | Unique `num_sejour` (nom Hibernate `ukioymwy1i0iqh1tskydq0pf8gf`) ; CHECK enums |
| `historique_examen` | 1 | FK `examen_id` **sans index** |
| `medecins_referents` | 2050 | Colonne `imported_at` (script Python), id via `SERIAL`/`nextval` |
| `utilisateurs` | 3 | Unique `email` ; CHECK sur 4 rôles |
| `password_reset_tokens` | 0 | Unique `token` ; FK sans index |

PK : toutes `id` bigint.  
FK live :

- `examens.patient_id` → `patients(id)`
- `examens.prescripteur_id` → `medecins_referents(id)`
- `historique_examen.examen_id` → `examens(id)`
- `password_reset_tokens.utilisateur_id` → `utilisateurs(id)`

Noms de contraintes Hibernate (`fkdms6kr7p4ilro28r9s7bhifwk`, etc.) : **conservés** sur la base existante (`CREATE TABLE IF NOT EXISTS` ne les recrée pas).

## 4. Tables attendues après V1–V3 (cible persistence actuelle)

### 4.1 Mappées JPA (obligatoires pour `ddl-auto=validate`)

`patients`, `examens`, `historique_examen`, `medecins_referents`, `utilisateurs`, `password_reset_tokens`, `exam_status_history`, `audit_logs`, `security_events`.

### 4.2 SQL seulement (V2, pas d’entity)

`roles`, `permissions`, `role_permissions`, `user_roles`, `idempotency_keys`.

Le RBAC **runtime** reste `utilisateurs.role` + `PermissionCatalog` (Java). Les tables `roles` / `permissions` sont un catalogue SQL, non lues par JPA. Ne pas les supprimer : elles ne cassent pas le contrat frontend.

### 4.3 Non créées volontairement (phases ultérieures)

Pas de `appointments`, `waiting_queue`, `encounters`, `worklist` (table), `invoices`, `payments`, `imaging_*`, `reports`, `notifications`, `fraud_*`.  
L’ancienne ébauche `V3__domain_tables.sql` n’avait **jamais** été appliquée ; elle a été remplacée par `V3__schema_hardening.sql` **avant** le premier `flyway_schema_history`.

## 5. PK / FK / indexes / contraintes (cible)

### PK

Toutes les tables versionnées : `id` `BIGINT GENERATED BY DEFAULT AS IDENTITY` (sauf tables déjà créées en SERIAL/IDENTITY Hibernate, inchangées).

### FK ajoutées par V2 (en plus du live)

- `patients.created_by_id` → `utilisateurs(id)`
- `examens.created_by_id` → `utilisateurs(id)`
- `examens.assigned_radiologue_id` → `utilisateurs(id)`
- `exam_status_history.examen_id` → `examens(id)`
- `exam_status_history.actor_id` → `utilisateurs(id)`
- `role_permissions`, `user_roles` → `roles` / `permissions` / `utilisateurs`

`audit_logs.user_id` : **pas** de FK (conservation si utilisateur soft-deleted).

### Unicité

| Objet | Type |
| --- | --- |
| `patients.cin` | unique index `uk_patients_cin` (V1) — **absent** sur le live Hibernate |
| `patients.numero_dossier` | unique index + NOT NULL (V2 + V3) |
| `utilisateurs.email` | unique |
| `examens.num_sejour` | unique |
| `password_reset_tokens.token` | unique |
| `roles.code`, `permissions.code` | unique |
| `idempotency_keys (idempotency_key, user_id)` | unique |

### Indexes (V2 + V3)

- patients : `cin`, `telephone`, `(LOWER(nom), LOWER(prenom))`, `date_naissance`, `num_affiliation`, `deleted_at`, `created_by_id`
- examens : `date_examen`, `etat_patient`, `workflow_status`, `modalite`, `patient_id`, `prescripteur_id`, `assigned_radiologue_id`, `created_by_id`
- `exam_status_history (examen_id, created_at)`
- `historique_examen (examen_id)` (V3)
- `password_reset_tokens (utilisateur_id)` (V3)
- audit / security : action, entity, user, email
- `utilisateurs.deleted_at` (V3)

### CHECK (alignés Hibernate live)

- `utilisateurs.role` : 4 rôles Java
- `examens.etat_patient`, `modalite`, `paiement`, `statut_cr`

### Triggers

`audit_logs` et `security_events` : UPDATE/DELETE interdits (`prevent_audit_mutation`). PostgreSQL 14+ (`EXECUTE FUNCTION`). Live = PG 18.

## 6. Différences Entity ↔ PostgreSQL (live, avant migration)

| Écart | Impact | Traitement |
| --- | --- | --- |
| `patients.age` en base, **absent** de `Patient` | Extra-colonne : `validate` OK ; l’âge API est calculé depuis `date_naissance` | Conservée, non mappée, `ADD COLUMN IF NOT EXISTS` en V3 |
| `medecins_referents.imported_at` absent de l’entity | Extra-colonne ; utilisée par `scripts/import_medecins.py` | Conservée, non mappée |
| `Patient.cin` `unique=true` mais **pas** d’unicité live | `validate` échouerait | Index unique V1 |
| Colonnes V2 (`nom`, `prenom`, `numero_dossier`, `version`, `workflow_status`, lock login, `created_at`…) absentes du live | `validate` échouerait | V2 `ADD COLUMN IF NOT EXISTS` |
| Tables `audit_logs`, `exam_status_history`, `security_events` absentes | `validate` échouerait | V2 |
| `AuditLog` / `SecurityEvent` : Java `Instant` vs `TIMESTAMP` sans TZ | `validate` type mismatch fréquent | V2 : `TIMESTAMP(6) WITH TIME ZONE` |
| `LocalDateTime` Hibernate → `timestamp(6)` vs `TIMESTAMP` | Risque de validate | `TIMESTAMP(6)` dans V1/V2 |
| Index unique Hibernate (`ukioymwy…`) vs noms stables Flyway | Double index unique possible sur email / num_sejour | Inoffensif ; pas de DROP |
| `medecins_referents.id` : `nextval(seq)` vs IDENTITY ailleurs | `GenerationType.IDENTITY` fonctionne | Pas d’ALTER du générateur |
| Tables SQL `roles` / `permissions` non mappées | Extra-tables | Documenté ; RBAC Java inchangé |
| 4 rôles SQL CHECK vs 12 rôles `rbac.ts` | Hors persistence de cette étape | CHECK conservé (données existantes) |

## 7. Migrations

| Fichier | Rôle | Données |
| --- | --- | --- |
| `V1__baseline_existing_schema.sql` | 6 tables historiques, unique indexes, CHECK enums | Aucune insertion |
| `V2__rbac_audit_patient_workflow.sql` | Colonnes patients/examens/users, workflow, audit, RBAC SQL | Backfill `nom`/`prenom`/`numero_dossier`/`workflow_status` ; INSERT rôles/permissions ; mapping `user_roles` |
| `V3__schema_hardening.sql` | Indexes FK, colonnes legacy, `numero_dossier` NOT NULL | UPDATE `numero_dossier` si NULL seulement |

Convention : `V{n}__description.sql`. **Ne pas modifier** une révision déjà enregistrée dans `flyway_schema_history`.  
V1–V3 ont été ajustées **avant** le premier apply (historique Flyway absent).

V2 backfill `workflow_status` à partir de `etat_patient` (lignes encore à `SCHEDULED` par défaut). Ne supprime aucune ligne.

## 8. Données initiales

- **V2** : 10 rôles catalogue (`SUPER_ADMIN` … `AUDITEUR`) + permissions + matrice `role_permissions`. Mapping `DIRECTEUR`→`DIRECTION`, `SECRETARIAT`→`ACCUEIL`.
- **Aucun** user seed, **aucun** patient seed, **aucun** tarif.
- `insurance_providers` / `exam_types` / `tariffs` : **non créés** (c’était l’ancienne V3 domaine).

## 9. Problèmes détectés

1. **Premier boot Flyway** sur base Hibernate réelle : c’était le risque n°1. Mitigé par `IF NOT EXISTS` + `baseline-on-migrate=0`.
2. **Unicité CIN** absente en live : V1 l’ajoute. Échec possible si doublons CIN dans un autre environnement (ici : 0 doublon).
3. **Index FK manquants** (`historique_examen.examen_id`, tokens) : V3.
4. **Colonnes orphelines** `age` / `imported_at` : ne pas DROP.
5. **Double système RBAC** : enum Java 4 valeurs vs tables SQL 10 rôles vs UI 12 rôles. Persistence : ne pas élargir le CHECK maintenant.
6. **Tests ≠ Flyway** : H2 `create-drop` ne prouve pas les SQL PG. La preuve est le boot `dev` sur `medicare_db`.
7. **`CREATE UNIQUE INDEX uk_patients_cin`** : plusieurs `NULL` autorisés en PG ; chaînes vides = une seule ligne.
8. Ancienne V3 domaine : tables futures + tarifs en dur. **Non appliquée, retirée** pour ne pas figer un schéma métier hors périmètre.

## 10. Risques de migration

| Risque | Gravité | Mitigation |
| --- | --- | --- |
| Unique CIN sur données dupliquées | Haute ailleurs, nulle ici | Vérifier `GROUP BY cin HAVING count(*)>1` avant prod |
| `numero_dossier SET NOT NULL` | Moyenne | UPDATE préalable `PAT-`+id |
| Triggers audit : PG &lt; 14 (`EXECUTE FUNCTION`) | Haute si PG 11–13 | Ici PG 18 |
| Locks `ALTER TABLE` sur `medecins_referents` (2050 lignes) | Faible | Colonnes nouvelles NULL/DEFAULT, pas de rewrite massif |
| Checksum Flyway si on réécrit V1 après apply | Haute | Interdit une fois `flyway_schema_history` rempli |
| `ddl-auto=validate` après migrate | Haute | Boot Spring = test réel |
| Baseline `0` puis V1 sur base non vide | Normal | V1 idempotent |

Aucune suppression de ligne. Aucun `DROP TABLE`. Aucun `TRUNCATE`.

## 11. Validation effectuée (17 août 2026)

| Contrôle | Résultat |
| --- | --- |
| `.\mvnw.cmd clean test` | OK (incl. `FlywayMigrationConventionTest`) |
| Flyway sur `medicare_db` | Baseline 0 + V1 + V2 + V3, `success=t` |
| Hibernate `validate` | OK (application démarrée) |
| Données métier | patients 1, examens 1, historique 1, médecins 2050 — inchangés |
| `utilisateurs` | 3 → 4 (compte de smoke-test `db-stability-check@medicare.local`) |
| `GET /api/patients` sans JWT | 401 |
| Login JWT + `GET /api/patients` | 200, 1 patient, `numeroDossier=PAT-000001` |
| `GET /api/worklist` sans JWT | 401 |
| `GET /api/worklist` avec JWT | 200 |
| `npm run build` | OK |
| `/actuator/health` | 503 `DOWN` (détails masqués). La DB fonctionne (Hikari + requêtes métier). Cause probable : indicateur mail SMTP vide, hors périmètre persistence. |
| Flyway vs PG 18 | WARN « upgrade recommended » (Flyway bundlé Spring Boot 3.4.4 teste jusqu’à PG 17). Migrations appliquées. |

Notices PostgreSQL `42P07` / `42701` pendant V1/V3 : `IF NOT EXISTS` sur objets déjà présents. Attendu, non bloquant.

## 12. Compatibilité applicative

Non modifié dans cette étape : patients API, JWT, RBAC Java/UI, dashboard, `auth-session`, `use-auth`, `use-role`, `errors.ts`, `data-state`, `use-api-resource`, `FRONTEND-BACKEND-CONTRACT.md`.

Worklist continue de lire `examens`, pas une table `worklist`.
