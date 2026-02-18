# Checklist Rendu ECF - Vite & Gourmand

## Etat global

- Front-end: OK (pages `index`, `client`, `staff` + JS/CSS associes)
- Back-end: OK (API auth, menus, commandes, clients, staff, avis, contact)
- SQL: OK (`db/schema.sql` + `db/schema.mysql.sql`)
- NoSQL: OK (MongoDB pour analytics commandes)
- SMTP: OK (si variables `.env` renseignees)

## Points ECF verifies dans le code

- Nombre minimum de personnes impose sur commande: OK
- Reduction de 10% a partir de `min_people + 5`: OK (`computeMenuPrice`)
- Vue detaillee du prix (menu + livraison) avant validation: OK (client modal + estimation)
- Email de confirmation apres commande: OK (`orderConfirmationMail`)
- Workflow statuts commande: OK
  - `accepted`
  - `preparing`
  - `delivering`
  - `delivered`
  - `awaiting_material_return`
  - `finished`
  - `cancelled`
- Regle materiel prete:
  - `awaiting_material_return` impossible sans materiel: OK
  - `finished` force apres retour materiel si materiel prete: OK
- Email retour materiel (10 jours + 600 EUR): OK (`materialReturnMail`)
- Avis client:
  - depot possible uniquement si commande `finished`: OK
  - avis en attente puis moderation employe/admin: OK
  - affichage accueil uniquement `is_approved = 1`: OK
- Stock menu:
  - decrement a la commande: OK
  - increment en annulation: OK

## Verifications manuelles a faire avant envoi

1. Lancer le projet:
   - `npm install`
   - `npm start`
2. Tester les 3 connexions:
   - `admin@vitegourmand.fr / Admin!12345`
   - `employee@vitegourmand.fr / Employe!12345`
   - `user@vitegourmand.fr / User!123456`
3. Creer une commande client avec case `Materiel prete` cochee:
   - verifier affichage kanban + statut `Retour materiel`
4. Changer les statuts depuis staff:
   - verifier mails recus (confirmation + statut + retour materiel)
5. Passer une commande avec `min_people + 5`:
   - verifier reduction 10% dans l'estimation
6. Poster un avis client:
   - verifier qu'il est visible en staff (onglet avis)
   - valider/refuser puis verifier accueil client

## Fichiers a ne pas rendre

- `.env` (contient secrets)
- `node_modules/`
- `data/app.db` (ou autres bases locales)

## Fichiers a rendre

- `server.mjs`
- `mailer.mjs`
- `public/*`
- `db/schema.sql`
- `db/schema.mysql.sql`
- `scripts/migrate-sqlite-to-mysql.mjs`
- `scripts/prepare-rendu.sh`
- `.env.example`
- `README.md`
- `CHECKLIST-RENDU.md`

## Documents ECF generes

- `docs/charte-graphique.md`
- `docs/maquettes.md`
- `docs/maquettes.html`
- `docs/gestion-projet.md`
- `docs/documentation-technique.md`
- `docs/manuel-utilisateur.md`
- `docs/livrables-liens.md`
- `docs/diagrammes/*.mmd`
- `docs/README-LIVRABLES.md`
