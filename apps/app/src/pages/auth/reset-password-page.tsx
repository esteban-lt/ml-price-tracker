import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { KeyRound, Link2Off, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Field, FormAlert, PasswordInput, PasswordRequirements } from '@/components/common/form-field'
import { CenteredCard } from '@/components/layout/auth-layout'
import { useAuth } from '@/features/auth/auth-context'
import { isStrongPassword } from '@/features/auth/password'
import { ApiError } from '@/lib/api/client'
import { authApi } from '@/lib/api/endpoints'
import { errorMessage } from '@/lib/errors'

/** C5 · Restablecer contraseña (/reset-password?token=…, link from the recovery email) */
export function ResetPasswordPage() {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const navigate = useNavigate()
  const { status, clearSession } = useAuth()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [invalidLink, setInvalidLink] = useState(!token)

  const reset = useMutation({
    mutationFn: () => authApi.resetPassword({ token, password }),
    onSuccess: () => {
      // Every session was closed, including this browser's if it had one.
      if (status === 'authenticated') clearSession()
      toast.success('Contraseña actualizada. Inicia sesión con la nueva.')
      navigate('/iniciar-sesion', { replace: true })
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 400 && /enlace/i.test(error.message)) setInvalidLink(true)
    },
  })

  const errors = {
    password: !isStrongPassword(password) ? 'La contraseña no cumple los requisitos.' : null,
    confirm: confirm !== password ? 'Las contraseñas no coinciden.' : null,
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setSubmitted(true)
    if (errors.password || errors.confirm) return
    reset.mutate()
  }

  if (invalidLink) {
    return (
      <CenteredCard icon={<Link2Off aria-hidden="true" />}>
        <div>
          <h1 className="m-0 font-display text-[clamp(28px,5vw,34px)] font-extrabold">Este enlace ya no es válido.</h1>
          <p className="m-0 mt-1.5 text-base text-muted-foreground">
            Los enlaces vencen en 30 minutos y solo sirven una vez. Pide uno nuevo.
          </p>
        </div>
        <Button asChild size="lg">
          <Link to="/recuperar-contrasena">Pedir otro enlace</Link>
        </Button>
      </CenteredCard>
    )
  }

  const generalError = reset.isError ? errorMessage(reset.error) : null

  return (
    <CenteredCard icon={<KeyRound aria-hidden="true" />}>
      <h1 className="m-0 font-display text-[clamp(28px,5vw,34px)] font-extrabold">Elige una contraseña nueva</h1>
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <Field
          label="Contraseña nueva"
          after={<PasswordRequirements id="new-pw-reqs" password={password} showErrors={submitted} />}
        >
          {(props) => (
            <PasswordInput
              {...props}
              aria-describedby="new-pw-reqs"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              autoFocus
            />
          )}
        </Field>
        <Field label="Confirmar contraseña" error={submitted && errors.confirm}>
          {(props) => (
            <PasswordInput
              {...props}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
            />
          )}
        </Field>
        {generalError && <FormAlert>{generalError}</FormAlert>}
        <Button type="submit" size="lg" disabled={reset.isPending}>
          {reset.isPending && <Loader2 aria-hidden="true" className="animate-spin" />}
          {reset.isPending ? 'Guardando…' : 'Guardar contraseña'}
        </Button>
      </form>
    </CenteredCard>
  )
}
