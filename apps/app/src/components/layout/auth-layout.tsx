import type { ReactNode } from 'react'
import { Link, Outlet, ScrollRestoration } from 'react-router'
import { History, Mail, Target } from 'lucide-react'
import { Logo, LogoMark } from '@/components/common/logo'

/** Minimal shell for account screens: only the logo, no search or menus. */
export function AuthLayout() {
  return (
    <div className="flex min-h-svh flex-col">
      <Outlet />
      <ScrollRestoration />
    </div>
  )
}

/** Centered card (verify email, forgot/reset password, unsubscribe). */
export function CenteredCard({ icon, children }: { icon?: ReactNode; children: ReactNode }) {
  return (
    <>
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-[68px] max-w-[1200px] items-center px-4 sm:px-6">
          <Link to="/" aria-label="Nudge, inicio" className="no-underline">
            <Logo />
          </Link>
        </div>
      </header>
      <main id="contenido" className="flex flex-1 items-center justify-center px-4 py-10 sm:py-12">
        <section className="flex w-full max-w-[500px] flex-col gap-6 rounded-3xl border border-border bg-card px-5 py-8 shadow-[0_10px_30px_rgba(18,32,28,.05)] sm:px-11 sm:py-10">
          {icon && (
            <span className="flex size-16 items-center justify-center rounded-[18px] bg-success-soft text-success-soft-foreground [&_svg]:size-8">
              {icon}
            </span>
          )}
          {children}
        </section>
      </main>
    </>
  )
}

const BENEFITS = [
  { icon: Target, title: 'Tú eliges el precio', text: 'Un monto objetivo o un porcentaje de baja.' },
  { icon: History, title: 'Historial de cada producto', text: 'Mira cómo se ha movido el precio antes de comprar.' },
  { icon: Mail, title: 'Avisos en la app y por correo', text: 'Solo cuando el precio cruza tu umbral.' },
]

/** Split screen for register and login: brand panel on the left (desktop), form on the right. */
export function SplitAuth({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-1 flex-wrap">
      <aside className="hidden flex-[1_1_440px] flex-col gap-9 bg-[#12201C] px-[clamp(24px,5vw,72px)] py-10 text-white lg:flex">
        <Link to="/" aria-label="Nudge, inicio" className="flex items-center gap-2 text-white no-underline">
          <LogoMark />
          <span className="font-display text-[22px] font-extrabold">Nudge</span>
        </Link>
        <div className="mt-auto flex max-w-[460px] flex-col gap-7">
          <h2 className="m-0 font-display text-[44px] leading-[1.05] font-extrabold">Deja que el precio venga a ti.</h2>
          <div className="flex items-center gap-3.5 rounded-[20px] border border-[#2A3732] bg-[#18221E] p-4">
            <div className="product-frame size-16 shrink-0">
              <svg
                width="40"
                height="40"
                viewBox="0 0 64 64"
                aria-hidden="true"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M14 38v-6a18 18 0 0 1 36 0v6" />
                <rect x="10" y="36" width="10" height="16" rx="4" />
                <rect x="44" y="36" width="10" height="16" rx="4" />
              </svg>
            </div>
            <div>
              <div className="text-[13px] text-[#9DB0A8]">Audífonos Sony WH-1000XM5</div>
              <div className="num text-[22px] font-bold text-[#3DCB9C]">Bajó a $5,449.00</div>
              <div className="num text-xs text-[#9DB0A8]">Tu aviso: menos de $5,499.00</div>
            </div>
          </div>
          <ul className="m-0 flex list-none flex-col gap-4 p-0">
            {BENEFITS.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-[#1E2C27] text-[#3DCB9C]">
                  <Icon aria-hidden="true" className="size-[18px]" />
                </span>
                <span className="text-[15px] text-[#C9D4CF]">
                  <b className="block text-white">{title}</b>
                  {text}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <p className="mt-auto mb-0 text-[13px] text-[#9DB0A8]">Nudge no está afiliado a Mercado Libre.</p>
      </aside>
      <main
        id="contenido"
        className="flex flex-[1_1_440px] flex-col items-center justify-center px-4 py-8 sm:px-6 sm:py-10"
      >
        <Link to="/" aria-label="Nudge, inicio" className="mb-8 self-start no-underline sm:self-center lg:hidden">
          <Logo />
        </Link>
        <div className="flex w-full max-w-[440px] flex-col gap-6">{children}</div>
      </main>
    </div>
  )
}
