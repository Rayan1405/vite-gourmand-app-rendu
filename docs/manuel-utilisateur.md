# Manuel Utilisateur - Vite & Gourmand

## 1) Presentation

Vite & Gourmand est une application de commande de menus traiteur.
Trois profils existent:
- Client
- Employe
- Administrateur

## 2) Connexion et comptes de test

URL: `http://localhost:3000`

Comptes de demonstration:
- Admin: `admin@vitegourmand.fr` / `Admin!12345`
- Employe: `employee@vitegourmand.fr` / `Employe!12345`
- Client: `user@vitegourmand.fr` / `User!123456`

## 3) Parcours client

1. Se connecter ou creer un compte
2. Consulter les menus
3. Filtrer par theme, regime, prix, min personnes
4. Cliquer `Commander ce menu`
5. Renseigner:
   - nombre de personnes
   - adresse et ville de prestation
   - date et heure
   - option materiel prete (si besoin)
6. Verifier estimation prix (menu + livraison)
7. Valider la commande
8. Consulter ses commandes
9. Laisser un avis une fois commande `Terminee`

## 4) Parcours employe/admin

1. Se connecter sur l espace staff
2. Ouvrir l onglet `Commandes`
3. Traiter les commandes en Kanban:
   - En attente
   - Acceptees
   - En preparation
   - En livraison
   - Livrees
   - Retour materiel
   - Terminees
   - Annulees
4. Changer statut via glisser/deposer ou bouton modifier
5. Pour annulation: motif + mode contact obligatoires
6. Onglet `Avis clients`: valider/refuser les avis

Fonctions supplementaires admin:
- Gestion employes/admin
- Gestion menus
- Gestion clients

## 5) Regles metier importantes

- Nombre de personnes minimum impose par menu
- Reduction de 10% a partir de `min_people + 5`
- Stock decremente a la commande
- Stock reincremente si commande annulee
- Retour materiel reserve aux commandes avec materiel prete

## 6) Emails automatiques

- Confirmation de commande
- Changement de statut
- Notification retour materiel (10 jours ouvres / 600 EUR)

## 7) Resolution de problemes

- Si style non charge: faire `Cmd + Shift + R`
- Si mail non envoye: verifier variables SMTP
- Si Mongo indisponible: l application fonctionne, seules stats NoSQL sont coupees

## 8) Export PDF

Exporter ce fichier en PDF sous le nom:
- `04-manuel-utilisateur.pdf`
