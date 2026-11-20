import { Link, NavLink, useParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { PackageSearch } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Breadcrumbs } from '@/components/common/breadcrumbs'
import { EmptyState, ErrorState, ServiceUnavailable } from '@/components/common/states'
import { CategoryIcon } from '@/features/catalog/category-icons'
import { ProductGrid, ProductGridSkeleton } from '@/features/catalog/product-grid'
import { catalogKeys, FEATURED_CATEGORIES, useCategories } from '@/features/catalog/queries'
import { ApiError } from '@/lib/api/client'
import { catalogApi } from '@/lib/api/endpoints'
import { isMercadoLibreUnavailable } from '@/lib/errors'
import { cn } from '@/lib/utils'
import { NotFoundPage } from './not-found-page'

/** P3 · Más vendidos de una categoría */
export function BestSellersPage() {
  const { slug = '' } = useParams()
  const categories = useCategories()
  const category = categories.data?.find((c) => c.slug === slug)
  const unknownSlug = categories.isSuccess && !category

  const products = useQuery({
    queryKey: catalogKeys.bestSellers(slug),
    queryFn: () => catalogApi.bestSellers(slug),
    enabled: !unknownSlug,
    staleTime: 5 * 60 * 1000,
  })

  if (unknownSlug || (products.error instanceof ApiError && products.error.status === 404)) {
    return <NotFoundPage />
  }

  const name = category?.name ?? ''
  const sidebar = (categories.data ?? []).filter((c) => FEATURED_CATEGORIES.includes(c.slug) || c.slug === slug)

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-8 sm:px-6 sm:py-10">
      <Breadcrumbs
        items={[{ label: 'Inicio', to: '/' }, { label: 'Categorías', to: '/categorias' }, { label: name || '…' }]}
      />

      <div className="mt-5 grid gap-8 lg:grid-cols-[220px_1fr]">
        <aside className="hidden lg:block" aria-label="Otras categorías">
          <div className="mb-2 text-xs font-bold tracking-[.08em] text-muted-foreground uppercase">Categorías</div>
          <nav className="flex flex-col gap-0.5">
            {sidebar.map((c) => (
              <NavLink
                key={c.slug}
                to={`/categorias/${c.slug}`}
                className={({ isActive }) =>
                  cn(
                    'rounded-lg px-3 py-2 text-[15px] text-foreground no-underline hover:bg-secondary',
                    isActive && 'bg-accent font-semibold text-accent-foreground',
                  )
                }
              >
                {c.name}
              </NavLink>
            ))}
            <Link to="/categorias" className="px-3 py-2 font-semibold no-underline">
              Ver las 28 categorías
            </Link>
          </nav>
        </aside>

        <section className="min-w-0">
          <div className="mb-6 flex items-center gap-3.5">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-success-soft text-success-soft-foreground">
              <CategoryIcon slug={slug} className="size-6" />
            </span>
            <div>
              <h1 className="m-0 font-display text-[clamp(26px,4vw,34px)] leading-tight font-bold">
                {name || 'Más vendidos'}
              </h1>
              <p className="m-0 text-muted-foreground">Los más vendidos en Mercado Libre, en orden de ranking.</p>
            </div>
          </div>

          {products.isPending ? (
            <div aria-busy="true">
              <span className="sr-only" role="status">
                Cargando productos…
              </span>
              <ProductGridSkeleton count={8} />
            </div>
          ) : products.isError ? (
            isMercadoLibreUnavailable(products.error) ? (
              <ServiceUnavailable onRetry={() => products.refetch()} retrying={products.isFetching} />
            ) : (
              <ErrorState onRetry={() => products.refetch()} retrying={products.isFetching} />
            )
          ) : products.data.length === 0 ? (
            <EmptyState
              icon={<PackageSearch aria-hidden="true" />}
              title="Sin productos por ahora"
              description="No encontramos productos disponibles en esta categoría por ahora."
              action={
                <Button asChild variant="outline">
                  <Link to="/categorias">Ver otras categorías</Link>
                </Button>
              }
            />
          ) : (
            <ProductGrid products={products.data} showRank rankContext={name} />
          )}
        </section>
      </div>
    </div>
  )
}
