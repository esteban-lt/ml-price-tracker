import { cn } from '@/lib/utils'

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 30 30" aria-hidden="true" className={cn('size-[30px] shrink-0', className)}>
      <rect width="30" height="30" rx="9" fill="#0E7A5F" />
      <path
        d="M9 11.5l6 6 6-6"
        fill="none"
        stroke="#fff"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="15" cy="22.6" r="1.7" fill="#B8F2D8" />
    </svg>
  )
}

export function Logo({ className, markClassName }: { className?: string; markClassName?: string }) {
  return (
    <span className={cn('flex items-center gap-2 text-foreground', className)}>
      <LogoMark className={markClassName} />
      <span className="font-display text-[21px] leading-none font-extrabold">Nudge</span>
    </span>
  )
}
