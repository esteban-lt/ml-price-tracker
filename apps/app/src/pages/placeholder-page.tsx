import { Construction } from 'lucide-react'

/** Temporary page for screens that are not built yet. */
export function PlaceholderPage({ code, title }: { code: string; title: string }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 px-4 py-24 text-center">
      <Construction aria-hidden="true" className="size-10 text-muted-foreground" />
      <p className="m-0 text-sm font-semibold text-muted-foreground">{code}</p>
      <h1 className="m-0 font-display text-3xl font-bold">{title}</h1>
      <p className="m-0 text-muted-foreground">Esta pantalla está en construcción.</p>
    </div>
  )
}
