import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Loader2, MailCheck, ShieldAlert } from 'lucide-react'
import { REGEXP_ONLY_DIGITS } from 'input-otp'
import { Button } from '@/components/ui/button'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'
import { FormAlert } from '@/components/common/form-field'
import { CenteredCard } from '@/components/layout/auth-layout'
import { useAuth, type PendingVerification } from '@/features/auth/auth-context'
import { useAuthLocationState } from '@/features/auth/location-state'
import { ApiError } from '@/lib/api/client'
import { authApi } from '@/lib/api/endpoints'
import { errorMessage, MESSAGES } from '@/lib/errors'
import { formatClock, useCountdown } from '@/lib/use-countdown'

/** C2 · Verificar correo */
export function VerifyEmailPage() {
  const { pendingVerification } = useAuth()
  const { from } = useAuthLocationState()

  // The verification token lives in memory only: after a reload, or when it expired, log in again.
  if (!pendingVerification) return <TokenExpired from={from} />
  return <VerifyForm pending={pendingVerification} />
}

function TokenExpired({ from }: { from?: string }) {
  return (
    <CenteredCard icon={<ShieldAlert aria-hidden="true" />}>
      <div>
        <h1 className="m-0 font-display text-[clamp(28px,5vw,34px)] font-extrabold">Vuelve a iniciar sesión</h1>
        <p className="m-0 mt-1.5 text-base text-muted-foreground">
          Por seguridad, vuelve a iniciar sesión para continuar. Te traeremos de vuelta aquí para verificar tu correo.
        </p>
      </div>
      <Button asChild size="lg">
        <Link to="/iniciar-sesion" state={{ from }}>
          Iniciar sesión
        </Link>
      </Button>
    </CenteredCard>
  )
}

/** "Espera 58 segundos antes de pedir otro código" → 58 */
function secondsFromMessage(message: string) {
  const match = /(\d+)\s*segundo/.exec(message)
  return match ? Number(match[1]) : 60
}

