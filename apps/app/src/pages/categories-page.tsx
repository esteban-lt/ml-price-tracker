import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/common/states'
import { Breadcrumbs } from '@/components/common/breadcrumbs'
import { CategoryCard } from '@/features/catalog/category-card'
import { useCategories } from '@/features/catalog/queries'

/** P2 · Categorías */
export function CategoriesPage() {
  const categories = useCategories()

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-8 sm:px-6 sm:py-10">
      <Breadcrumbs items={[{ label: 'Inicio', to: '/' }, { label: 'Categorías' }]} />
      <h1 className="mt-3 mb-1 font-display text-[clamp(30px,4vw,40px)] font-bold">Categorías</h1>
      <p className="m-0 mb-6 text-muted-foreground">Explora los más vendidos de Mercado Libre en cada categoría.</p>

      {categories.isError ? (
        <ErrorState
          title="No pudimos cargar las categorías."
          onRetry={() => categories.refetch()}
          retrying={categories.isFetching}
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(180px,1fr))] sm:gap-3.5">
          {categories.isPending
            ? Array.from({ length: 12 }, (_, i) => <Skeleton key={i} className="h-[120px] rounded-2xl" />)
            : categories.data.map((category) => <CategoryCard key={category.slug} category={category} />)}
        </div>
      )}
    </div>
  )
}
