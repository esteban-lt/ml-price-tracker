import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { useMutation } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field, FormAlert, PasswordInput, PasswordRequirements } from '@/components/common/form-field'
import { SplitAuth } from '@/components/layout/auth-layout'
import { useAuth } from '@/features/auth/auth-context'
import { useAuthLocationState } from '@/features/auth/location-state'
import { isStrongPassword, isValidEmail, normalizeEmail } from '@/features/auth/password'
import { PendingFollowBanner } from '@/features/auth/pending-follow-banner'
import { ApiError } from '@/lib/api/client'
import { authApi } from '@/lib/api/endpoints'
import { errorMessage } from '@/lib/errors'

/** C1 · Crear cuenta */
export function RegisterPage() {
  const navigate = useNavigate()
  const { setPendingVerification } = useAuth()
  const { from } = useAuthLocationState()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [emailTaken, setEmailTaken] = useState(false)

  const errors = {
    name: name.trim().length < 3 ? 'Escribe al menos 3 caracteres.' : null,
    email: !isValidEmail(email) ? 'Escribe un correo válido.' : null,
    password: !isStrongPassword(password) ? 'La contraseña no cumple los requisitos.' : null,
  }

  const register = useMutation({
    mutationFn: () => authApi.register({ name: name.trim(), email: normalizeEmail(email), password }),
    onSuccess: ({ user, verificationToken }) => {
      // The code was just sent: "Reenviar código" waits 60 s.
      setPendingVerification({ email: user.email, verificationToken, resendIn: 60, requestNewCode: false })
      navigate('/verificar-correo', { state: { from } })
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 400 && error.messages.includes('User already exists')) {
        setEmailTaken(true)
      }
    },
  })

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setSubmitted(true)
    if (errors.name || errors.email || errors.password) return
    register.mutate()
  }

  const generalError = register.isError && !emailTaken ? errorMessage(register.error) : null

  return (
    <SplitAuth>
      <PendingFollowBanner />
      <div>
        <h1 className="m-0 font-display text-[clamp(30px,5vw,36px)] font-extrabold">Crea tu cuenta</h1>
        <p className="m-0 mt-1 text-base text-muted-foreground">
          Te avisamos cuando bajen los precios que te interesan.
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <Field label="Nombre" error={submitted && errors.name}>
          {(props) => (
            <Input
              {...props}
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              maxLength={100}
            />
          )}
        </Field>
        <Field
          label="Correo"
          error={
            emailTaken ? (
              <>
                Ya existe una cuenta con este correo. ¿Quieres{' '}
                <Link to="/iniciar-sesion" state={{ from, email: normalizeEmail(email) }} className="font-semibold">
                  iniciar sesión
                </Link>{' '}
                o{' '}
                <Link to="/recuperar-contrasena" state={{ email: normalizeEmail(email) }} className="font-semibold">
                  recuperar tu contraseña
                </Link>
                ?
              </>
            ) : (
              submitted && errors.email
            )
          }
        >
          {(props) => (
            <Input
              {...props}
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                setEmailTaken(false)
              }}
              autoComplete="email"
              inputMode="email"
            />
          )}
        </Field>
        <Field
          label="Contraseña"
          after={<PasswordRequirements id="pw-reqs" password={password} showErrors={submitted} />}
        >
          {(props) => (
            <PasswordInput
              {...props}
              aria-describedby="pw-reqs"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
          )}
        </Field>

        {generalError && <FormAlert>{generalError}</FormAlert>}

        <Button type="submit" size="lg" className="mt-1" disabled={register.isPending}>
          {register.isPending && <Loader2 aria-hidden="true" className="animate-spin" />}
          {register.isPending ? 'Creando cuenta…' : 'Crear cuenta'}
        </Button>
      </form>

      <p className="m-0 text-center">
        ¿Ya tienes cuenta?{' '}
        <Link to="/iniciar-sesion" state={{ from }} className="font-bold">
          Inicia sesión
        </Link>
      </p>
    </SplitAuth>
  )
}
