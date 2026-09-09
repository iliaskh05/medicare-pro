# Architecture réseau — pilot centre

Placeholders d’infrastructure (à compléter sur site) :

```
SERVER_IP     = TO_BE_DEFINED
SERVER_OS     = TO_BE_DEFINED
LAN_SUBNET    = TO_BE_DEFINED
CLIENT_COUNT  = TO_BE_DEFINED
POSTGRES_PORT = 5433   (valeur actuelle du dépôt ; 5432 si install standard)
API_PORT      = 8080
UI_PORT       = 8081
ML_PORT       = 8090   (optionnel)
```

## Flux

```
PC secrétariat / manipulateur / radiologue
        │  HTTP(S) LAN
        ▼
Spring Boot  SERVER_IP:8080     ← seul service exposé aux postes
        │
        ├── PostgreSQL  localhost:5433   (interne serveur)
        ├── fichiers    ./data/uploads   (interne serveur)
        └── FastAPI ML  127.0.0.1:8090   (interne, optionnel)
```

Les PCs **n’installent pas** PostgreSQL, Java n’est pas requis sur le client si l’UI est un navigateur vers `http://SERVER_IP:8081`.

Jamais : `Client PC → PostgreSQL`.

## Ports pare-feu (serveur)

| Port | Direction | Qui |
| --- | --- | --- |
| 8080 | LAN → serveur | Postes MediCare (API + WS `/ws/chat`) |
| 8081 | LAN → serveur | Postes (UI `vite preview` / nginx) |
| 5433/5432 | **localhost only** | Spring Boot |
| 8090 | localhost or LAN restreint | Spring Boot → ML |

Ne pas publier ces ports sur Internet.

## CORS

Spring reflète l’`Origin` du client **uniquement** si :

1. elle est dans `RADIOCRM_CORS_ORIGINS`, ou
2. `RADIOCRM_CORS_ALLOW_PRIVATE_LAN=true` (défaut) et l’hôte est RFC1918 / localhost / `tauri://`.

Pas de `Access-Control-Allow-Origin: *` avec credentials (`allowCredentials=false`).

## UI sans rebuild

Chaque poste peut enregistrer `radiocrm:server-url` (écran Connexion / Paramètres → Sécurité) vers `http://SERVER_IP:8080`.
