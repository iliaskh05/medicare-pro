# Facturation — ledger, Maroc, e-facture

## Ledger autoritatif

Les tables `invoices`, `invoice_items`, `payments`, `refunds` sont la source de vérité des montants et du reste dû.

`examens.montant` / `acompte` / `paiements_examen` **ne sont pas droppés**. Ils restent un duplicat opérationnel (worklist / historique caisse). Un paiement worklist :

1. `InvoiceBillingService.ensureAndPayForExam` — crée la facture si absente (en reportant l’acompte examen déjà encaissé), puis encaisse sur la facture.
2. Écrit encore une ligne `paiements_examen`.

`Invoice.reste()` = `total - amountPaid + amountRefunded`.

Statuts FSM (`WorkflowEngine`) : `DRAFT` → `ISSUED` → `PARTIALLY_PAID` / `PAID` → `REFUNDED` / `CANCELLED` / `CREDIT_NOTE`.

## Numérotation

Table `invoice_sequences` (série + année, verrou `PESSIMISTIC_WRITE`). Format `FAC-YYYY-000001`. Série configurable : `billing.invoice.series` (`app_settings`). Colonne physique `seq_year` (V23) — `year` est un mot réservé H2.

## Champs marocains (facture commerciale)

Sur `invoices` (V22) : ICE / IF / taxe professionnelle vendeur, ICE / IF client, date de service, HT / TVA / taux, mentions légales, conditions de paiement.

TVA par défaut **0** (actes de soins). PDF (`FactureService`) : en-tête centre + ICE/IF/TP, nom de fichier `FACTURE_{ref}_{patient}.pdf`, pied de page indiquant qu’il s’agit d’une **facture commerciale, distincte d’une facture électronique certifiée DGI**.

Identité centre : `radiocrm.centre.ice|if|taxe_professionnelle` et/ou `app_settings` `centre.ice` / `centre.if` / `centre.taxe_professionnelle`.

## E-facture (architecture seulement)

Colonnes `electronic_*` + table `invoice_electronic_events`. `ElectronicInvoiceService` calcule un hash local et journalise `ISSUED` / `CANCELLED`. **Aucun appel DGI / e-invoicing national.**

## API

Préfixe `/api/factures` (alias `/api/v1/factures`) :

| Méthode | Chemin | Rôle |
| --- | --- | --- |
| GET | `/` `{id}` | Liste / détail |
| POST | `/` | Création |
| POST | `/{id}/paiements` | Encaissement (idempotency key) |
| POST | `/{id}/refund` | Avoir partiel |
| POST | `/{id}/cancel` | Annulation |
| GET | `/{id}/pdf` | PDF facture |
| GET | `/examen/{id}` | PDF lié à l’examen (préfère la facture si elle existe) |

Caisse worklist : `POST /api/worklist/{id}/paiements`.

## Legacy

V22 backfill `MIG-{examenId}` pour les examens déjà payés sur l’ancien ledger, copie `paiements_examen` → `payments` (`source_type=EXAM_LEDGER`).
