# Installation client (pilot)

Les PCs secrétariat / manipulateur / radiologue **n’installent pas** Node, Java, Maven, PostgreSQL ni Python.

## Client supporté pour le pilot

Navigateur (Chrome / Edge) vers l’UI du serveur :

```
http://SERVER_IP:8081
```

`SERVER_IP = TO_BE_DEFINED`

## Configuration serveur sur le poste

Écran de connexion → **Adresse du serveur** → `http://SERVER_IP:8080` → Tester.

La valeur est stockée dans `localStorage` (`radiocrm:server-url`) sur **ce** poste. Pas de rebuild.

## Desktop .exe (Tauri)

**Non livré dans ce dépôt.** Il n’y a pas de `src-tauri` ni de `MediCarePro-Setup.exe`.

Pour le pilot, le navigateur vers l’UI centrale est le client.

## Compte

Un administrateur crée les comptes (register ouvert seulement si `RADIOCRM_PUBLIC_REGISTER=true`, à laisser `false` en pilot). Rôles : `DIRECTEUR`, `RADIOLOGUE`, `MANIPULATEUR`, `SECRETARIAT`.
