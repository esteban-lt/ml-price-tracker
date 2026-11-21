# Nudge · Frontend

React 19 + Vite + TypeScript, con [shadcn/ui](https://ui.shadcn.com) (Radix + Tailwind CSS v4), React Router y TanStack Query.

## Desarrollo

```bash
bun install
bun run dev
```

Abre http://localhost:5173. Por defecto usa la API desplegada (`https://nudge-api.estebanlt.com`) a través del proxy de Vite: la app llama a `/api/...` y Vite lo reenvía. Así la cookie `refresh_token` (`SameSite=Lax`, `Path=/auth`) funciona en local y la sesión se conserva al recargar.

Para usar la API local, crea `.env.local` con:

```
API_PROXY_TARGET=http://localhost:3000
```

## Producción

Define `VITE_API_URL` con la URL pública de la API (ver `.env.production.example`). El frontend debe vivir en el mismo sitio que la API (por ejemplo `nudge.estebanlt.com`) o la API debe usar `REFRESH_COOKIE_SAME_SITE=none`.

## Estructura

```
src/
├── components/ui/      # componentes de shadcn/ui (ajustados a los colores y tamaños del diseño)
├── components/layout/  # encabezado, pie, buscador, carga inicial
├── features/           # lógica por dominio: auth, catalog, alerts…
├── lib/api/            # cliente HTTP con renovación de sesión, endpoints y tipos de la API
├── lib/format.ts       # precios, porcentajes, fechas relativas
├── lib/errors.ts       # mensajes de error de la guía
├── pages/              # una página por pantalla de la guía (P1, C1, A1…)
└── router.tsx          # rutas
```

Los colores del diseño están como variables en `src/index.css` (modo claro y oscuro).

Para agregar componentes de shadcn: `bunx --bun shadcn@latest add <componente>`. Revisa que los imports queden como `@/lib/utils` (el CLI a veces escribe `"cn"`).
