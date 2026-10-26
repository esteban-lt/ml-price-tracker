# Mercado Libre Price Tracker

Mercado Libre Price Tracker (codename *Nudge*) is a web app for following product prices on Mercado Libre. Users can find products by browsing best sellers by category or by searching the catalog, and the goal is to track how their prices change over time to help decide when to buy.

## Why

Prices on Mercado Libre change often, and the same product is usually sold by several sellers at different prices. For each product, the project shows the lowest price among all sellers, the original price when there is a discount, and the number of sellers that offer it.

## Features

- **Catalog search** — search products by brand, model or keyword.
- **Best sellers by category** — 28 categories available.
- **Lowest price across sellers** — price, discount and number of sellers for each product.
- **Trackable products only** — results include only catalog products with active sellers, which are the ones that can be followed.
- **Price tracking** — follow a product with a target price or a percentage drop; prices are checked at 00:00, 06:00, 12:00 and 18:00 (Mexico City time, configurable with `PRICE_REFRESH_CRON` and `PRICE_REFRESH_TIMEZONE`) and stored as history.
- **Price drop alerts** — an in-app inbox, plus an email when the price crosses your threshold. Alert emails carry a one-click unsubscribe (`List-Unsubscribe`, RFC 8058) and an unsubscribe link to `FRONTEND_URL/unsubscribe?token=…`.
- **User accounts** — registration and login with short-lived JWTs and refresh-token sessions (HttpOnly cookie, rotation, logout from one or all devices). Verifying the email with a 6-digit code is required before the first session. Password recovery by email link, password change and account deletion.

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

The API integrates with the official [Mercado Libre API](https://developers.mercadolibre.com.mx/). The Mercado Libre account is linked once through OAuth, and the access token is refreshed automatically after that. Every request has a timeout (`ML_REQUEST_TIMEOUT_MS`, 10 s by default); reads are retried up to twice on network errors, `5xx` and `429` (exponential backoff with jitter, honoring `Retry-After`); after 5 consecutive failures the API stops calling Mercado Libre for 30 seconds and answers `503`. If the authorization is lost for good, admins in `ADMIN_EMAILS` get an email (at most once a day).

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

5. **Link your Mercado Libre account (one time only).** Your email must be listed in `ADMIN_EMAILS`. Log in to get a JWT, call `GET /mercado-libre/auth/url`, open the returned URL, then send the `code` from the callback to `POST /mercado-libre/auth/exchange`.

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
| `JWT_SECRET` | Secret of at least 32 characters |
| `VERIFICATION_CODE_SECRET` | At least 32 characters |
| `ML_CLIENT_ID` · `ML_CLIENT_SECRET` | Mercado Libre app credentials |
| `CORS_ORIGIN` | Frontend origin(s), comma separated, no `*` |
| `FRONTEND_URL` | Used in email links |
| `API_URL` | Public URL of the API, used by the one-click unsubscribe header |
| `RESEND_API_KEY` · `MAIL_FROM` | `MAIL_FROM` must use a domain verified in Resend |

`PORT` is provided by the host (Render sets it). `ADMIN_EMAILS` is optional. Sessions default to a 15-minute access token (`JWT_EXPIRES_IN`, signed with the `JWT_ISSUER` and `JWT_AUDIENCE` claims) and a 30-day refresh token (`REFRESH_TOKEN_EXPIRES_IN_DAYS`); set `REFRESH_COOKIE_SAME_SITE=none` only if the frontend is served from a different site than the API. `GET /health` is a lightweight endpoint (no database access) for uptime checks.

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
| `POST` | `/auth/register` | Create an account and send the verification code; returns a `verificationToken`, not a session. Registering again with an unverified email replaces its name and password |
| `POST` | `/auth/login` | Log in: access token in the body, refresh token in a cookie. An unverified account gets `403` with `code: "EMAIL_NOT_VERIFIED"` and a new `verificationToken` |
| `POST` | `/auth/refresh` | Rotate the refresh token and get a new access token |
| `POST` | `/auth/logout` · `/auth/logout-all` | End the current session / every session of the user |
| `GET` · `DELETE` | `/auth/me` | Profile of the logged-in user / delete the account (body: `password`) |
| `POST` | `/auth/change-password` | Change the password (`currentPassword`, `newPassword`); closes every other session and returns a new one |
| `POST` | `/auth/forgot-password` · `/auth/reset-password` | Email a reset link to `FRONTEND_URL/reset-password?token=…` (always `204`) / set a new password with that token (closes every session) |
| `POST` | `/auth/verify-email` · `/auth/resend-verification` | Verify the email with the 6-digit code and open the first session / request a new code. Both take the `verificationToken` as `Authorization: Bearer` |
| `GET` | `/mercado-libre/categories` | List available categories |
| `GET` | `/mercado-libre/products/:category` | Best sellers in a category (e.g. `computers`) |
| `GET` | `/mercado-libre/products?q=&page=` | Search the catalog |
| `GET` · `POST` | `/tracked-products` | List / track products |
| `GET` | `/alerts` · `/alerts/unread-count` | Alerts inbox |
| `PATCH` | `/users/me/email-notifications` | Turn alert emails on or off |
| `POST` | `/users/unsubscribe?token=` | Turn alert emails off from the link in an alert email (no session needed) |
| `GET` | `/mercado-libre/auth/status` | Mercado Libre connection status (admin) |

Every endpoint except registration, login, refresh, logout, password recovery, unsubscribe, the public catalog endpoints (`/mercado-libre/categories` and `/mercado-libre/products`) and `/health` requires a JWT in the `Authorization: Bearer <token>` header. The refresh token is an HttpOnly cookie scoped to `/auth`, so browser clients must send requests with credentials (`credentials: 'include'`). The access token only carries the user id and the session id; it stops working as soon as its session is revoked (logout, logout-all or refresh-token reuse), without waiting for it to expire. Only verified accounts can get an access token. The `verificationToken` (30 minutes) only works on `/auth/verify-email` and `/auth/resend-verification`. The `/mercado-libre/auth/*` endpoints also require an email listed in `ADMIN_EMAILS`.
