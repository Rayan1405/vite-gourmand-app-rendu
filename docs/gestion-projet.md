# Documentation Gestion de Projet

## Methode de travail

Approche agile courte, organisee en lots fonctionnels.

- Cadence: iterations courtes avec validation frequente.
- Priorite: livrer un flux complet client -> commande -> traitement staff.
- Qualite: verification continue des parcours critiques.

## Decoupage des lots

1. Base projet et authentification
2. Catalogue client + commande
3. Back-office staff/admin
4. Emails metier et moderation avis
5. Stabilisation, ergonomie, finition rendu

## Outil de pilotage (structure recommandee)

Colonnes type Kanban:
- Backlog
- A faire
- En cours
- A verifier
- Termine

## Backlog fonctionnel (resume)

- En tant que client, je peux creer un compte et me connecter.
- En tant que client, je peux consulter les menus et commander.
- En tant que client, je vois une estimation detaillee (menu + livraison).
- En tant que staff, je peux traiter les commandes par statuts.
- En tant qu admin, je gere menus, comptes internes et avis.
- En tant que client, je peux laisser un avis apres commande terminee.

## Plan de test projet

Tests fonctionnels prioritaires:
- Auth: login/inscription/roles
- Commande: minimum personnes, reduction +5 personnes, stock
- Workflow statuts: accepted -> preparing -> delivering -> delivered -> ...
- Cas materiel prete: passage en retour materiel puis terminee
- Avis: depot client, moderation staff/admin, publication accueil
- Emails: confirmation commande, changement statut, retour materiel

## Gestion des risques

- Risque: incoherence des statuts commande
  - Action: validations serveur strictes
- Risque: donnees sensibles exposees
  - Action: `.env` exclu du rendu + `.env.example` fourni
- Risque: confusion de rendu
  - Action: script `prepare-rendu.sh` + checklist finale

## Validation finale

- Recette manuelle complete effectuee avant rendu
- Relecture des documents et des consignes ECF
- Verification des fichiers transmis
