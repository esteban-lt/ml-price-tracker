import { Link } from 'react-router'
import { Bell, Search, Target, TrendingDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { SearchForm } from '@/components/layout/search-form'
import { useAuth } from '@/features/auth/auth-context'
import { FEATURED_CATEGORIES, useCategories } from '@/features/catalog/queries'
import { CategoryCard } from '@/features/catalog/category-card'
import { cn } from '@/lib/utils'

const EXAMPLES = ['audífonos sony', 'nintendo switch', 'freidora de aire']

const STEPS = [
  { icon: Search, title: '1. Busca', text: 'Encuentra el producto de Mercado Libre que quieres comprar.', accent: false },
  { icon: Target, title: '2. Elige tu precio', text: 'Un monto objetivo, o cuánto quieres que baje en porcentaje.', accent: false },
  {
    icon: Bell,
    title: '3. Te avisamos',
    text: 'Revisamos el precio cuatro veces al día y te avisamos en la app y por correo cuando cruce tu precio.',
    accent: true,
  },
]

/** P1 · Inicio */
export function HomePage() {
  const { status } = useAuth()
  const categories = useCategories()
  const featured = (categories.data ?? []).filter((c) => FEATURED_CATEGORIES.includes(c.slug))

  return (
    <>
      <section className="border-b border-border bg-card">
        <div className="mx-auto grid max-w-[1200px] items-center gap-12 px-4 py-12 sm:px-6 md:py-16 lg:grid-cols-2">
          <div className="flex flex-col gap-5">
            <span className="inline-flex items-center gap-1.5 self-start rounded-full bg-success-soft px-3 py-1.5 text-[13px] font-bold text-success-soft-foreground">
              <TrendingDown aria-hidden="true" className="size-4" />
              Precios de Mercado Libre
            </span>
            <h1 className="m-0 font-display text-[clamp(40px,6vw,66px)] leading-none font-extrabold">
              Compra cuando el precio baje.
            </h1>
            <p className="m-0 max-w-[520px] text-[19px] text-muted-foreground">
              Sigue productos de Mercado Libre y te avisamos cuando lleguen al precio que quieres.
            </p>
            <SearchForm size="hero" placeholder="¿Qué quieres comprar?" className="max-w-[560px]">
              <Button type="submit" size="xl">
                Buscar precios
              </Button>
            </SearchForm>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground">Prueba:</span>
              {EXAMPLES.map((example) => (
                <Link
                  key={example}
                  to={`/buscar?q=${encodeURIComponent(example)}`}
                  className="rounded-full bg-secondary px-3.5 py-2 text-sm font-semibold text-foreground no-underline hover:bg-border"
                >
                  {example}
                </Link>
              ))}
            </div>
          </div>
          <AlertExample />
        </div>
      </section>

      <section className="mx-auto max-w-[1200px] px-4 pt-16 pb-6 sm:px-6">
        <h2 className="m-0 mb-6 font-display text-[32px] font-bold">Cómo funciona</h2>
        <div className="grid gap-5 sm:grid-cols-3">
          {STEPS.map(({ icon: Icon, title, text, accent }) => (
            <div key={title} className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-6">
              <span
                className={cn(
                  'flex size-11 items-center justify-center rounded-xl',
                  accent ? 'bg-primary text-primary-foreground' : 'bg-ink text-ink-foreground',
                )}
              >
                <Icon aria-hidden="true" className="size-5" />
              </span>
              <div className="text-lg font-bold">{title}</div>
              <div className="text-muted-foreground">{text}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1200px] px-4 pt-10 pb-6 sm:px-6">
        <div className="mb-5 flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="m-0 font-display text-[32px] font-bold">Explora por categoría</h2>
          <Link to="/categorias" className="font-semibold no-underline">
            Ver las 28 categorías
          </Link>
        </div>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3.5">
          {categories.isPending
            ? Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-[120px] rounded-2xl" />)
            : featured.map((category) => <CategoryCard key={category.slug} category={category} />)}
        </div>
      </section>

      {status !== 'authenticated' ? (
        <section className="mx-auto max-w-[1200px] px-4 pt-12 pb-16 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-6 rounded-[28px] bg-[#12201C] p-8 text-white sm:p-10">
            <div className="max-w-[560px]">
              <h2 className="m-0 font-display text-[clamp(28px,4vw,36px)] leading-tight font-bold">
                Deja que el precio venga a ti.
              </h2>
              <p className="mt-2 mb-0 text-[17px] text-[#C9D4CF]">
                Crea tu cuenta gratis para guardar tus seguimientos y recibir avisos por correo.
              </p>
            </div>
            <div className="flex flex-wrap gap-2.5">
              <Button asChild variant="mint" size="lg">
                <Link to="/registro">Crear cuenta gratis</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="border-[#4A5752] bg-transparent text-white hover:bg-white/10 hover:text-white"
              >
                <Link to="/iniciar-sesion">Ya tengo cuenta</Link>
              </Button>
            </div>
          </div>
        </section>
      ) : (
        <div className="pb-16" />
      )}
    </>
  )
}

/** Illustrative alert card from the design (static example, not real data). */
function AlertExample() {
  return (
    <div aria-label="Ejemplo de aviso" className="flex flex-col gap-4 rounded-[28px] border border-border bg-background p-6">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold tracking-[.06em] text-muted-foreground uppercase">Así se ve un aviso</span>
        <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-success-soft-foreground">
          <span className="size-2 rounded-full bg-primary" aria-hidden="true" />
          hace 2 horas
        </span>
      </div>
      <div className="flex items-center gap-4">
        <div className="product-frame size-24 shrink-0 rounded-2xl">
          <svg
            width="66"
            height="66"
            viewBox="0 0 64 64"
            aria-hidden="true"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M14 38v-6a18 18 0 0 1 36 0v6" />
            <rect x="10" y="36" width="10" height="16" rx="4" />
            <rect x="44" y="36" width="10" height="16" rx="4" />
          </svg>
        </div>
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="font-medium">Audífonos Sony WH-1000XM5</span>
          <span className="num font-display text-[clamp(24px,3vw,34px)] font-bold text-success-soft-foreground">
            Bajó a $5,449.00
          </span>
          <span className="num text-[13px] text-muted-foreground">
            Tu aviso: menos de $5,499.00 · −16 % desde que lo sigues
          </span>
        </div>
      </div>
      <svg
        viewBox="0 0 520 110"
        role="img"
        aria-label="El precio bajó de $6,499.00 a $5,449.00 en 30 días"
        className="h-auto w-full"
      >
        <line x1="0" y1="92" x2="520" y2="92" stroke="var(--primary)" strokeWidth="1.5" strokeDasharray="5 5" />
        <text x="0" y="86" fontSize="12" fill="var(--success-soft-foreground)" fontWeight="600">
          Tu precio
        </text>
        <path
          d="M0 16H110V32H190V8H270V52H360V72H460V100H520"
          fill="none"
          stroke="var(--foreground)"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        <circle cx="516" cy="100" r="6" fill="var(--primary)" stroke="var(--card)" strokeWidth="2.5" />
      </svg>
    </div>
  )
}
