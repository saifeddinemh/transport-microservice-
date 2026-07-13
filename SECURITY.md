# 🔐 Sécurité Backend — Agrofield

Ce document décrit **toutes** les mesures de sécurité mises en place sur le
backend Agrofield (Fastify + TypeScript + Prisma), la pipeline CI/CD qui les
fait respecter automatiquement, et les règles que tout contributeur doit
suivre. Il répond point par point aux exigences de la **Mission 2 — Sécurité
Backend & Intégration CI/CD**.

> Agrofield traite des données sensibles (propriétaires, fermes, employés,
> contrats, présences, congés, paie). La sécurité n'est pas optionnelle : ce
> document est la référence unique à jour.

---

## Sommaire

1. [Vue d'ensemble](#1-vue-densemble)
2. [Pipeline CI/CD](#2-pipeline-cicd)
3. [Contrôles de sécurité automatisés](#3-contrôles-de-sécurité-automatisés)
4. [Sécurité applicative Fastify](#4-sécurité-applicative-fastify)
5. [Stratégie de gestion des secrets](#5-stratégie-de-gestion-des-secrets)
6. [Hooks pre-commit](#6-hooks-pre-commit-husky--lint-staged)
7. [Règles pour les contributeurs](#7-règles-pour-les-contributeurs)

---

## 1. Vue d'ensemble

| Domaine                               | Mécanisme                                                                                                                                                                                                                                                                              | Fichier(s)                                                                                                     |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| En-têtes HTTP                         | `@fastify/helmet` (CSP stricte, `X-Frame-Options`, `Referrer-Policy: no-referrer`, `Cross-Origin-Resource-Policy`…)                                                                                                                                                                    | `src/utils/Security.ts`                                                                                        |
| CORS                                  | Liste blanche stricte d'origines, aucun wildcard `*`, `credentials: false` par défaut                                                                                                                                                                                                  | `src/utils/Security.ts`                                                                                        |
| Rate limiting global                  | 100 req / 15 min par IP (configurable via `RATE_LIMIT_MAX` / `RATE_LIMIT_WINDOW`)                                                                                                                                                                                                      | `src/utils/Security.ts`                                                                                        |
| Rate limiting login/register          | 10 req / 15 min par IP sur `POST /api/owner/login` et `POST /api/owner/register` (anti brute-force)                                                                                                                                                                                    | `src/routes/ownerRoutes.ts`, `src/utils/Security.ts`                                                           |
| Authentification                      | JWT signé (`@fastify/jwt`) — access token courte durée, refresh token dédié                                                                                                                                                                                                            | `src/decorators/authenticate.ts`, `generateAccessToken.ts`, `generateRefreshToken.ts`, `verifyRefreshToken.ts` |
| Autorisation (rôles)                  | `checkRole(...roles)` sur les routes réservées à certains rôles                                                                                                                                                                                                                        | `src/decorators/checkRole.ts`                                                                                  |
| Autorisation (propriété)              | Un décorateur `verify*Ownership` dédié par ressource (ferme, véhicule, chauffeur, expédition, transporteur, contrat, demande de transport, log carburant, log maintenance, preuve de livraison) empêche qu'un propriétaire accède aux données d'une autre ferme (protection anti-IDOR) | `src/decorators/verify*Ownership.ts`                                                                           |
| Validation des entrées                | Schémas **Zod** appliqués sur `body`, `params` **et** `query`, exécutés en `preHandler` avant tout accès controller/service/DB                                                                                                                                                         | `src/utils/validate.ts`, `src/schemas/*`                                                                       |
| Gestion des erreurs                   | Handler centralisé : jamais de stack trace, de message de librairie brut, ni de chemin de fichier renvoyé au client                                                                                                                                                                    | `src/utils/Errorhandler.ts`                                                                                    |
| Mots de passe                         | Hash `bcrypt` + poivre applicatif (`pepper`) combiné avant hashing                                                                                                                                                                                                                     | `src/utils/hash.ts`                                                                                            |
| Variables d'environnement             | Validation stricte au démarrage via `@fastify/env` — le serveur **refuse de démarrer** si une variable critique manque                                                                                                                                                                 | `src/utils/createServer.ts`                                                                                    |
| Dépendances                           | `npm audit --audit-level=high` exécuté en CI à chaque PR                                                                                                                                                                                                                               | `.github/workflows/ci.yml`, `package.json`                                                                     |
| Secrets exposés                       | Scan `gitleaks` sur tout l'historique git à chaque PR + contrôle `.env` non tracké                                                                                                                                                                                                     | `.github/workflows/ci.yml`, `scripts/check-env.mjs`                                                            |
| Qualité de code (pré-requis sécurité) | TypeScript strict, ESLint (0 warning toléré), Prettier, tests unitaires, build                                                                                                                                                                                                         | `.github/workflows/ci.yml`, `eslint.config.js`, `.prettierrc.json`                                             |

---

## 2. Pipeline CI/CD

**Fichier :** [`.github/workflows/ci.yml`](.github/workflows/ci.yml)
**Déclenchement :** automatiquement sur chaque `pull_request` et `push` vers
`main` ou `develop`.

La pipeline est composée de trois jobs :

### Job `quality` — qualité et build

Exécutés dans l'ordre, sur `ubuntu-latest` / Node 20 :

1. **`npm ci`** — installation reproductible des dépendances à partir du
   lockfile (jamais `npm install` en CI).
2. **`npm run prisma:generate`** — génération du Prisma Client, requis avant
   toute compilation TypeScript.
3. **`npm run typecheck`** — `tsc --noEmit`, aucune erreur de typage tolérée.
4. **`npm run lint`** — ESLint avec `--max-warnings=0` : un seul warning fait
   échouer le job.
5. **`npm run format:check`** — `prettier --check .` : le code doit déjà être
   formaté, la CI ne formate jamais à la place du développeur.
6. **`npm run test`** — suite de tests unitaires (Vitest).
7. **`npm run build`** — compile le projet en production pour s'assurer que
   rien de cassé n'est mergeable.

### Job `security` — contrôles de sécurité

1. **`npm run audit`** → `npm audit --audit-level=high` : détecte les
   dépendances avec vulnérabilité `high`/`critical`.
2. **`npm run check:env`** → exécute `scripts/check-env.mjs` (voir §5).
3. **`gitleaks/gitleaks-action@v2`** — scanne l'historique git complet
   (`fetch-depth: 0`) à la recherche de clés API, tokens, mots de passe ou
   fichiers `.env` commis par erreur.

### Job `ci-success` — statut agrégé requis

Un job final `if: always()` échoue si `quality` **ou** `security` a échoué.
C'est ce check unique (`CI success`) qui doit être configuré comme **required
status check** dans la règle de protection de branche GitHub sur `main` /
`develop`, afin qu'**aucune PR ne puisse être mergée si TypeScript, le lint,
le format, les tests, le build ou les contrôles de sécurité échouent** —
critère de validation de la Mission 2.

```
PR ouverte
   │
   ├── quality  ─▶ install → prisma generate → typecheck → lint → format → test → build
   ├── security ─▶ npm audit → check:env → gitleaks
   │
   └── ci-success ─▶ merge autorisé uniquement si les deux jobs sont ✅
```

### Adapter à GitLab CI

Le même pipeline se transpose en `.gitlab-ci.yml` avec des stages
`quality` et `security` équivalents (`stages: [quality, security]`), en
réutilisant exactement les mêmes scripts `npm run …` définis dans
`package.json` — aucune logique n'est dupliquée entre local, GitHub Actions
et GitLab CI.

---

## 3. Contrôles de sécurité automatisés

| Contrôle                        | Commande               | Ce qu'il empêche                                                                                  |
| ------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------- |
| Scan de dépendances             | `npm run audit`        | Merger une dépendance avec une CVE connue de sévérité `high`/`critical`.                          |
| Scan de secrets                 | `gitleaks-action`      | Merger un token, une clé API, un mot de passe ou un fichier `.env` réel dans git.                 |
| Validation des variables `.env` | `npm run check:env`    | Démarrer/merger avec une configuration incomplète ou un `.env` réel tracké par git.               |
| Typecheck                       | `npm run typecheck`    | Erreurs de typage silencieuses en production.                                                     |
| Lint                            | `npm run lint`         | Anti-patterns (`eval`, promesses non gérées, variables inutilisées, `==` au lieu de `===`, etc.). |
| Format                          | `npm run format:check` | Divergences de style qui compliquent la revue de code et masquent les vrais diffs.                |
| Tests unitaires                 | `npm run test`         | Régressions fonctionnelles, y compris sur la logique d'autorisation et de hashing.                |
| Build                           | `npm run build`        | Code non compilable mergé dans `main`.                                                            |

---

## 4. Sécurité applicative Fastify

Plugin central : [`src/utils/Security.ts`](src/utils/Security.ts), enregistré
globalement dans [`src/utils/createServer.ts`](src/utils/createServer.ts).

### 4.1 Rate limiting

- **Global** (`@fastify/rate-limit`) : `RATE_LIMIT_MAX` requêtes (défaut
  `100`) par IP sur `RATE_LIMIT_WINDOW` (défaut `15 minutes`), appliqué à
  **toutes** les routes.
- **Dédié login/register** : `AUTH_RATE_LIMIT_MAX` requêtes (défaut `10`) par
  `AUTH_RATE_LIMIT_WINDOW` (défaut `15 minutes`), appliqué explicitement via
  `config: { rateLimit: authRateLimit }` sur :
  - `POST /api/owner/register`
  - `POST /api/owner/login`

  Objectif : limiter le _brute-force_ et le _credential stuffing_ sur les
  endpoints d'authentification sans pénaliser le reste de l'API.

- Réponse `429` normalisée, sans détail interne :
  `{ statusCode: 429, error: "Too Many Requests", message: "..." }`.

### 4.2 Helmet / en-têtes de sécurité

`@fastify/helmet` est enregistré en mode `global: true` avec :

- **CSP** stricte : `default-src 'self'`, `object-src 'none'`,
  `base-uri 'self'`, `frame-ancestors 'none'` (anti clickjacking / injection
  de contenu tiers).
- `crossOriginResourcePolicy: "same-site"`.
- `referrerPolicy: "no-referrer"`.

### 4.3 CORS strict

- **Liste blanche explicite** d'origines (pas de `origin: "*"`), combinant
  des origines de développement par défaut et celles fournies via la
  variable `CORS_ORIGIN` (CSV).
- `credentials: false` par défaut — à activer uniquement si un besoin métier
  précis l'exige, en connaissance des implications CSRF.
- Méthodes et headers explicitement listés (`allowedHeaders`,
  `methods`), aucune valeur implicite.

### 4.4 Validation Zod (body / params / query)

Le helper [`validate()`](src/utils/validate.ts) construit un `preHandler`
Fastify qui :

1. Valide `body`, `params` et `query` avec un schéma **Zod** dédié
   (`src/schemas/*Schemas.ts`), **avant** toute exécution de la logique
   métier ou tout accès Prisma.
2. Rejette immédiatement en `400 Bad Request` avec le détail structuré des
   erreurs (`error.flatten()`) en cas d'échec — la requête n'atteint jamais
   la couche service/DB.
3. Remplace `request.body` / `params` / `query` par les données **parsées et
   typées** (`result.data`), ce qui élimine les champs inattendus
   (protection contre le _mass assignment_).

Chaque route sensible (création, mise à jour, listing paginé) utilise ce
mécanisme — c'est la première ligne de défense contre les injections et les
payloads malformés.

### 4.5 Authentification et autorisation

- **JWT** (`@fastify/jwt`) : access token de courte durée + refresh token
  dédié, vérifiés par les décorateurs `authenticate` et `verifyRefreshToken`.
- **Rôles** : `checkRole(...roles)` protège les routes réservées à certains
  types d'utilisateurs.
- **Propriété (anti-IDOR)** : chaque ressource métier (ferme, véhicule,
  chauffeur, expédition, transporteur, contrat, demande de transport, log
  carburant, log maintenance, preuve de livraison) a son propre décorateur
  `verify*Ownership`, qui vérifie que l'utilisateur authentifié est bien
  propriétaire de la ressource ciblée avant d'exécuter le controller. Cela
  empêche un propriétaire d'accéder ou de modifier les données d'une autre
  ferme simplement en changeant un `id` dans l'URL.
- **Mots de passe** : `bcrypt` + `PEPPER_SECRET_KEY` (poivre applicatif
  combiné au mot de passe avant hashing) dans `src/utils/hash.ts` — le
  pepper n'est jamais stocké en base, uniquement en variable d'environnement.

### 4.6 Gestion centralisée des erreurs

[`src/utils/Errorhandler.ts`](src/utils/Errorhandler.ts) intercepte toutes
les erreurs Fastify et applique une politique stricte de non-divulgation :

| Type d'erreur                         | Réponse client                                                                                                          |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `ZodError` (validation)               | `400` + détail structuré des champs invalides (`flatten()`)                                                             |
| `ServerErrors` (erreur métier connue) | Code HTTP + message métier contrôlé                                                                                     |
| Erreur Fastify `< 500`                | Code HTTP + message Fastify (déjà sûr, ex. 404 route inconnue)                                                          |
| Toute autre exception (`500`)         | `"Internal Server Error"` **uniquement** — jamais de stack trace, de message de librairie brut, ni de chemin de fichier |

Toutes les erreurs sont journalisées côté serveur (`request.log.error`) avec
contexte (`url`, `method`) pour le débogage interne, **sans jamais** exposer
ces informations au client.

### 4.7 Variables d'environnement validées au démarrage

`@fastify/env` valide un schéma strict dans
[`src/utils/createServer.ts`](src/utils/createServer.ts) : si `DATABASE_URL`,
`JWT_SECRET` ou `PEPPER_SECRET_KEY` sont absents ou invalides, **le serveur
refuse de démarrer** — impossible de déployer une instance mal configurée.

---

## 5. Stratégie de gestion des secrets

### Règles absolues

1. Le fichier `.env` (valeurs réelles) **ne doit jamais** être commité —
   explicitement exclu par [`.gitignore`](.gitignore) (`.env`, `.env.*`,
   avec exception `!.env.example`).
2. Seul [`.env.example`](.env.example) est versionné : il documente **les
   noms** des variables attendues avec des **placeholders explicites**
   (ex. `changeme-generate-with-openssl-rand-base64-32`), jamais de vraies
   valeurs ni de valeurs qui _ressemblent_ à un vrai secret.
3. Les secrets de production (JWT, pepper, DB, Kafka…) sont fournis
   uniquement via les secrets du gestionnaire CI/CD (GitHub Actions
   `secrets.*`) ou de la plateforme d'hébergement — jamais en dur dans le
   code, jamais dans un fichier commité.
4. En cas de fuite suspectée d'un secret : le **régénérer immédiatement**
   (rotation) et invalider l'ancien, puis auditer l'historique git avec
   `gitleaks` (voir §3) pour confirmer l'étendue de la fuite.
5. Ne jamais partager un secret réel par Slack/email/ticket en clair —
   utiliser le coffre-fort de l'équipe (gestionnaire de secrets partagé).

### Variables documentées (`.env.example`)

| Variable                                                                                                                                                           | Rôle                                                          |           Obligatoire au démarrage           |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------- | :------------------------------------------: |
| `NODE_ENV`                                                                                                                                                         | Environnement (`development` / `production` / `test`)         |             Non (défaut fourni)              |
| `DATABASE_URL`                                                                                                                                                     | Chaîne de connexion PostgreSQL (Prisma)                       |                   **Oui**                    |
| `SALT_ROUNDS`                                                                                                                                                      | Coût du hashing bcrypt                                        |             Non (défaut fourni)              |
| `PEPPER_SECRET_KEY`                                                                                                                                                | Poivre applicatif combiné au hash bcrypt des mots de passe    |                   **Oui**                    |
| `JWT_SECRET`                                                                                                                                                       | Signature/vérification des tokens JWT                         |                   **Oui**                    |
| `HOST` / `PORT`                                                                                                                                                    | Configuration serveur HTTP                                    |             Non (défaut fourni)              |
| `CORS_ORIGIN`                                                                                                                                                      | Origines additionnelles autorisées (CSV)                      |                     Non                      |
| `RATE_LIMIT_MAX` / `RATE_LIMIT_WINDOW`                                                                                                                             | Rate limiting global                                          |                     Non                      |
| `AUTH_RATE_LIMIT_MAX` / `AUTH_RATE_LIMIT_WINDOW`                                                                                                                   | Rate limiting dédié login/register                            |                     Non                      |
| `KAFKA_BROKERS`, `KAFKA_CLIENT_ID`, `KAFKA_GROUP_ID`, `KAFKA_SOURCE`, `KAFKA_DLQ_TOPIC`, `KAFKA_MAX_RETRIES`, `KAFKA_INITIAL_DELAY_MS`, `KAFKA_BACKOFF_MULTIPLIER` | Connexion au broker Kafka partagé (événements inter-services) | Oui pour les fonctionnalités événementielles |

### Vérification automatique — `scripts/check-env.mjs`

Exécuté en CI (job `security`) et utilisable en local :

1. Vérifie qu'**aucun fichier `.env` réel** n'est suivi par `git ls-files`
   (seul `.env.example` est autorisé).
2. Vérifie que `.env.example` existe et documente bien toutes les variables
   critiques (`REQUIRED_VARS`, synchronisé avec le schéma `@fastify/env` de
   `createServer.ts`).
3. Si un `.env` local existe (poste développeur), vérifie qu'aucune clé de
   `.env.example` ne lui manque (évite un démarrage en configuration
   incomplète).

Ce script **ne lit ni n'affiche jamais** la valeur d'un secret : seuls les
**noms** des variables sont comparés.

---

## 6. Hooks pre-commit (Husky + lint-staged)

Fichier : [`.husky/pre-commit`](.husky/pre-commit), activé automatiquement
via `npm run prepare` (hook `prepare` de `package.json`) après `npm install`.

Avant chaque commit local :

1. **`lint-staged`** → ESLint `--fix --max-warnings=0` + Prettier, uniquement
   sur les fichiers `.ts` (et `.json`/`.md`/`.yml`) **stagés**, pour rester
   rapide.
2. **`npm run typecheck`** → aucune erreur TypeScript ne doit être introduite.
3. **`npm run test -- --run`** → exécution rapide de la suite de tests.

Objectif : bloquer localement un commit qui casserait la CI, **avant même de
pousser le code** — le développeur reçoit un retour en quelques secondes au
lieu d'attendre le pipeline distant.

```bash
# Configuration lint-staged (package.json)
"lint-staged": {
  "*.ts": ["eslint --fix --max-warnings=0", "prettier --write"],
  "*.{json,md,yml,yaml}": ["prettier --write"]
}
```

---

## 7. Règles pour les contributeurs

- Toute nouvelle route qui accepte un `body`, des `params` ou une `query`
  **doit** valider ces entrées avec `validate({ body, params, query })` et un
  schéma Zod dédié (voir `src/schemas/`). Aucune route n'accède directement à
  `request.body` non validé.
- Toute route qui accède à une ressource appartenant à une ferme **doit**
  utiliser le décorateur `verify*Ownership` correspondant.
- Toute route réservée à un rôle **doit** utiliser `checkRole(...)`.
- Ne jamais renvoyer une erreur brute (`error.message`, stack trace, chemin
  de fichier) au client : laisser `errorHandler` gérer la réponse.
- Toute nouvelle variable d'environnement obligatoire doit être :
  1. ajoutée au schéma `fastifyEnv` dans `src/utils/createServer.ts` ;
  2. ajoutée à `REQUIRED_VARS` dans `scripts/check-env.mjs` si elle est
     critique au démarrage ;
  3. documentée (nom, rôle, obligatoire ou non) dans `.env.example` **et**
     dans le tableau du §5 de ce document.
- Ne jamais commiter de fichier `.env` réel, ni coller un secret dans le
  code, un test, un log ou un message de commit.
- Ne jamais désactiver un `eslint-disable` global ou baisser
  `--max-warnings` pour contourner la CI : corriger le code plutôt que
  masquer l'alerte.
- Toute PR qui ajoute une dépendance doit vérifier qu'elle ne déclenche pas
  d'alerte `npm audit --audit-level=high`.

---
