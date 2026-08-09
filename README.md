# MediCare Pro

Agis en tant que développeur frontend et UI/UX designer expert (React, Tailwind CSS, Lucide Icons, Shadcn UI). Je souhaite générer l'interface complète d'un CRM médical sur mesure pour un centre de radiologie au Maroc.

L'application doit avoir un design moderne, épuré, très professionnel et inspirer la confiance (utilisation d'une palette de couleurs médicale : blanc, gris clair slate-50, bleu "santé" blue-600, avec des touches de vert pour le succès et rouge/orange pour les alertes).

L'interface doit comprendre un Menu Latéral (Sidebar) avec une navigation claire et un Header avec le profil de l'utilisateur.

Génère les 5 vues principales suivantes avec des données mockées (fictives) très réalistes adaptées au Maroc :

📊 Vue Tableau de bord (Dashboard)

En haut : 4 cartes KPI (Patients du jour, Chiffre d'affaires mensuel en MAD, Examens en attente, Alertes de facturation).

Au centre : Un graphique en barres (BarChart) montrant la répartition des actes par semaine (IRM, Scanner, Échographie, Radio standard).

En bas : Un tableau raccourci des "Prochains patients en salle d'attente" et une liste des "Dernières alertes de fraude/anomalies".

👥 Vue Gestion des Patients

Une barre de recherche performante et des filtres (Par type de mutuelle : AMO, CNSS, CNOPS, Privée).

Un grand tableau de données (Data Table) avec : Nom complet, CIN, Âge, Téléphone, Mutuelle, et un bouton "Voir dossier".

Prévois un composant "Modal" (tiroir ou popup) pour l'ajout d'un nouveau patient.

🏥 Vue Saisie des Actes & Facturation

C'est le cœur du réacteur. Un formulaire en deux colonnes (Card) pour enregistrer un nouvel examen :

Colonne 1 (Infos médicales) : Sélection du patient, Type d'examen (Menu déroulant : IRM Cérébrale, Scanner Thoracique, etc.), Médecin prescripteur.

Colonne 2 (Finances) : Montant total (MAD), Part prise en charge (Mutuelle), Reste à charge (Patient), Mode de paiement.

Un tableau en dessous listant l'historique des dernières factures saisies avec des "Badges" de statut (Payé, En attente de mutuelle, Annulé).

🩺 Vue Réseau des Médecins Prescripteurs

Une liste sous forme de cartes (Cards) des médecins qui envoient des patients au centre, avec leur spécialité, leur adresse, et le nombre de patients référés ce mois-ci.

⚠️ Vue Audit & Conformité (Module IA Fraude)

Une vue dédiée à l'analyse algorithmique.

Affiche un tableau détaillé des "Factures Suspectes" détectées par l'IA.

Colonnes du tableau : ID Facture, Date, Patient, Montant, "Raison de l'alerte" (ex: "Sur-prescription", "Montant hors norme", "Incohérence des actes"), et un "Score de Risque" (Badge rouge/orange/jaune).

Un bouton d'action par ligne : "Valider l'acte" ou "Bloquer pour investigation".

Contraintes techniques pour la génération :

Utilise des composants UI modernes (cartes, badges avec de l'opacité, tableaux avec pagination).

Rends l'application fully responsive (adaptée aux écrans d'ordinateurs d'accueil de secrétariat).

Mock (simule) toutes les données de manière réaliste avec des noms à consonance marocaine (ex: Karim Bennani, Fatima Idrissi) et des montants cohérent

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/a93d55da-fc6a-4fb0-a9fa-4b9f92eca26c).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
