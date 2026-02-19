# Charte Graphique - Vite & Gourmand

## Identite visuelle

Objectif: transmettre une image haut de gamme, chaleureuse et lisible pour un service traiteur evenementiel.

## Palette de couleurs

| Token CSS | Couleur | Usage |
|---|---|---|
| `--bg` | `#f2ede7` | Fond principal |
| `--panel` | `#fffdf9` | Fonds de panneaux |
| `--surface` | `#fff7ef` | Cartes et blocs secondaires |
| `--line` | `#eadccf` | Bordures et separateurs |
| `--text` | `#231912` | Texte principal |
| `--muted` | `#6f6257` | Texte secondaire |
| `--primary` | `#b84a2f` | Actions principales |
| `--primary-2` | `#d67a44` | Accent / hover |
| `--success` | `#1d7f5d` | Statuts positifs |
| `--danger` | `#b92d3c` | Erreurs / suppression |

Gradients utilises:

- Header hero: `linear-gradient(128deg, #ffdcb2 0%, #ffc691 48%, #ffb277 100%)`
- Fond global: melange radial + lineaire pour un rendu premium.

## Typographies

- Titres: `Fraunces` (serif) - effet editorial / premium.
- Texte courant: `Manrope` (sans-serif) - lisibilite et modernite.

Tailles usuelles:

- `h1`: entre `2.1rem` et `3.1rem`
- `h2`: entre `1.25rem` et `1.7rem`
- Texte courant: base `1rem`

## Regles d interface

- Rayon: `20px`, `14px`, `10px` selon la profondeur du composant.
- Ombre principale: `0 10px 30px rgba(57, 33, 17, 0.1)`.
- Boutons primaires: fond `--primary`, texte clair, hover sur `--primary-2`.
- Cartes: fond `--surface`, bordure `--line`, espacement genereux.

## Accessibilite

- Contraste fort entre `--text` et fonds clairs.
- Etat d erreur explicite avec `--danger` + message texte.
- Champs de formulaire explicites avec labels visibles.
- Navigation staff lateralement structurée par onglets.

## Cohabitation des espaces

- Espace client: focalise experience, commande et avis.
- Espace employe/admin: focalise operationnel (kanban, tableaux, moderation).
