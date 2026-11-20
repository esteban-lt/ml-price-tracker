import { useEffect } from 'react'
import { Link, useSearchParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Loader2, SearchX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SearchForm } from '@/components/layout/search-form'
import { EmptyState, ErrorState, ServiceUnavailable } from '@/components/common/states'
import { ProductGrid, ProductGridSkeleton } from '@/features/catalog/product-grid'
import { catalogKeys } from '@/features/catalog/queries'
import { catalogApi } from '@/lib/api/endpoints'
import { isMercadoLibreUnavailable } from '@/lib/errors'

const MAX_PAGE = 3

/** P4 · Resultados de búsqueda (/buscar?q=…&page=…) */
export function SearchPage() {
  const [params, setParams] = useSearchParams()
  const q = (params.get('q') ?? '').trim()
  const rawPage = Number(params.get('page') ?? '1')
  const page = Number.isInteger(rawPage) ? Math.min(Math.max(rawPage, 1), MAX_PAGE) : 1
  const validQuery = q.length >= 2 && q.length <= 100

  const search = useQuery({
    queryKey: catalogKeys.search(q, page),
    queryFn: () => catalogApi.search(q, page),
    enabled: validQuery,
    staleTime: 5 * 60 * 1000,
  })

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [page])

  const goToPage = (next: number) => setParams({ q, page: String(next) })

  if (!validQuery) {
    return (
      <div className="mx-auto max-w-[640px] px-4 py-12 sm:px-6">
        <h1 className="mb-4 font-display text-3xl font-bold">Buscar productos</h1>
        <SearchForm key={q} defaultValue={q} size="hero" autoFocus>
          <Button type="submit" size="xl">
            Buscar
          </Button>
        </SearchForm>
        <p className="mt-3 text-sm text-muted-foreground">
          Escribe una marca, modelo o palabra clave (mínimo 2 caracteres).
        </p>
      </div>
    )
  }

  const data = search.data
  const empty = data && data.products.length === 0

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-8 sm:px-6 sm:py-10">
      <div className="mb-6">
        <h1 className="m-0 font-display text-[clamp(24px,4vw,34px)] leading-tight font-bold">Resultados para “{q}”</h1>
        {data && !empty && (
          <p className="m-0 mt-1 text-muted-foreground">
            Página {data.page} · solo mostramos productos que puedes seguir
          </p>
        )}
      </div>

      {search.isPending ? (
        <div aria-busy="true">
          <div role="status" className="mb-5 flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
            <Loader2 aria-hidden="true" className="size-6 animate-spin text-primary" />
            <div>
              <div className="font-semibold">Buscando los mejores precios en Mercado Libre…</div>
              <div className="text-sm text-muted-foreground">Tarda unos segundos.</div>
            </div>
          </div>
          <ProductGridSkeleton count={8} />
        </div>
      ) : search.isError ? (
        isMercadoLibreUnavailable(search.error) ? (
          <ServiceUnavailable onRetry={() => search.refetch()} retrying={search.isFetching} />
        ) : (
          <ErrorState onRetry={() => search.refetch()} retrying={search.isFetching} />
        )
      ) : empty && data.hasMore ? (
        <EmptyState
          icon={<SearchX aria-hidden="true" />}
          title="No hubo productos disponibles en esta página"
          description="Puede haber más en la siguiente."
          action={<Button onClick={() => goToPage(page + 1)}>Ver más resultados</Button>}
        />
      ) : empty ? (
        <EmptyState
          icon={<SearchX aria-hidden="true" />}
          title={page === 1 ? `No encontramos productos para “${q}”` : 'No hay más resultados'}
          description={page === 1 ? 'Prueba con otra marca o modelo, o explora las categorías.' : undefined}
          action={
            page === 1 ? (
              <Button asChild variant="outline">
                <Link to="/categorias">Explorar categorías</Link>
              </Button>
            ) : (
              <Button variant="outline" onClick={() => goToPage(page - 1)}>
                Página anterior
              </Button>
            )
          }
        />
      ) : (
        <ProductGrid products={search.data.products} />
      )}

      {data && !(empty && page === 1) && (
        <nav aria-label="Paginación" className="mt-8 flex items-center justify-between gap-2">
          <Button variant="outline" disabled={page <= 1} onClick={() => goToPage(page - 1)}>
            <ChevronLeft aria-hidden="true" />
            Anterior
          </Button>
          <span className="num font-semibold" aria-current="page">
            Página {page} de hasta {MAX_PAGE}
          </span>
          <Button variant="outline" disabled={!data.hasMore} onClick={() => goToPage(page + 1)}>
            Siguiente
            <ChevronRight aria-hidden="true" />
          </Button>
        </nav>
      )}
    </div>
  )
}