function VerifyForm({ pending }: { pending: PendingVerification }) {
  const { startSession, setPendingVerification } = useAuth()
  const { from, notice } = useAuthLocationState()
  const [code, setCode] = useState('')
  const [codeError, setCodeError] = useState<string | null>(null)
  /** The code expired or ran out of attempts: highlight "Enviar un código nuevo". */
  const [needsNewCode, setNeedsNewCode] = useState(false)
  const [tokenExpired, setTokenExpired] = useState(false)
  const [resendNotice, setResendNotice] = useState<{ tone: 'error' | 'success'; text: string } | null>(null)
  const { secondsLeft, start } = useCountdown(pending.resendIn)

  const verify = useMutation({
    mutationFn: (value: string) => authApi.verifyEmail(pending.verificationToken, value),
    onSuccess: (session) => {
      toast.success('Correo verificado')
      // RequireGuest takes the user to `from` or to Mis seguimientos.
      startSession(session)
    },
    onError: (error) => {
      setCode('')
      if (error instanceof ApiError && error.status === 401) {
        setTokenExpired(true)
      } else if (error instanceof ApiError && error.status === 400) {
        const message = error.messages[0] ?? MESSAGES.unexpected
        // Spanish business messages ("El código es incorrecto; te quedan 4 intentos"…);
        // the format one comes as an array in Spanish too.
        setCodeError(message)
        setNeedsNewCode(/solicita/i.test(message))
      } else {
        setCodeError(errorMessage(error))
      }
    },
  })

  const resend = useMutation({
    mutationFn: () => authApi.resendVerification(pending.verificationToken),
    onSuccess: () => {
      start(60)
      setNeedsNewCode(false)
      setCodeError(null)
      setResendNotice({ tone: 'success', text: 'Te enviamos un código nuevo.' })
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 401) {
        setTokenExpired(true)
      } else if (error instanceof ApiError && error.status === 429 && /espera/i.test(error.message)) {
        // The previous code is still valid: only show the countdown.
        start(secondsFromMessage(error.message))
      } else if (error instanceof ApiError && error.status === 503) {
        setResendNotice({ tone: 'error', text: 'No pudimos enviar el correo. Inténtalo en un minuto.' })
      } else {
        setResendNotice({ tone: 'error', text: errorMessage(error) })
      }
    },
  })

  // Coming from login with an unverified account: ask for a new code right away.
  const requested = useRef(false)
  useEffect(() => {
    if (pending.requestNewCode && !requested.current) {
      requested.current = true
      resend.mutate()
      setPendingVerification({ ...pending, requestNewCode: false })
    }
  }, [pending, resend, setPendingVerification])

  function submit(value: string) {
    if (!/^\d{6}$/.test(value)) {
      setCodeError('Escribe los 6 dígitos del código.')
      return
    }
    setCodeError(null)
    verify.mutate(value)
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    submit(code)
  }

  if (tokenExpired) return <TokenExpired from={from} />

  return (
    <CenteredCard icon={<MailCheck aria-hidden="true" />}>
      {notice && <FormAlert tone="info">{notice}</FormAlert>}
      <div>
        <h1 className="m-0 font-display text-[clamp(28px,5vw,34px)] font-extrabold">Revisa tu correo</h1>
        <p className="m-0 mt-1.5 text-base text-muted-foreground">
          Enviamos un código de 6 dígitos a <b className="break-all text-foreground">{pending.email}</b>. Vence en 10
          minutos.
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label htmlFor="otp" className="text-sm font-semibold">
            Código de verificación
          </label>
          <InputOTP
            id="otp"
            maxLength={6}
            pattern={REGEXP_ONLY_DIGITS}
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            value={code}
            onChange={(value) => {
              setCode(value)
              if (codeError) setCodeError(null)
            }}
            onComplete={(value: string) => submit(value)}
            disabled={verify.isPending}
            aria-invalid={codeError ? true : undefined}
            aria-describedby="otp-help"
            containerClassName="w-full"
          >
            <InputOTPGroup className="grid w-full grid-cols-6 gap-2 sm:gap-2.5">
              {Array.from({ length: 6 }, (_, i) => (
                <InputOTPSlot
                  key={i}
                  index={i}
                  aria-invalid={codeError ? true : undefined}
                  className="num h-[60px] w-full rounded-xl! border! border-input bg-card text-[26px] font-semibold data-[active=true]:border-2! data-[active=true]:border-primary! data-[active=true]:ring-[3px] data-[active=true]:ring-success-soft"
                />
              ))}
            </InputOTPGroup>
          </InputOTP>
          <div id="otp-help" aria-live="polite" className="text-[13px]">
            {codeError ? (
              <span className="text-destructive">{codeError}</span>
            ) : (
              <span className="text-muted-foreground">Puedes pegar el código completo.</span>
            )}
          </div>
        </div>

        {needsNewCode ? (
          <Button
            type="button"
            size="lg"
            onClick={() => resend.mutate()}
            disabled={resend.isPending || secondsLeft > 0}
          >
            {resend.isPending && <Loader2 aria-hidden="true" className="animate-spin" />}
            {secondsLeft > 0 ? `Enviar un código nuevo en ${formatClock(secondsLeft)}` : 'Enviar un código nuevo'}
          </Button>
        ) : (
          <Button type="submit" size="lg" disabled={verify.isPending || code.length < 6}>
            {verify.isPending && <Loader2 aria-hidden="true" className="animate-spin" />}
            {verify.isPending ? 'Verificando…' : 'Verificar'}
          </Button>
        )}
      </form>

      {resendNotice && <FormAlert tone={resendNotice.tone}>{resendNotice.text}</FormAlert>}

      <div className="flex flex-col gap-3 border-t border-border pt-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {secondsLeft > 0 ? (
            <span className="num text-muted-foreground" aria-live="polite">
              Puedes pedir otro en {formatClock(secondsLeft)}
            </span>
          ) : (
            <Button
              type="button"
              variant="link"
              onClick={() => resend.mutate()}
              disabled={resend.isPending}
              className="min-h-11 font-bold"
            >
              {resend.isPending ? 'Enviando…' : 'Reenviar código'}
            </Button>
          )}
          <Link
            to="/registro"
            state={{ from }}
            className="font-semibold text-muted-foreground no-underline hover:underline"
          >
            Usar otro correo
          </Link>
        </div>
        <p className="m-0 text-[13px] text-muted-foreground">¿No te llegó? Revisa también tu carpeta de spam.</p>
      </div>
    </CenteredCard>
  )
}
