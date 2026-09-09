# Rapport de tests — pilot MediCare Pro

Date : 2026-09-09. `SERVER_IP = TO_BE_DEFINED`. Aucun second PC du centre n’était disponible dans cette session.

## Commandes exécutées

| Commande | Résultat |
| --- | --- |
| `mvn test` (suite complète, plus tôt dans la session) | PASS (exit 0) |
| `mvn -Dtest=SystemHealthTest,LanOriginTest` | PASS (exit 0) |
| `npm run build` | PASS (exit 0) |
| `curl http://127.0.0.1:8080/api/system/health` contre le process **déjà lancé** | FAIL — HTTP 401 (binaire / JVM non redémarré) |
| `MediCarePro-Setup.exe` / Tauri | Non présent dans le dépôt |
| Parcours navigateur login → PDF | Non exécuté de bout en bout |
| 2e PC LAN | Non exécuté |

## Matrice

| Test | PC | Result | Evidence | Issue |
| --- | --- | --- | --- | --- |
| Login | PC1 | FAIL | Non joué dans le navigateur cette passe | Process Spring à redémarrer |
| Patient | PC1 | FAIL | Non joué E2E | — |
| Appointment | PC1 | FAIL* | Tests Java `AppointmentLifecycleTest` PASS ; UI non E2E | Agenda affichait un titre générique (corrigé, non revu visuellement) |
| Check-in | PC2 | FAIL | Non joué | — |
| Waiting room | PC2 | FAIL | Test Java walk-in existant ; UI non E2E | — |
| Worklist | PC2 | FAIL | Tests Java PASS ; UI non E2E | — |
| Report | PC3 | FAIL | Non joué | — |
| Invoice | PC1 | FAIL* | `InvoiceBillingServiceTest` PASS | — |
| Payment / acompte | PC1 | FAIL* | Overpay + seed acompte couverts en Java | — |
| PDF | PC1 | FAIL | Non téléchargé depuis un client | — |
| Multi-user | PC1+PC2+PC3 | FAIL | Un seul poste | — |
| Health public | MockMvc | PASS | `SystemHealthTest` | JVM locale encore 401 |
| CORS RFC1918 | Unitaire | PASS | `LanOriginTest` | — |
| Desktop .exe | — | FAIL | Pas de Tauri | — |
| Backup restore | Serveur | FAIL | Procédure écrite, restore non exécutée | — |

\* PASS au niveau service Java, FAIL au critère « vérifié client réel ».

## Déclaration

**NOT READY FOR PILOT**

Le code et les tests automatisés du cœur métier sont verts. Le critère d’acceptation exige un serveur redémarré, un health 200 depuis un PC LAN, et le flux clinique dans un navigateur sur au moins deux postes.
