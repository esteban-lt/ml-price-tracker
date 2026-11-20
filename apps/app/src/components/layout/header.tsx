import { useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { Bell, ChevronDown, LayoutGrid, LogOut, Search, Target, User as UserIcon, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Logo } from '@/components/common/logo'
import { SearchForm } from './search-form'
import { useAuth } from '@/features/auth/auth-context'
import { useUnreadAlertsCount } from '@/features/alerts/queries'
import { cn, initials } from '@/lib/utils'

function BellLink() {
  const { data: count = 0 } = useUnreadAlertsCount()
  const label = count > 0 ? `Alertas, ${count} sin leer` : 'Alertas'
  return (
    <Button asChild variant="ghost" size="icon" className="relative">
      <Link to="/alertas" aria-label={label}>
        <Bell aria-hidden="true" />
        {count > 0 && (
          <span className="num absolute top-1 right-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-card bg-primary px-1 text-[11px] leading-none font-bold text-primary-foreground">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </Link>
    </Button>
  )
}

function UserMenu() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { data: unread = 0 } = useUnreadAlertsCount()
  if (!user) return null
  const firstName = user.name.split(/\s+/)[0]

  async function handleLogout() {
    try {
      await logout()
    } catch {
      // Local state is cleared anyway.
    }
    navigate('/')
    toast.success('Cerraste sesión')
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2 border-border pr-2.5 pl-1.5" aria-label={`Menú de ${user.name}`}>
          <span className="flex size-[30px] items-center justify-center rounded-full bg-success-soft text-[13px] font-bold text-success-soft-foreground">
            {initials(user.name)}
          </span>
          <span className="hidden max-w-28 truncate sm:inline">{firstName}</span>
          <ChevronDown aria-hidden="true" className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 rounded-2xl p-2">
        <DropdownMenuLabel className="flex items-center gap-2.5 px-2.5 py-2.5 font-normal">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-success-soft font-bold text-success-soft-foreground">
            {initials(user.name)}
          </span>
          <span className="min-w-0">
            <span className="block truncate font-semibold text-foreground">{user.name}</span>
            <span className="block truncate text-xs text-muted-foreground">{user.email}</span>
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="h-10 gap-2.5 rounded-lg px-2.5 text-[15px]">
          <Link to="/seguimientos">
            <Target aria-hidden="true" />
            Mis seguimientos
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="h-10 gap-2.5 rounded-lg px-2.5 text-[15px]">
          <Link to="/alertas" className="justify-between">
            <span className="flex items-center gap-2.5">
              <Bell aria-hidden="true" />
              Alertas
            </span>
            {unread > 0 && (
              <span className="num rounded-full bg-primary px-2 text-xs text-primary-foreground">{unread}</span>
            )}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="h-10 gap-2.5 rounded-lg px-2.5 text-[15px]">
          <Link to="/categorias">
            <LayoutGrid aria-hidden="true" />
            Categorías
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="h-10 gap-2.5 rounded-lg px-2.5 text-[15px]">
          <Link to="/cuenta">
            <UserIcon aria-hidden="true" />
            Mi cuenta
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={handleLogout} className="h-10 gap-2.5 rounded-lg px-2.5 text-[15px]">
          <LogOut aria-hidden="true" />
          Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function Header() {
  const { status } = useAuth()
  const location = useLocation()
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const currentQuery = new URLSearchParams(location.search).get('q') ?? ''
  const authed = status === 'authenticated'
  const loginTarget = { pathname: '/iniciar-sesion' }
  const loginState = { from: location.pathname + location.search }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/85">
      <div className="mx-auto flex min-h-[68px] max-w-[1200px] items-center gap-3 px-4 sm:gap-6 sm:px-6">
        <Link to={authed ? '/seguimientos' : '/'} aria-label="Nudge, inicio" className="no-underline">
          <Logo />
        </Link>

        <NavLink
          to="/categorias"
          className={({ isActive }) =>
            cn('hidden font-semibold text-foreground no-underline hover:text-primary lg:inline', isActive && 'text-primary')
          }
        >
          Categorías
        </NavLink>

        {/* Desktop search */}
        <SearchForm key={currentQuery} defaultValue={currentQuery} className="ml-auto hidden max-w-[520px] flex-1 md:block" />

        <div className="ml-auto flex items-center gap-1 md:ml-0">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label={mobileSearchOpen ? 'Cerrar búsqueda' : 'Buscar'}
            aria-expanded={mobileSearchOpen}
            onClick={() => setMobileSearchOpen((open) => !open)}
          >
            {mobileSearchOpen ? <X aria-hidden="true" /> : <Search aria-hidden="true" />}
          </Button>

          {status === 'loading' && <Skeleton className="h-11 w-36 rounded-xl" aria-label="Cargando sesión" />}

          {status === 'anonymous' && (
            <>
              <Button asChild variant="ghost" className="px-2.5 sm:px-3">
                <Link to={loginTarget} state={loginState}>
                  Iniciar sesión
                </Link>
              </Button>
              <Button asChild className="hidden sm:inline-flex">
                <Link to="/registro" state={loginState}>
                  Crear cuenta
                </Link>
              </Button>
            </>
          )}

          {authed && (
            <>
              <NavLink
                to="/seguimientos"
                className={({ isActive }) =>
                  cn(
                    'hidden px-3 font-semibold text-foreground no-underline hover:text-primary lg:inline',
                    isActive && 'text-primary',
                  )
                }
              >
                Mis seguimientos
              </NavLink>
              <BellLink />
              <UserMenu />
            </>
          )}
        </div>
      </div>

      {mobileSearchOpen && (
        <div className="border-t border-border px-4 py-3 md:hidden">
          <SearchForm
            key={currentQuery}
            defaultValue={currentQuery}
            autoFocus
            onSubmitted={() => setMobileSearchOpen(false)}
          />
        </div>
      )}
    </header>
  )
}
