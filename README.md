# 🚚 agrofiel-transport-api

Transport Management API is a Fastify-based backend built with TypeScript and Prisma ORM. This API manages vehicles, drivers, transport requests, shipments, and related logistics operations.

> ⚠️ This guide is focused on **local development without Docker**. Docker integration will be added later.

---

## 📦 Tech Stack

- **Runtime:** Node.js v20.19.0
- **Language:** TypeScript
- **Framework:** Fastify
- **ORM:** Prisma
- **Validation:** Zod
- **Authentication:** JWT + Bcrypt
- **Environment Management:** `@fastify/env`

---

## ⚙️ Prerequisites

Make sure you have the following installed:

- [Node.js v20.19.0+](https://nodejs.org/)
- [npm v11.2.0+](https://www.npmjs.com/)
- [PostgreSQL](https://www.postgresql.org/)
- [Git](https://git-scm.com/)

---

## 🧪 Cloning the Repository

```bash
git clone https://github.com/your-org/agrofiel-transport-api.git
cd agrofiel-transport-api
```

---

## 📁 Project Structure

```bash
├── src/                        # Source code
│   ├── decorators/              # authenticate, checkRole, verify*Ownership
│   ├── routes/                  # Fastify routes (rate limiting + validate())
│   ├── schemas/                 # Zod schemas (body/params/query validation)
│   ├── utils/                   # Security.ts, Errorhandler.ts, validate.ts, hash.ts...
│   └── kafka/                   # Event-driven integration with hr-service/stock-service
├── prisma/                     # Prisma schema and migrations
├── scripts/check-env.mjs        # CI + local secrets/env validation
├── .github/workflows/ci.yml     # GitHub Actions CI/CD pipeline
├── .husky/pre-commit            # Local pre-commit quality gate
├── .env                         # Environment variables (never committed)
├── .env.example                 # Documented env variable names/placeholders
├── SECURITY.md                  # 🔐 Full security & CI/CD documentation
├── tsconfig.json                 # TypeScript config
├── package.json                  # NPM scripts and dependencies
└── README.md                     # This file
```

---

## 🛡️ CI/CD & Security

This project ships with a full CI/CD pipeline and a hardened Fastify
backend. **See [`SECURITY.md`](SECURITY.md) for the complete, detailed
documentation** — this section is just a quick overview.

### What runs automatically on every Pull Request

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) triggers on every PR
and push to `main`/`develop`, and runs two jobs in parallel:

**`quality`** — `npm ci` → `prisma generate` → `typecheck` → `lint` →
`format:check` → `test` → `build`.

**`security`** — `npm audit --audit-level=high` → `check:env`
(`scripts/check-env.mjs`) → `gitleaks` secret scan of the full git history.

A final `ci-success` job aggregates both — configure it as the **required
status check** in your branch protection rule so no PR can merge if
TypeScript, lint, formatting, tests, build, or security checks fail.

### Backend hardening (Fastify)

- **Rate limiting**: global (100 req/15min) + a stricter limit (10
  req/15min) dedicated to `POST /owner/login` and `POST /owner/register` to
  mitigate brute-force/credential stuffing.
- **`@fastify/helmet`**: strict CSP, `no-referrer` policy, no clickjacking.
- **Strict CORS**: explicit origin allow-list, no wildcard, configurable via
  `CORS_ORIGIN`.
- **Zod validation** on `body`, `params`, and `query` on every route, before
  the request ever reaches a controller or Prisma.
- **Centralized error handling**: stack traces, library error messages, and
  file paths are never leaked to the client.
- **Ownership & role checks**: `checkRole` + a dedicated `verify*Ownership`
  decorator per resource (farm, vehicle, driver, shipment...) prevent
  cross-tenant (IDOR) access.

### Secrets strategy

- `.env` is **never** committed (`.gitignore` + CI secret scan).
- Only `.env.example` is versioned, with explicit placeholder values and
  documentation for every required variable.
- `npm run check:env` (local + CI) verifies no real `.env` is tracked by git
  and that all required variables are documented.

### Pre-commit hooks (Husky + lint-staged)

Every local commit runs `lint-staged` (ESLint + Prettier on staged files),
`npm run typecheck`, and a fast `npm run test -- --run` — catching issues
before they ever reach the CI pipeline.

```bash
npm run lint          # ESLint, 0 warnings tolerated
npm run format:check  # Prettier check
npm run typecheck     # TypeScript, no emit
npm run test          # Vitest unit tests
npm run audit         # npm audit --audit-level=high
npm run check:env     # Validate .env.example / secrets hygiene
```

---

## 📄 Environment Configuration

1. Create a `.env` file

✅ For Linux/macOS:

```bash
cp .env.example .env
```

✅ For Windows (PowerShell):

```bash
Copy-Item .env.example .env
```

2. Fill in your .env values:

```env
NODE_ENV=dev
DATABASE_URL="postgresql://username:password@localhost:5432/databaseName?schema=public"
SALT_ROUNDS=10
PEPPER_SECRET_KEY="CHANGE_ME"
JWT_SECRET="CHANGE_ME"
HOST="0.0.0.0"
PORT=3003
```

🔐 Replace `username`, `password`, and `databaseName` with your PostgreSQL credentials and DB name.

> ⚠️ For the synced-owner login flow, `PEPPER_SECRET_KEY` is the setting that matters most. It should match the HR service value used for owner login. The synced `password` and `salt` values are the real HR bcrypt hash data, so if transport or stock uses a different pepper than HR, password verification will fail even when the plaintext password is correct. This is the first thing to check if login after sync does not work.

---

## 📥 Installing Dependencies

```bash
npm install
```

---

## 🧬 Prisma Setup

1. Generate Prisma Client

```bash
npx prisma generate
```

2. Initialize the Database

```bash
npx prisma migrate dev --name init
```

This will apply the initial schema and create the local development database.

---

## 🚀 Running the API Server

Start the development server:

```bash
npm run dev
```

Server will start on http://localhost:3003 (or your custom PORT in .env).

---

## 📡 Kafka Integration

This service now uses Kafka for event-driven communication between the transport API and other services.

### What was added

- A Kafka consumer was added to listen for external events from HR and stock services.
- A Kafka producer was added to publish transport-domain events after business actions complete.
  git status- Dedicated event handlers were added for incoming events such as owner creation/update, employee creation, farm creation, stock request approval, and login-related flows that follow the same pattern as the HR service.
- Retry, dead-letter queue (DLQ), schema validation, and structured logging were implemented to make event processing more resilient.

### Consumed events

The service subscribes to these incoming topics:

- owner created / updated events
- employee created events
- farm created events
- stock request approved events
- login-related events, using the same event-driven pattern as the HR service

### Published transport events

The service publishes these transport events:

- shipment created
- shipment status updated
- delivery proof recorded
- transport request created
- transport request approved
- vehicle status changed
- maintenance log recorded
- driver created

### Main Kafka files

- [src/kafka/client.ts](src/kafka/client.ts) — creates the Kafka producer/consumer clients
- [src/kafka/config.ts](src/kafka/config.ts) — Kafka broker, client, group, and retry settings
- [src/kafka/topics.ts](src/kafka/topics.ts) — topic names for consumed and produced events
- [src/kafka/consumers/externalEventsConsumer.ts](src/kafka/consumers/externalEventsConsumer.ts) — subscribes to incoming events and routes them to handlers
- [src/kafka/consumers/handlers](src/kafka/consumers/handlers) — business logic handlers for incoming events
  - ownerCreatedHandler
  - ownerUpdatedHandler
  - employeeCreatedHandler
  - farmCreatedHandler
  - stockRequestApprovedHandler
- [src/kafka/producers/transportEventProducer.ts](src/kafka/producers/transportEventProducer.ts) — publishes transport-related events
- [src/kafka/retry.ts](src/kafka/retry.ts) — retry logic with exponential backoff
- [src/kafka/dlq.ts](src/kafka/dlq.ts) — dead-letter queue publishing for failed events
- [src/kafka/logger.ts](src/kafka/logger.ts) — Kafka logging to console and [logs/kafka.log](logs/kafka.log)
- [src/kafka/schemas](src/kafka/schemas) — event envelope and payload validation schemas

### Event flow behavior

- Incoming messages are parsed and validated with Zod schemas.
- Valid events are passed to their business handlers.
- Failed handlers are retried automatically.
- If processing still fails, the message is sent to the DLQ topic for later inspection.

For the full list of Kafka topics, see [KAFKA_TOPICS.md](KAFKA_TOPICS.md).

---

## �🛠️ Useful NPM Scripts

| Script              | Description                                |
| ------------------- | ------------------------------------------ |
| `npm run dev`       | Starts development server (live reload)    |
| `npm run build`     | Compiles TypeScript to JS                  |
| `npm start`         | Runs production server (after build)       |
| `npx prisma studio` | Opens Prisma Studio to browse the database |

---

## 🧪 Testing the API (Optional Swagger)

If enabled, Swagger docs will be available at:

```bash
http://localhost:3003/docs
```

---

## 🐘 PostgreSQL Tips

To create a new local database using psql:

```bash
createdb databaseName
```

Or using PostgreSQL CLI with user/password:

```bash
psql -U yourUsername
CREATE DATABASE "databaseName";
```

---

## 🧹 Troubleshooting

- **Error: `P1001 Can't reach database server`**

  - Ensure PostgreSQL is running.
  - Check `DATABASE_URL` in your `.env`.
  - Verify your PostgreSQL user has access to the specified DB.

- **Error: `Module not found: Cannot find module '...'`**
  - Run `npm install`.
  - Ensure `tsconfig.json` paths are correct.

---

## 🐳 Docker (Coming Soon)

This guide currently focuses on local development without Docker. Docker-based setup will be introduced in a future update.

---

## 👨‍💻 Contributing

Interns or collaborators should ensure their code is clean and follows established conventions. Please open a PR for any changes.

### 🧩 ClickUp Integration

We use ClickUp to track all features, bugs, and improvements. Each code change must be tied to a ClickUp task.

#### 🔀 Branch Naming Convention

Use the following branch format:
`<type>/<ClickUp-ID>-short-description`

Examples:
`feature/CU-abc123-add-login fix/CU-def456-fix-navbar`

#### 🚀 Creating a Pull Request

- Ensure your branch name includes the ClickUp ID.
- Use our PR template (it auto-fills when you create a PR).
- Link the ClickUp task in the PR under `## 🔗 ClickUp Task`.
- Tag a reviewer (usually your assigned mentor or tech lead).

#### ✅ Code Review Checklist

- Code compiles and passes lint/test
- Relevant ClickUp task is linked
- PR title and description are clear
- Screenshots added (if UI-related)

---

## 📬 Questions?

Reach out to your lead developer or project maintainer for support.

---

## 🔗 Related Documentation

- [`SECURITY.md`](SECURITY.md) — full security & CI/CD documentation (rate
  limiting, CORS, secrets strategy, pre-commit hooks, validation checklist).
- [`KAFKA_TOPICS.md`](KAFKA_TOPICS.md) — full list of Kafka topics consumed
  and produced by this service.
