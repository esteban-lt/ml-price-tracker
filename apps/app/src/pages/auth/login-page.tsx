import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { useMutation } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field, FormAlert, PasswordInput } from '@/components/common/form-field'
import { SplitAuth } from '@/components/layout/auth-layout'
import { useAuth } from '@/features/auth/auth-context'
import { useAuthLocationState } from '@/features/auth/location-state'
import { isValidEmail, normalizeEmail } from '@/features/auth/password'
import { PendingFollowBanner } from '@/features/auth/pending-follow-banner'
import { ApiError } from '@/lib/api/client'
import { authApi } from '@/lib/api/endpoints'
import { errorMessage } from '@/lib/errors'

/** C3 · Iniciar sesión */
export function LoginPage() {
  const navigate = useNavigate()
  const { startSession, setPendingVerification } = useAuth()
  const { from, reason, email: initialEmail, notice } = useAuthLocationState()
  const [email, setEmail] = useState(initialEmail ?? '')
  const [password, setPassword] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const errors = {
    email: !isValidEmail(email) ? 'Escribe un correo válido.' : null,
    password: password.length === 0 ? 'Escribe tu contraseña.' : null,
  }

  const login = useMutation({
    mutationFn: () => authApi.login({ email: normalizeEmail(email), password }),
    // RequireGuest sends the user back to `from` (or to Mis seguimientos) once the session exists.
    onSuccess: (session) => startSession(session),
    onError: (error) => {
      if (error instanceof ApiError && error.body.code === 'EMAIL_NOT_VERIFIED' && error.body.verificationToken) {
        setPendingVerification({
          email: normalizeEmail(email),
          verificationToken: error.body.verificationToken,
          resendIn: 0,
          requestNewCode: true,
        })
        navigate('/verificar-correo', { state: { from, notice: 'Te falta verificar tu correo.' } })
      }
    },
  })

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setSubmitted(true)
    if (errors.email || errors.password) return
    login.mutate()
  }

  let loginError: string | null = null
  if (login.isError) {
    const error = login.error
    if (error instanceof ApiError && error.status === 401) loginError = 'Correo o contraseña incorrectos.'
    else if (error instanceof ApiError && error.status === 429) loginError = 'Demasiados intentos. Espera un minuto.'
    else if (!(error instanceof ApiError && error.status === 403)) loginError = errorMessage(error)
  }

  return (
    <SplitAuth>
      <PendingFollowBanner />
      <div>
        <h1 className="m-0 font-display text-[clamp(30px,5vw,36px)] font-extrabold">Inicia sesión</h1>
        {reason === 'follow' && (
          <p className="m-0 mt-1 text-base text-muted-foreground">Entra para seguir el precio de este producto.</p>
        )}
      </div>

      {notice && <FormAlert tone="success">{notice}</FormAlert>}

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <Field label="Correo" error={submitted && errors.email}>
          {(props) => (
            <Input
              {...props}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              inputMode="email"
            />
          )}
        </Field>
        <Field
          label="Contraseña"
          error={submitted && errors.password}
          labelAside={
            <Link
              to="/recuperar-contrasena"
              state={{ email: isValidEmail(email) ? normalizeEmail(email) : undefined }}
              className="text-[13px] font-semibold"
            >
              ¿Olvidaste tu contraseña?
            </Link>
          }
        >
          {(props) => (
            <PasswordInput
              {...props}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          )}
        </Field>

        {loginError && <FormAlert>{loginError}</FormAlert>}

        <Button type="submit" size="lg" className="mt-1" disabled={login.isPending}>
          {login.isPending && <Loader2 aria-hidden="true" className="animate-spin" />}
          {login.isPending ? 'Entrando…' : 'Iniciar sesión'}
        </Button>
      </form>

      <p className="m-0 text-center">
        ¿No tienes cuenta?{' '}
        <Link to="/registro" state={{ from }} className="font-bold">
          Créala gratis
        </Link>
      </p>
    </SplitAuth>
  )
}
