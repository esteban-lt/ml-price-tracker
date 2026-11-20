import { Link } from 'react-router'
import { SearchX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/auth-context'

/** S1 · Página no encontrada */
export function NotFoundPage() {
  const { status } = useAuth()
  const authed = status === 'authenticated'
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-24 text-center">
      <span className="flex size-16 items-center justify-center rounded-2xl bg-secondary text-muted-foreground">
        <SearchX aria-hidden="true" className="size-8" />
      </span>
      <h1 className="m-0 font-display text-3xl font-bold">No encontramos esta página.</h1>
      <p className="m-0 text-muted-foreground">Puede que el enlace esté roto o que la página ya no exista.</p>
      <div className="flex flex-wrap justify-center gap-2.5">
        <Button asChild variant={authed ? 'outline' : 'default'}>
          <Link to="/">Ir al inicio</Link>
        </Button>
        {authed && (
          <Button asChild>
            <Link to="/seguimientos">Mis seguimientos</Link>
          </Button>
        )}
      </div>
    </div>
  )
}
