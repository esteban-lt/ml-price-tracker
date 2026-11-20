import { useId, useState, type ComponentProps, type ReactNode } from 'react'
import { Check, Eye, EyeOff } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PASSWORD_RULES } from '@/features/auth/password'
import { cn } from '@/lib/utils'

interface FieldProps {
  label: string
  error?: ReactNode
  /** Extra content next to the label (e.g. "¿Olvidaste tu contraseña?"). */
  labelAside?: ReactNode
  children: (props: { id: string; 'aria-invalid'?: true; 'aria-describedby'?: string }) => ReactNode
  after?: ReactNode
}

/** Label + control + error message, wired for screen readers. */
export function Field({ label, error, labelAside, children, after }: FieldProps) {
  const id = useId()
  const errorId = `${id}-error`
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor={id} className="text-[13px] font-semibold">
          {label}
        </Label>
        {labelAside}
      </div>
      {children({ id, 'aria-invalid': error ? true : undefined, 'aria-describedby': error ? errorId : undefined })}
      {error && (
        <div id={errorId} role="alert" className="text-[13px] text-destructive">
          {error}
        </div>
      )}
      {after}
    </div>
  )
}

/** Password input with show/hide. */
export function PasswordInput({ className, ...props }: Omit<ComponentProps<typeof Input>, 'type'>) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="relative">
      <Input {...props} type={visible ? 'text' : 'password'} className={cn('pr-12', className)} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        aria-pressed={visible}
        className="absolute top-1/2 right-1 flex size-10 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
      >
        {visible ? <EyeOff aria-hidden="true" className="size-5" /> : <Eye aria-hidden="true" className="size-5" />}
      </button>
    </div>
  )
}

/** Live checklist for new passwords. Unmet rules turn red once the user tried to submit. */
export function PasswordRequirements({
  password,
  showErrors,
  id,
}: {
  password: string
  showErrors?: boolean
  id?: string
}) {
  return (
    <ul
      id={id}
      aria-label="Requisitos de la contraseña"
      className="m-0 mt-1 grid list-none grid-cols-2 gap-x-3 gap-y-1.5 p-0 text-[13px]"
    >
      {PASSWORD_RULES.map((rule) => {
        const ok = rule.test(password)
        return (
          <li
            key={rule.id}
            className={cn(
              'flex items-center gap-2',
              ok ? 'text-success-soft-foreground' : showErrors ? 'text-destructive' : 'text-muted-foreground',
            )}
          >
            {ok ? (
              <span className="flex size-[18px] shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Check aria-hidden="true" className="size-3" strokeWidth={3} />
              </span>
            ) : (
              <span
                aria-hidden="true"
                className={cn(
                  'size-[18px] shrink-0 rounded-full border-[1.5px]',
                  showErrors ? 'border-destructive' : 'border-[#97a39e]',
                )}
              />
            )}
            <span>
              {rule.label}
              <span className="sr-only">{ok ? ' (cumplido)' : ' (pendiente)'}</span>
            </span>
          </li>
        )
      })}
    </ul>
  )
}

/** Message shown under a form (rate limit, unexpected error…). */
export function FormAlert({ children, tone = 'error' }: { children: ReactNode; tone?: 'error' | 'info' | 'success' }) {
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn(
        'rounded-xl border p-3 text-sm',
        tone === 'error' && 'border-destructive/30 bg-destructive-soft text-destructive-soft-foreground',
        tone === 'info' && 'border-warning-border bg-warning-soft text-warning-foreground',
        tone === 'success' && 'border-transparent bg-success-soft text-success-soft-foreground',
      )}
    >
      {children}
    </div>
  )
}
