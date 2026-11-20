import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { useMutation } from '@tanstack/react-query'
import { KeyRound, Loader2, MailCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field, FormAlert } from '@/components/common/form-field'
import { CenteredCard } from '@/components/layout/auth-layout'
import { useAuthLocationState } from '@/features/auth/location-state'
import { isValidEmail, normalizeEmail } from '@/features/auth/password'
import { authApi } from '@/lib/api/endpoints'
import { errorMessage } from '@/lib/errors'
import { formatClock, useCountdown } from '@/lib/use-countdown'

/** C4 · Olvidé mi contraseña */
export function ForgotPasswordPage() {
  const { email: initialEmail } = useAuthLocationState()
  const [email, setEmail] = useState(initialEmail ?? '')
  const [submitted, setSubmitted] = useState(false)
  const [sentTo, setSentTo] = useState<string | null>(null)
  const { secondsLeft, start } = useCountdown()

  const forgot = useMutation({
    mutationFn: (value: string) => authApi.forgotPassword(value),
    onSuccess: (_, value) => {
      // Always the same confirmation: never reveal whether the account exists.
      setSentTo(value)
      start(60)
    },
  })

  const emailError = !isValidEmail(email) ? 'Escribe un correo válido.' : null

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setSubmitted(true)
    if (emailError) return
    forgot.mutate(normalizeEmail(email))
  }

  if (sentTo) {
    return (
      <CenteredCard icon={<MailCheck aria-hidden="true" />}>
        <div>
          <h1 className="m-0 font-display text-[clamp(28px,5vw,34px)] font-extrabold">Revisa tu correo</h1>
          <p role="status" className="m-0 mt-1.5 text-base text-muted-foreground">
            Si existe una cuenta con <b className="break-all text-foreground">{sentTo}</b>, te enviamos un enlace. Vence
            en 30 minutos. Revisa también tu carpeta de spam.
          </p>
        </div>
        {forgot.isError && <FormAlert>{errorMessage(forgot.error)}</FormAlert>}
        <div className="flex flex-col gap-2.5">
          <Button
            variant="outline"
            size="lg"
            disabled={secondsLeft > 0 || forgot.isPending}
            onClick={() => forgot.mutate(sentTo)}
          >
            {forgot.isPending && <Loader2 aria-hidden="true" className="animate-spin" />}
            {secondsLeft > 0 ? `Enviar de nuevo en ${formatClock(secondsLeft)}` : 'Enviar de nuevo'}
          </Button>
          <Button asChild variant="ghost" size="lg">
            <Link to="/iniciar-sesion">Volver a iniciar sesión</Link>
          </Button>
        </div>
      </CenteredCard>
    )
  }

  return (
    <CenteredCard icon={<KeyRound aria-hidden="true" />}>
      <div>
        <h1 className="m-0 font-display text-[clamp(28px,5vw,34px)] font-extrabold">Recupera tu contraseña</h1>
        <p className="m-0 mt-1.5 text-base text-muted-foreground">
          Escribe tu correo y te enviaremos un enlace para elegir una nueva.
        </p>
      </div>
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <Field label="Correo" error={submitted && emailError}>
          {(props) => (
            <Input
              {...props}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              inputMode="email"
              autoFocus
            />
          )}
        </Field>
        {forgot.isError && <FormAlert>{errorMessage(forgot.error)}</FormAlert>}
        <Button type="submit" size="lg" disabled={forgot.isPending}>
          {forgot.isPending && <Loader2 aria-hidden="true" className="animate-spin" />}
          {forgot.isPending ? 'Enviando…' : 'Enviar enlace'}
        </Button>
      </form>
      <Link to="/iniciar-sesion" className="text-center font-semibold">
        Volver a iniciar sesión
      </Link>
    </CenteredCard>
  )
}
