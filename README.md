# Vite & Gourmand - Prototype ECF DWWM

Application web de traiteur evenementiel avec 3 espaces: connexion, client, employe/admin.

## Architecture

- Frontend: HTML, CSS, JavaScript natif
- Backend: Node.js (serveur HTTP natif)
- Base relationnelle:
  - MySQL si `DB_HOST` + `DB_USER` + `DB_NAME` sont renseignes
  - SQLite (`data/app.db`) en secours automatique
- Base NoSQL: MongoDB pour les stats de commandes
- Emails: SMTP via Nodemailer

## Fonctionnalites

- Authentification par role: `user`, `employee`, `admin`
- Espace client:
  - catalogue menus, filtres, details complets
  - commande avec estimation (menu + livraison)
  - historique des commandes
  - depot d'avis
- Espace employe/admin:
  - tableau de bord + camembert des statuts
  - pilotage des commandes (kanban + changement de statut)
  - gestion clients
  - gestion menus (creation, modification, suppression)
  - gestion employes/admin (admin)
  - moderation des avis (employe/admin)
- Emails metier:
  - bienvenue, confirmation commande, changement de statut, contact

## Fichiers utiles (a rendre)

- `server.mjs`: API + serveur statique
- `mailer.mjs`: templates et transport SMTP
- `public/index.html`, `public/client.html`, `public/staff.html`
- `public/auth.js`, `public/client.js`, `public/staff.js`
- `public/styles.css`
- `public/images/*` (fallback visuels)
- `db/schema.sql` (SQLite)
- `db/schema.mysql.sql` (MySQL)
- `scripts/migrate-sqlite-to-mysql.mjs`
- `scripts/prepare-rendu.sh`
- `.env.example`
- `README.md`

## Fichiers locaux (a ne pas rendre)

- `.env` (contient tes secrets)
- `node_modules/` (dependances reinstallables)
- `data/app.db` (donnees locales de dev)
- `rendu-ecf/` (dossier genere automatiquement)

## Installation

```bash
cd vite-gourmand-app
npm install
cp .env.example .env
```

Puis lancer:

```bash
set -a
source .env
set +a
npm start
```

Application: `http://localhost:3000`

## Comptes de demonstration

- Admin: `admin@vitegourmand.fr` / `Admin!12345`
- Employe: `employee@vitegourmand.fr` / `Employe!12345`
- Client: `user@vitegourmand.fr` / `User!123456`

## Preparer un dossier propre pour rendu ECF

```bash
npm run prepare:rendu
```

Le script cree un dossier frere du projet:
- `../vite-gourmand-app-rendu/` (a cote du dossier projet)

Ce dossier contient uniquement les fichiers utiles au rendu.

## Documents ECF

Le dossier `docs/` contient les livrables de documentation:

- charte graphique
- maquettes (wireframes + mockups)
- gestion de projet
- documentation technique (MCD, cas d usage, sequence, deploiement)
- manuel utilisateur
- liens a renseigner (GitHub/deploiement/outil projet)

Index: `docs/README-LIVRABLES.md`
