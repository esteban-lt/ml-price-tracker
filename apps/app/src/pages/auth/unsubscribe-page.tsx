import { Link, useSearchParams } from 'react-router'
import { useMutation } from '@tanstack/react-query'
import { Link2Off, Loader2, MailCheck, MailX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FormAlert } from '@/components/common/form-field'
import { CenteredCard } from '@/components/layout/auth-layout'
import { ApiError } from '@/lib/api/client'
import { usersApi } from '@/lib/api/endpoints'
import { errorMessage } from '@/lib/errors'

/**
 * C6 · Baja de alertas por correo (/unsubscribe?token=…, link from alert emails).
 * Only unsubscribes when the button is pressed: antivirus and mail clients open links on their own.
 */
export function UnsubscribePage() {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''

  const unsubscribe = useMutation({ mutationFn: () => usersApi.unsubscribe(token) })
  const invalid = !token || (unsubscribe.error instanceof ApiError && unsubscribe.error.status === 400)

  if (invalid) {
    return (
      <CenteredCard icon={<Link2Off aria-hidden="true" />}>
        <div>
          <h1 className="m-0 font-display text-[clamp(26px,5vw,32px)] font-extrabold">Este enlace no es válido</h1>
          <p className="m-0 mt-1.5 text-base text-muted-foreground">
            Puedes cambiar tus notificaciones desde Mi cuenta.
          </p>
        </div>
        <Button asChild size="lg">
          <Link to="/cuenta">Ir a Mi cuenta</Link>
        </Button>
      </CenteredCard>
    )
  }

  if (unsubscribe.isSuccess) {
    return (
      <CenteredCard icon={<MailCheck aria-hidden="true" />}>
        <div role="status">
          <h1 className="m-0 font-display text-[clamp(26px,5vw,32px)] font-extrabold">Listo</h1>
          <p className="m-0 mt-1.5 text-base text-muted-foreground">
            Ya no te enviaremos alertas por correo. Puedes volver a activarlas en{' '}
            <Link to="/cuenta" className="font-semibold">
              Mi cuenta
            </Link>
            .
          </p>
        </div>
        <Button asChild variant="outline" size="lg">
          <Link to="/">Ir a Nudge</Link>
        </Button>
      </CenteredCard>
    )
  }

  return (
    <CenteredCard icon={<MailX aria-hidden="true" />}>
      <div>
        <h1 className="m-0 font-display text-[clamp(26px,5vw,32px)] font-extrabold">
          ¿Dejar de recibir alertas por correo?
        </h1>
        <p className="m-0 mt-1.5 text-base text-muted-foreground">Seguirás viendo tus alertas dentro de Nudge.</p>
      </div>
      {unsubscribe.isError && <FormAlert>{errorMessage(unsubscribe.error)}</FormAlert>}
      <div className="flex flex-col gap-2.5">
        <Button size="lg" onClick={() => unsubscribe.mutate()} disabled={unsubscribe.isPending}>
          {unsubscribe.isPending && <Loader2 aria-hidden="true" className="animate-spin" />}
          Sí, dejar de recibirlas
        </Button>
        <Button asChild variant="ghost" size="lg">
          <Link to="/">No, volver a Nudge</Link>
        </Button>
      </div>
    </CenteredCard>
  )
}
