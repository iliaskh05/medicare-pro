# Dépannage — connexion et pilot

## ✕ Serveur MediCare inaccessible

1. Le PC est-il sur le **même LAN** que le serveur (`LAN_SUBNET = TO_BE_DEFINED`) ?
2. `http://SERVER_IP:8080/api/system/health` répond-il depuis le PC ?
3. Pare-feu Windows du serveur : ports **8080** et **8081** ouverts vers le LAN, **pas** 5432/5433.
4. Spring est-il démarré ? `SERVER_ADDRESS=0.0.0.0` (pas seulement 127.0.0.1).
5. L’adresse saisie dans l’UI n’est **pas** `localhost` sur un PC client.

Bouton **Réessayer** sur l’écran de connexion.

## Connexion au réseau du centre perdue

Le navigateur est hors-ligne (`navigator.onLine === false`). Recâbler / Wi-Fi du centre.

## Session expirée

JWT expiré (`radiocrm.jwt.expiration-ms`, défaut 24 h). Se reconnecter. Ce n’est pas une panne serveur.

## Vous n'avez pas les droits…

Autorisation Spring (`@PreAuthorize`). Changer de compte / rôle — le masquage UI ne suffit pas.

## Agenda : impossible de charger les rendez-vous

Le message détaillé + Réessayer s’affichent. Causes fréquentes : API down, JWT invalide, CORS si l’origine UI n’est pas LAN/localhost.

## Facture / acompte

Un examen déjà acompte ne doit pas être « réinitialisé » à 0 à l’encaissement. Si un surpaiement passe, c’est un bug — ne pas contourner en recréant l’examen.

## Chat

Le WebSocket utilise `/ws/chat?token=` (dette : JWT dans les logs proxy). Si le chat tombe, le reste du RIS doit continuer.

## Sauvegarde

Voir `docs/DEPLOYMENT.md` § sauvegarde. Restaurer PostgreSQL **et** `data/uploads`.
