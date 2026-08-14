# RadioCRM — Architecture des données & contrat d'API (Backend Java/Spring Boot)

Rapport technique dérivé du code réel de l'interface (`src/lib/api/*`, `src/types/*`). Aucune modification de l'interface n'est prévue.

## 1. Périmètre

Deux backends sont adressés par le frontend :

- `VITE_JAVA_API_URL` → API métier Spring Boot (patients, worklist, factures, correspondants, audit, chat, WhatsApp).
- `VITE_ML_API_URL` → microservice Python (clustering fraude caisse, analyse d'image).

Authentification : le frontend envoie `Authorization: Bearer <token>` (token stocké côté client sous `radiocrm:token`). Prévoir `POST /api/auth/login` renvoyant `{ token, utilisateur: { id, nom, role } }` avec `role ∈ DIRECTEUR | ACCUEIL | TECHNICIEN | RADIOLOGUE`.

## 2. Modèle de données (entités)

### patients
| champ | type | note |
|---|---|---|
| id | BIGINT PK | |
| nom_complet | VARCHAR | affiché tel quel |
| cin | VARCHAR unique | |
| date_naissance | DATE | `age` calculé côté API |
| sexe | VARCHAR(1) | F / M |
| telephone, email | VARCHAR | |
| mutuelle | VARCHAR | AMO, CNSS, CNOPS, Privée |
| num_affiliation | VARCHAR | |
| medecin_traitant | VARCHAR | |
| ville, quartier, adresse | VARCHAR | |
| prochain_rdv | TIMESTAMP | |

### medecins_referents (déjà présent)
`id, id_medecin_excel, nom, telephone, email, specialite, adresse, ville, quartier`. Vue agrégée pour la page Direction : `referes` (nb d'examens prescrits), `evolution` (% vs période précédente).

### examens (cœur de la Worklist)
| champ | type | note |
|---|---|---|
| id | BIGINT PK | |
| num_sejour | VARCHAR unique | ex. `SEJ-2026-000412` |
| patient_id | FK patients | |
| prescripteur_id | FK medecins_referents (nullable) | saisie libre possible |
| prescripteur_nom | VARCHAR | conservé si pas d'ID |
| radiologue_id | FK utilisateurs | exposé en `medecin` |
| date_examen | TIMESTAMP | |
| salle | VARCHAR | |
| description | VARCHAR | libellé de l'acte |
| modalite | ENUM | Scanner, IRM, Mammographie, Radiologie, Échographie |
| etat_patient | ENUM | attendu, arrive, retard, attente_longue |
| statut_cr | ENUM | a_faire, en_redaction, signe, imprime |
| paiement | ENUM | impaye, cote, paye |
| montant | NUMERIC(10,2) | MAD |

### comptes_rendus
`id, examen_id FK, texte TEXT, statut ENUM(a_faire|en_redaction|signe|imprime), auteur_id, signe_le TIMESTAMP, pdf_path`.

### factures
`id, reference VARCHAR unique, examen_id FK, patient_id FK, date, examen VARCHAR, total, part_mutuelle, reste_a_charge NUMERIC, paiement ENUM(Espèces|Carte bancaire|Chèque|Virement), statut ENUM(Payé|En attente de mutuelle|Annulé), caissier_id`.

### anomalies_facturation (module Audit)
`id, facture_id FK, patient VARCHAR, cin, acte, type_examen ENUM(IRM|Scanner|Échographie|Mammographie|Radiologie), date TIMESTAMP, montant, bareme, score SMALLINT(0-100), cluster VARCHAR, prescripteur, mutuelle, statut ENUM(pending|confirmed|dismissed)` + table fille `anomalie_motifs(anomalie_id, motif)`.

### scans / etudes_imagerie
`id, examen_id FK, patient VARCHAR, modalite, region, date, image_url, radiologue, statut` + `annotations(id, scan_id, x, y, largeur, hauteur, label, confiance NUMERIC)`.

### historique_examen / audit_trail
`id, examen_id FK, date TIMESTAMP, auteur VARCHAR, action VARCHAR` — alimente l'onglet Historique du tiroir patient.

### Messagerie interne
`chat_channels(id, nom, type ENUM(groupe|prive), membres)`, `chat_messages(id, channel_id, auteur, role, contenu, type ENUM(texte|image|audio|document), piece_jointe_url, envoye_le, lu)`.

### WhatsApp
`wa_conversations(id, patient_id, telephone, nom, dernier_message, non_lus, statut ENUM(ia|attente|humain))`, `wa_messages(id, conversation_id, direction ENUM(in|out), auteur ENUM(patient|bot|agent), contenu, piece_jointe_url, envoye_le)`.

## 3. Endpoints REST attendus (API Java)

Worklist / examens
- `GET /api/worklist?date=YYYY-MM-DD`
- `POST /api/worklist` (création patient + examen en une passe)
- `PATCH /api/worklist/{id}` — `{ etatPatient?, statutCr?, paiement? }`
- `PUT /api/worklist/{id}/compte-rendu` — `{ texte }`

Patients
- `GET /api/patients`, `POST /api/patients`, `GET /api/patients/{id}`
- `GET /api/patients/{id}/historique|imagerie|ordonnances|factures|anomalies`
- `GET /api/patients/{id}/dossier-financier`

Médecins correspondants
- `GET /api/medecins`, `POST /api/medecins`
- `GET /api/medecins/prescripteurs` (stats Direction)
- `POST /api/medecins/{id}/comptes-rendus` — `{ reportId }`

Dashboard / opérationnel
- `GET /api/dashboard/kpis`, `GET /api/salle-attente`, `GET /api/planning/tension`
- `GET /api/alertes`, `GET /api/comptabilite/synthese`

Facturation
- `GET /api/factures`, `POST /api/factures`, `PATCH /api/factures/{reference}/reglement`

Comptes rendus & documents
- `GET /api/comptes-rendus?statut=&modalite=`
- `GET /api/documents/{id}/pdf` (binaire `application/pdf`)

Audit & conformité (réservé DIRECTEUR)
- `GET /api/audit/kpis`, `GET /api/audit/tendance`, `GET /api/audit/anomalies`, `GET /api/audit/urgences`
- `PATCH /api/audit/anomalies/{id}` — `{ statut: "confirmed" | "dismissed" }`
- `GET /api/audit/fraude/anomalies` (proxy du microservice)

Imagerie
- `GET /api/imagerie/scans`, `POST /api/imagerie/{studyId}/analyse`

Messagerie & WhatsApp
- `GET /api/chat/channels`, `GET|POST /api/chat/channels/{id}/messages`
- `GET /api/whatsapp/conversations`, `POST /api/whatsapp/conversations/{id}/messages`

Microservice Python
- `POST /fraud/clustering` (`{ sensitivity }` → `FraudClusteringResponse`), `POST /fraud/feedback`
- `GET /fraud/clusters`, `GET /fraud/predictions`

## 4. Payload JSON exact du tableau Worklist

`GET /api/worklist?date=2026-08-15` → tableau d'objets ; toute clé optionnelle peut être omise ou `null`, mais les clés d'énumération doivent respecter les valeurs listées, sinon les badges ne s'affichent pas.

```json
[
  {
    "id": "412",
    "numSejour": "SEJ-2026-000412",
    "patient": "BENALI Sara",
    "cin": "BK449120",
    "telephone": "+212 6 61 22 45 88",
    "age": 43,
    "sexe": "F",
    "medecin": "Dr Adnane",
    "prescripteur": "Dr Youssef Alaoui",
    "dateExamen": "2026-08-15T09:30:00",
    "salle": "Salle 2 — IRM",
    "description": "IRM Lombaire",
    "modalite": "IRM",
    "etatPatient": "arrive",
    "statutCr": "en_redaction",
    "paiement": "cote",
    "montant": 2200,
    "compteRendu": "Discopathie L4-L5 sans conflit radiculaire.",
    "historique": [
      { "date": "2026-08-15T09:12:00", "auteur": "Accueil", "action": "Arrivée patient enregistrée" },
      { "date": "2026-08-15T09:41:00", "auteur": "Dr Adnane", "action": "Compte rendu en rédaction" }
    ]
  }
]
```

Réponse de `POST /api/worklist` : le même objet complet (le frontend l'insère directement dans le tableau). Corps envoyé par le formulaire :

```json
{
  "nom": "BENALI", "prenom": "Sara", "cin": "BK449120",
  "naissance": "1983-04-12", "sexe": "F", "telephone": "+212661224588",
  "typeExamen": "IRM Lombaire", "modalite": "IRM", "salle": "Salle 2 — IRM",
  "dateHeure": "2026-08-15T09:30",
  "prescripteurId": "17", "prescripteurNom": "Dr Youssef Alaoui"
}
```

## 5. Conventions techniques

- Dates : ISO 8601 local (`YYYY-MM-DDTHH:mm:ss`), fuseau Africa/Casablanca.
- Montants : nombres en MAD sans séparateur (formatage côté frontend).
- Identifiants : le frontend convertit tout en `string`; le backend peut renvoyer des entiers.
- Erreurs : JSON `{ "message": "...", "code": "..." }` avec le code HTTP réel — le frontend affiche `message`.
- Listes vides : renvoyer `[]` (jamais `null`) pour déclencher les états vides propres.
- CORS : autoriser l'origine du frontend + en-tête `Authorization`.
- RBAC serveur : `403` sur `/api/audit/**` et `/api/comptabilite/**` hors rôle DIRECTEUR (le masquage frontend n'est pas une sécurité).

## 6. Suite possible (hors périmètre de ce rapport)

Si vous le souhaitez, je peux générer les entités JPA, repositories, DTOs et contrôleurs Spring Boot correspondant exactement à ce contrat, dans `src/main/java/com/crm/medicare/`.
