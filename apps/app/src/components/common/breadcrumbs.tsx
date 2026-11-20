import { Fragment } from 'react'
import { Link } from 'react-router'

export function Breadcrumbs({ items }: { items: { label: string; to?: string }[] }) {
  return (
    <nav aria-label="Migas de pan" className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
      {items.map((item, i) => (
        <Fragment key={item.label}>
          {i > 0 && <span aria-hidden="true">›</span>}
          {item.to ? (
            <Link to={item.to} className="text-muted-foreground no-underline hover:text-foreground hover:underline">
              {item.label}
            </Link>
          ) : (
            <span aria-current="page" className="font-semibold text-foreground">
              {item.label}
            </span>
          )}
        </Fragment>
      ))}
    </nav>
  )
}
