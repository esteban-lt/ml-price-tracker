import { Link } from 'react-router'
import { Logo } from '@/components/common/logo'
import { useAuth } from '@/features/auth/auth-context'

export function Footer() {
  const { status } = useAuth()
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-x-8 gap-y-4 px-4 pt-7 pb-8 sm:px-6">
        <div className="flex items-center gap-2">
          <Logo markClassName="size-6" className="[&>span]:text-lg" />
          <span className="ml-2 text-[13px] text-muted-foreground">© {new Date().getFullYear()}</span>
        </div>
        <p className="m-0 max-w-[520px] text-[13px] text-muted-foreground">
          Nudge consulta precios públicos de Mercado Libre y no está afiliado a Mercado Libre. Los precios pueden
          cambiar en cualquier momento.
        </p>
        <nav aria-label="Pie de página" className="flex gap-5 font-semibold [&_a]:text-foreground [&_a]:no-underline">
          <Link to="/categorias">Categorías</Link>
          {status === 'authenticated' ? (
            <>
              <Link to="/seguimientos">Mis seguimientos</Link>
              <Link to="/cuenta">Mi cuenta</Link>
            </>
          ) : (
            <>
              <Link to="/iniciar-sesion">Iniciar sesión</Link>
              <Link to="/registro">Crear cuenta</Link>
            </>
          )}
        </nav>
      </div>
    </footer>
  )
}
