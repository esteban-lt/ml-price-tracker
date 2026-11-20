import { Link } from 'react-router'
import type { Category } from '@/lib/api/types'
import { CategoryIcon } from './category-icons'

export function CategoryCard({ category }: { category: Category }) {
  return (
    <Link
      to={`/categorias/${category.slug}`}
      className="group flex min-h-[120px] flex-col gap-3 rounded-2xl border border-border bg-card p-4 text-foreground no-underline transition-colors hover:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <span className="flex size-11 items-center justify-center rounded-xl bg-success-soft text-success-soft-foreground">
        <CategoryIcon slug={category.slug} className="size-5" />
      </span>
      <span className="leading-snug font-semibold">{category.name}</span>
    </Link>
  )
}
