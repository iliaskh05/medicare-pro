# Installation serveur (pilot)

`SERVER_OS = TO_BE_DEFINED`

## Logiciels sur le serveur central uniquement

1. **Java 17**
2. **PostgreSQL** (port interne, ex. 5433)
3. **Maven** (ou un JAR déjà construit)
4. Node.js **uniquement** pour servir l’UI (`npm run preview`) — pas sur les PCs métier
5. Python **uniquement** si le scoring ML est activé

## PostgreSQL

1. Créer la base `medicare_db`.
2. Utilisateur dédié, mot de passe **non** `postgres`.
3. Écouter sur `localhost` (pas `*` vers le LAN).
4. Variables :

```
DB_URL=jdbc:postgresql://localhost:5433/medicare_db
DB_USERNAME=...
DB_PASSWORD=...
```

Au premier boot Spring, Flyway applique **V1 → V23**. Ne pas éditer une migration déjà appliquée.

## Spring Boot

```
SPRING_PROFILES_ACTIVE=prod
SERVER_ADDRESS=0.0.0.0
SERVER_PORT=8080
RADIOCRM_JWT_SECRET=<au moins 32 caractères>
RADIOCRM_PUBLIC_REGISTER=false
RADIOCRM_CORS_ALLOW_PRIVATE_LAN=true
```

Démarrage (exemple) :

```
java -jar target/medicare-*.jar --spring.profiles.active=prod
```

Le profil `prod` refuse de démarrer avec un JWT trop court ou `DB_PASSWORD=postgres`.

Contrôle : depuis un PC du LAN,

```
curl http://SERVER_IP:8080/api/system/health
```

Attendu : `{ "status": "UP", "api": "UP", "database": "UP" }` (champs éventuellement nuls pour le reste).

## UI

Sur le **même serveur** :

```
VITE_JAVA_API_URL=http://SERVER_IP:8080 npm run build
npx vite preview --host 0.0.0.0 --port 8081
```

Les postes ouvrent `http://SERVER_IP:8081`. Si le build a encore `localhost`, le client bascule vers `hostname:8080` **ou** l’opérateur saisit l’URL dans Configuration serveur.

## ML (optionnel)

```
ML_ENABLED=true
ML_SERVICE_URL=http://127.0.0.1:8090
```

Le flux clinique (patient → facture) **n’exige pas** Internet ni ML.

## Fichiers

`RADIOCRM_UPLOAD_DIR` (défaut `./data/uploads`) doit vivre sur le disque du serveur et être inclus dans les sauvegardes.
