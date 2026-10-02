# Mercado Libre Price Tracker

Mercado Libre Price Tracker (codename *Nudge*) is a web app for following product prices on Mercado Libre. Users can find products by browsing best sellers by category or by searching the catalog, and the goal is to track how their prices change over time to help decide when to buy.

## Why

Prices on Mercado Libre change often, and the same product is usually sold by several sellers at different prices. For each product, the project shows the lowest price among all sellers, the original price when there is a discount, and the number of sellers that offer it.

## Features

- **Catalog search** — search products by brand, model or keyword.
- **Best sellers by category** — 28 categories available.
- **Lowest price across sellers** — price, discount and number of sellers for each product.
- **Trackable products only** — results include only catalog products with active sellers, which are the ones that can be followed.
- **User accounts** — registration and login with JWT authentication.

### Coming soon

- Product tracking with price history.
- Price drop alerts based on a target price.
- Amazon support.

## Tech stack

| Layer | Tech |
|---|---|
| API | [NestJS](https://nestjs.com/) · TypeScript · TypeORM |
| Database | PostgreSQL |
| Auth | JWT (Passport) for users · OAuth 2.0 (Authorization Code) for Mercado Libre |
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

**Requirements:** Node.js, Bun, Docker, and a [Mercado Libre developer app](https://developers.mercadolibre.com.mx/devcenter) with the *Publicación y sincronización* (read) permission.

1. **Configure the API.** Copy the template and fill in your database URL, JWT secret and Mercado Libre credentials:

   ```bash
   cp apps/api/.env.template apps/api/.env
   ```

2. **Start PostgreSQL:**

   ```bash
   docker compose -f apps/api/docker-compose.yml up -d
   ```

3. **Run the API** (http://localhost:3000):

   ```bash
   cd apps/api && bun install && bun run start:dev
   ```

4. **Link your Mercado Libre account (one time only).** Log in to get a JWT, call `GET /mercado-libre/auth/url`, open the returned URL, then send the `code` from the callback to `POST /mercado-libre/auth/exchange`.

5. **Run the frontend:**

   ```bash
   cd apps/app && bun install && bun run dev
   ```

## API overview

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/auth/register` · `/auth/login` | Create an account / get a JWT |
| `GET` | `/mercado-libre/categories` | List available categories |
| `GET` | `/mercado-libre/products/:category` | Best sellers in a category (e.g. `computers`) |
| `GET` | `/mercado-libre/products?q=&page=` | Search the catalog |
| `GET` | `/mercado-libre/auth/status` | Mercado Libre connection status |

The `/mercado-libre/auth/*` endpoints require a JWT in the `Authorization: Bearer <token>` header.
