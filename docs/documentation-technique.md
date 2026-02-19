# Documentation Technique - Vite & Gourmand

## 1) Réflexion technologique initiale

Objectif : livrer une application web complète, sécurisée et démontrable rapidement dans le cadre de l’ECF, avec une architecture lisible et des choix techniques justifiables.

Choix retenus :
- Front-end : HTML/CSS/JavaScript natif (maîtrise directe, dépendances limitées)
- Back-end : Node.js HTTP natif
- SQL : MySQL (production locale MAMP) + fallback SQLite
- NoSQL : MongoDB (statistiques/analytics)
- Mail : Nodemailer SMTP

Justification détaillée :
- Front-end HTML/CSS/JS natif : exécution directe dans le navigateur sans phase de build complexe, faible surface de panne, temps de chargement réduit et maintenance simplifiée sur un projet à périmètre fonctionnel clair.

- Back-end Node.js (API HTTP) : même langage front/back, logique asynchrone adaptée aux E/S réseau (API, base, mail), démarrage rapide et déploiement simple sur un hébergeur Node.

- MySQL pour le transactionnel : contraintes relationnelles fortes (clés, intégrité), requêtes structurées pour commandes/utilisateurs/menus et compatibilité avec phpMyAdmin/MAMP pour l’exploitation et les contrôles manuels.
- SQLite en fallback : continuité de service en environnement non préparé (pas de serveur MySQL local), utile pour les tests rapides et la reproductibilité du projet.

- MongoDB pour l’analytique : stockage flexible des événements de commande et agrégations efficaces pour les tableaux de bord, sans complexifier le schéma SQL transactionnel.

- SMTP via Nodemailer : composant standard, compatible avec plusieurs fournisseurs, qui découple la logique métier (notification) de la logique de transport (fournisseur mail configurable via variables d’environnement).

- Gestion des rôles (client/employé/admin) : séparation stricte des permissions pour limiter l’exposition des opérations sensibles (gestion des comptes, statuts de commandes, modération des avis) et appliquer le principe du moindre privilège.

## 2) Configuration de l’environnement de travail

Prérequis :
- Node.js 20+
- npm
- MySQL (MAMP) ou SQLite fallback
- MongoDB local/Atlas (optionnel mais recommandé)
- SMTP (Gmail + mot de passe application)

Installation :

```bash
npm install
cp .env.example .env
set -a
source .env
set +a
npm start
```

URL locale :
- `http://localhost:3000`

## 3) Architecture applicative

- `server.mjs` : routes API + serveur statique + logique métier
- `mailer.mjs` : envoi des emails + templates
- `public/` : interfaces `index.html`, `client.html`, `staff.html` + JS/CSS
- `db/` : schémas SQL (SQLite + MySQL)
- `scripts/` : migration SQL et préparation du rendu

## 4) Dispositions sécurité

Mesures mises en place :
- Hash des mots de passe côté serveur (`scrypt`) + comparaison sécurisée (`timingSafeEqual`)
- Règle de mot de passe fort (min 10, maj/min/chiffre/spécial)
- Contrôle d’accès par rôle sur chaque route sensible
- Vérification `is_active` des comptes internes
- Requêtes SQL paramétrées (évite les injections SQL)
- Limite de taille des payload JSON (anti-abus basique)
- Secrets hors code source (`.env`, fichier exclu)
- `--exclude .env` dans la préparation du rendu

## 5) Documentation de déploiement

### Déploiement local

1. Installer les prérequis
2. Configurer `.env`
3. Lancer `npm start`
4. Tester les parcours client + staff

### Déploiement

```bash
npm run prepare:rendu
```

### Déploiement cible (recommandation)

- Front + API sur un hébergeur Node
- Base MySQL managée
- MongoDB Atlas
- SMTP actif (sur Render Free, SMTP est bloqué, donc mails testés en local uniquement.)
- Variables d’environnement configurées côté hébergeur
