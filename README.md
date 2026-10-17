# Mercado Libre Price Tracker

Mercado Libre Price Tracker (codename *Nudge*) is a web app for following product prices on Mercado Libre. Users can find products by browsing best sellers by category or by searching the catalog, and the goal is to track how their prices change over time to help decide when to buy.

## Why

Prices on Mercado Libre change often, and the same product is usually sold by several sellers at different prices. For each product, the project shows the lowest price among all sellers, the original price when there is a discount, and the number of sellers that offer it.

## Features

- **Catalog search** — search products by brand, model or keyword.
- **Best sellers by category** — 28 categories available.
- **Lowest price across sellers** — price, discount and number of sellers for each product.
- **Trackable products only** — results include only catalog products with active sellers, which are the ones that can be followed.
- **Price tracking** — follow a product with a target price or a percentage drop; prices are checked periodically and stored as history.
- **Price drop alerts** — an in-app inbox, plus an email when the price crosses your threshold (verified email required, can be turned off).
- **User accounts** — registration and login with JWT, and email verification with a 6-digit code.

### Coming soon

- Amazon support.

## Tech stack

| Layer | Tech |
|---|---|
| API | [NestJS](https://nestjs.com/) · TypeScript · TypeORM |
| Database | PostgreSQL |
| Auth | JWT (Passport) for users · OAuth 2.0 (Authorization Code) for Mercado Libre |
| Email | [Resend](https://resend.com/) |
| Frontend | React · Vite |
| Tooling | Bun · Vitest · Oxlint · Docker Compose |

## Project structure

```
apps/
├── api/   # NestJS REST API
└── app/   # React frontend
```

The API integrates with the official [Mercado Libre API](https://developers.mercadolibre.com.mx/). The Mercado Libre account is linked once through OAuth, and the access token is refreshed automatically after that.

## Getting started

**Requirements:** Node.js 22+, Bun, PostgreSQL 13+ (Docker or a hosted database such as Neon), and a [Mercado Libre developer app](https://developers.mercadolibre.com.mx/devcenter) with the *Publicación y sincronización* (read) permission.

1. **Configure the API.** Copy the template and fill in your database URL, JWT secret and Mercado Libre credentials. Every variable is described in the template:

   ```bash
   cp apps/api/.env.template apps/api/.env
   ```

2. **Start PostgreSQL** (skip it if you use a hosted database):

   ```bash
   docker compose -f apps/api/docker-compose.yml up -d
   ```

3. **Create the schema:**

   ```bash
   cd apps/api && bun install && bun run migration:run
   ```

4. **Run the API** (http://localhost:3000):

   ```bash
   bun run start:dev
   ```

5. **Link your Mercado Libre account (one time only).** Your email must be listed in `ADMIN_EMAILS` and verified. Log in to get a JWT, call `GET /mercado-libre/auth/url`, open the returned URL, then send the `code` from the callback to `POST /mercado-libre/auth/exchange`.

6. **Run the frontend:**

   ```bash
   cd apps/app && bun install && bun run dev
   ```

Without `RESEND_API_KEY` (development only), emails are not sent: the API logs the recipient, subject and plain text instead.

## Database migrations

The schema is managed only by migrations (`apps/api/migrations`): `synchronize` is off in every environment, so every entity change needs a new migration. The scripts build the project first and use the compiled data source (`dist/config/data-source.js`), which reads `DATABASE_URL` from `apps/api/.env` or from the environment.

| Command (from `apps/api`) | What it does |
|---|---|
| `bun run migration:generate migrations/AddSomething` | Compares the entities with the database and writes a new migration |
| `bun run migration:run` | Applies the pending migrations |
| `bun run migration:revert` | Reverts the last applied migration |
| `bun run migration:show` | Lists migrations (`[X]` applied, `[ ]` pending) |

To migrate production, point `DATABASE_URL` at the production database and run `bun run migration:run` before deploying the new version.

## Tests

Tests live in `apps/api/test`, mirroring the structure of `src`. Mercado Libre and Resend are always replaced by test doubles, so no credentials or real emails are needed.

| Command (from `apps/api`) | What it runs |
|---|---|
| `bun run test` | Unit tests (`*.spec.ts`), no database |
| `bun run test:e2e` | Integration tests (`*.e2e-spec.ts`) against `TEST_DATABASE_URL` |

The integration suite applies the project migrations to `TEST_DATABASE_URL` and wipes its data before every test, so it must point to a database used only for tests (it refuses to run if it matches `DATABASE_URL`).

## Production

Set `NODE_ENV=production`. The API refuses to start if any of these is missing or invalid:

| Variable | Notes |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` · `JWT_EXPIRES_IN` | Secret of at least 32 characters · token lifetime (e.g. `2h`) |
| `VERIFICATION_CODE_SECRET` | At least 32 characters |
| `ML_CLIENT_ID` · `ML_CLIENT_SECRET` | Mercado Libre app credentials |
| `CORS_ORIGIN` | Frontend origin(s), comma separated, no `*` |
| `FRONTEND_URL` | Used in email links |
| `RESEND_API_KEY` · `MAIL_FROM` | `MAIL_FROM` must use a domain verified in Resend |

`PORT` is provided by the host (Render sets it). `ADMIN_EMAILS` is optional. `GET /health` is a lightweight endpoint (no database access) for uptime checks.

## Docker

The image (`apps/api/Dockerfile`) contains only the compiled API and production dependencies; no `.env` or secrets. Pass the variables listed in [Production](#production) at runtime.

```bash
docker build -t nudge-api apps/api
```

```bash
docker run -d -p 3000:3000 --env-file prod.env nudge-api
```

Migrations never run on startup. Run them with the same image before starting a new version:

```bash
docker run --rm -e DATABASE_URL="postgresql://..." nudge-api node node_modules/typeorm/cli.js migration:run -d dist/config/data-source.js
```

## API overview

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/auth/register` · `/auth/login` | Create an account / get a JWT |
| `POST` | `/auth/verify-email` · `/auth/resend-verification` | Verify the email with the 6-digit code / request a new one |
| `GET` | `/mercado-libre/categories` | List available categories |
| `GET` | `/mercado-libre/products/:category` | Best sellers in a category (e.g. `computers`) |
| `GET` | `/mercado-libre/products?q=&page=` | Search the catalog |
| `GET` · `POST` | `/tracked-products` | List / track products |
| `GET` | `/alerts` · `/alerts/unread-count` | Alerts inbox |
| `PATCH` | `/users/me/email-notifications` | Turn alert emails on or off |
| `GET` | `/mercado-libre/auth/status` | Mercado Libre connection status (admin) |

Every endpoint except registration, login, the public catalog endpoints (`/mercado-libre/categories` and `/mercado-libre/products`) and `/health` requires a JWT in the `Authorization: Bearer <token>` header. The `/mercado-libre/auth/*` endpoints also require a verified email listed in `ADMIN_EMAILS`.
