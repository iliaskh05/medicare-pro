# Déploiement — centre local (LAN)

## Topologie

```
Poste client (navigateur)
    → http://SERVER_IP:8081   UI Vite / preview
    → http://SERVER_IP:8080   API Spring (`/api`, `/ws/chat`)
    → http://SERVER_IP:8090   ML FastAPI (optionnel)
PostgreSQL sur le serveur (ex. port 5433)
```

`localhost` dans `VITE_JAVA_API_URL` désigne **le poste du navigateur**. Sur un PC client du LAN, il faut l’IP/hostname du serveur, ou laisser le fallback automatique (même hostname que la page, port 8080).

## Variables

Copier `.env.example` → `.env.local` (dev) ou variables d’environnement système (prod). Ne pas committer de secrets.

| Variable | Rôle |
| --- | --- |
| `VITE_JAVA_API_URL` | URL API bakée au `npm run build` |
| `VITE_ML_API_URL` | Microservice ML |
| `DB_URL` / `DB_USERNAME` / `DB_PASSWORD` | PostgreSQL |
| `RADIOCRM_JWT_SECRET` | Secret HMAC (256 bits, obligatoire en prod) |
| `RADIOCRM_CORS_ORIGINS` | Origines UI, **virgules**, inclure `http://SERVER_IP:8081` |
| `RADIOCRM_CENTRE_ICE` / `_IF` / `_TAXE_PRO` | En-tête facture |
| `RADIOCRM_PUBLIC_REGISTER` | `false` en production |
| `GEMINI_API_KEY` / `GEMINI_ENABLED` | Assistant (serveur seulement) |

Profil Spring `prod` : secrets **obligatoires** via env (`DB_URL`, `DB_USERNAME`, `DB_PASSWORD`, `RADIOCRM_JWT_SECRET`). CORS : origines explicites **plus** IP privées RFC1918 si `RADIOCRM_CORS_ALLOW_PRIVATE_LAN=true` (pas de `*`).

## Démarrage type

1. PostgreSQL up, base `medicare_db` (écoute localhost uniquement).
2. `mvn -DskipTests package` puis `java -jar` sur `:8080`, `SERVER_ADDRESS=0.0.0.0`, profil `prod`.
3. Flyway applique V1–V23 au boot.
4. `npm run build` avec `VITE_JAVA_API_URL=http://SERVER_IP:8080`.
5. `npm run preview:lan` (hôte 0.0.0.0 port 8081).
6. Contrôle : `GET http://SERVER_IP:8080/api/system/health` depuis un **PC client**. Diagnostic : écran de connexion.

## Sauvegarde

Rétention proposée : **quotidien 14 jours**, **hebdomadaire 8 semaines**. Ne pas supprimer automatiquement sans procédure écrite.

PostgreSQL (à adapter, `SERVER_OS = TO_BE_DEFINED`) :

```
pg_dump -Fc -d medicare_db -f /backups/medicare/YYYY-MM-DD.dump
```

Fichiers :

```
copier RADIOCRM_UPLOAD_DIR (défaut ./data/uploads) vers le même jeu de sauvegarde.
```

Restauration : arrêter Spring → `pg_restore` → recopier `uploads` → redémarrer. Tester une restauration **avant** le go-live.

## Santé

- Public : `GET /api/system/health` → `{ status, api, database }` sans mots de passe ni JDBC URL.
- Authentifié (`SETTINGS_READ`) : `GET /api/system/status` (ML, version, centre).

## Démarrage type

1. PostgreSQL up, base `medicare_db`.
2. `mvn -DskipTests package` puis `java -jar` (ou IDE) sur `:8080`, profil `prod`.
3. Flyway applique V1–V23 au boot.
4. `npm run build` avec `VITE_JAVA_API_URL=http://SERVER_IP:8080`.
5. Servir `.output` / `vite preview` sur `:8081`.
6. Contrôle : `GET http://SERVER_IP:8080/api/system/health` (public). Diagnostic UI : Paramètres → Sécurité.

## Santé

- Public : `GET /api/system/health` et `/actuator/health`
- Authentifié (`SETTINGS_READ`) : `GET /api/system/status` (API, DB, ML, WS, version, centre)

## Pièges LAN

1. Build frontend avec `localhost` + CORS limité à localhost → clients LAN cassés. Corriger URL **et** CORS.
2. Pare-feu Windows : ouvrir 8080 / 8081 (et 8090 si ML).
3. JWT / mot de passe DB par défaut (`postgres`) interdits en production.
4. WebSocket chat : token dans la query (`/ws/chat?token=`) — exposé dans logs proxy ; à durcir.

## Migrations

Ne pas éditer un fichier Flyway déjà appliqué. Nouvelle évolution = `V{n+1}__...sql`. Tests H2 : Flyway off, `ddl-auto=create-drop`.
