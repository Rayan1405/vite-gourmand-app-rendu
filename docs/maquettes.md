# Maquettes (Wireframes + Mockups)

Ce document couvre 3 maquettes desktop et 3 maquettes mobile.
Chaque maquette contient:
- une vue wireframe (structure)
- une vue mockup (direction visuelle)

## Desktop 1 - Authentification (Connexion / Creation)

### Wireframe

```text
+--------------------------------------------------------------+
| HERO (logo + baseline)                                       |
+--------------------------------------------------------------+
| [ Onglet: Se connecter ] [ Onglet: Creer un compte ]         |
| +---------------------------+  +---------------------------+  |
| | Formulaire connexion      |  | Formulaire inscription    |  |
| | email / mot de passe      |  | nom / email / mdp / ...   |  |
| +---------------------------+  +---------------------------+  |
+--------------------------------------------------------------+
| Footer (horaires, mentions)                                  |
+--------------------------------------------------------------+
```

### Mockup

- Header degrade chaud premium.
- Bloc auth en cartes arrondies, fond creme.
- Boutons orange brique (`--primary`).
- Texte principal sombre (`--text`).

## Desktop 2 - Catalogue Client + Commande

### Wireframe

```text
+--------------------------------------------------------------+
| HERO + nom utilisateur + deconnexion                         |
+--------------------------------------------------------------+
| Filtres (theme, regime, prix, min personnes)                |
+--------------------------------------------------------------+
| [ Carte menu ] [ Carte menu ] [ Carte menu ]                 |
|  details + galerie + bouton "Commander ce menu"             |
+--------------------------------------------------------------+
| Pop-up commande: menu, nb pers, adresse, ville, date, heure |
| estimation (menu + livraison), checkbox materiel prete       |
+--------------------------------------------------------------+
```

### Mockup

- Cartes menus avec galerie photo et chips d informations.
- Pop-up de commande stylise coherent avec la charte.
- Mise en avant de l estimation prix avant validation.

## Desktop 3 - Back-office Employe/Admin (Kanban)

### Wireframe

```text
+--------------------------------------------------------------------------+
| Header staff + identite + deconnexion                                    |
+--------------------------------------------------------------------------+
| Sidebar | Dashboard | Commandes (kanban) | Menus | Clients | Avis | RH   |
+--------------------------------------------------------------------------+
| Col En attente | Acceptees | Prep | Livr | Retour materiel | Terminees   |
| [Etiquette commande #xx] (drag & drop + bouton modifier)                 |
+--------------------------------------------------------------------------+
```

### Mockup

- Sidebar retractable, navigation claire.
- Etiquettes commandes lisibles (statut, client, menu, montant, materiel).
- Codes couleur statuts (badge + feedback d action).

## Mobile 1 - Authentification

### Wireframe

```text
+------------------------+
| HERO compact           |
+------------------------+
| Tabs login/register    |
| Formulaire actif       |
| CTA principal          |
+------------------------+
```

### Mockup

- Layout monoconne, boutons pleine largeur.
- Espacement vertical renforce pour le tactile.

## Mobile 2 - Catalogue Client

### Wireframe

```text
+------------------------+
| Header + user chip     |
| Filtres en pile        |
| Carte menu #1          |
| Carte menu #2          |
| ...                    |
+------------------------+
```

### Mockup

- Cartes menus en pile avec images et infos essentielles.
- Bouton de commande visible immediatement.

## Mobile 3 - Commandes / Suivi

### Wireframe

```text
+------------------------+
| Mes commandes          |
| #10 - En preparation   |
| #9  - Livree           |
| #8  - Terminee         |
+------------------------+
| Bloc avis              |
+------------------------+
```

### Mockup

- Badges statut bien visibles.
- Bloc avis simplifie (commande + note + commentaire).

## Export PDF maquettes

Option rapide:
1. Exporter ce document en PDF (`02-maquettes.pdf`).
2. Ajouter, si besoin, captures d ecran reelles depuis l application.

Option recommandee:
1. Ouvrir `docs/maquettes.html`.
2. Imprimer en PDF pour un rendu visuel plus propre.
