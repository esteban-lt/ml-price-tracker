import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { CircleCheck, CircleX, ExternalLink, Loader2, RefreshCw, ShieldOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { FormAlert } from '@/components/common/form-field'
import { EmptyState, ErrorState } from '@/components/common/states'
import { ApiError } from '@/lib/api/client'
import { adminApi } from '@/lib/api/endpoints'
import { errorMessage } from '@/lib/errors'
import { formatDateTime } from '@/lib/format'
import { cn } from '@/lib/utils'

const statusKey = ['me', 'admin', 'mercado-libre-status'] as const

/** "en 5 h 28 min" */
function timeUntil(iso: string) {
  const minutes = Math.round((new Date(iso).getTime() - Date.now()) / 60000)
  if (minutes <= 0) return 'ya venció'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return h > 0 ? `en ${h} h ${m} min` : `en ${m} min`
}

/**
 * X1 · Conexión con Mercado Libre (admins only, /admin/mercado-libre).
 * Not linked from the navigation: reached by URL or from the "authorization lost" email.
 */
export function AdminMercadoLibrePage() {
  const queryClient = useQueryClient()
  const [code, setCode] = useState('')
  const status = useQuery({ queryKey: statusKey, queryFn: adminApi.status, retry: false })

  const authorize = useMutation({
    mutationFn: adminApi.authUrl,
    onSuccess: ({ url }) => window.open(url, '_blank', 'noopener,noreferrer'),
    onError: (error) => toast.error(errorMessage(error)),
  })

  const exchange = useMutation({
    mutationFn: (value: string) => adminApi.exchange(value),
    onSuccess: (result) => {
      queryClient.setQueryData(statusKey, result)
      setCode('')
      toast.success('Mercado Libre conectado')
    },
  })

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (code.trim()) exchange.mutate(code.trim())
  }

  if (status.error instanceof ApiError && status.error.status === 403) {
    return (
      <div className="mx-auto max-w-[880px] px-4 py-12 sm:px-6">
        <EmptyState
          icon={<ShieldOff aria-hidden="true" />}
          title="Sin permiso"
          description="Esta sección es solo para administradores."
        />
      </div>
    )
  }

  const exchangeError =
    exchange.error instanceof ApiError && exchange.error.status === 503
      ? 'No se pudo conectar. Genera la autorización otra vez y pega el code nuevo.'
      : exchange.isError
        ? errorMessage(exchange.error)
        : null

  const data = status.data
  return (
    <div className="mx-auto flex max-w-[880px] flex-col gap-5 px-4 py-8 sm:px-6 sm:py-9">
      <div>
        <h1 className="m-0 font-display text-[clamp(28px,5vw,34px)] font-extrabold">Conexión con Mercado Libre</h1>
        <p className="m-0 mt-1 text-muted-foreground">
          La app consulta precios con esta cuenta. Si se desconecta, búsqueda, categorías y seguir productos dejan de
          funcionar.
        </p>
      </div>

      {status.isError ? (
        <ErrorState
          title="No pudimos consultar el estado."
          onRetry={() => status.refetch()}
          retrying={status.isFetching}
        />
      ) : (
        <section
          aria-live="polite"
          className="flex flex-wrap items-center gap-4 rounded-[20px] border border-border bg-card p-5"
        >
          {status.isPending ? (
            <Skeleton className="h-12 w-64" />
          ) : (
            <>
              <span
                className={cn(
                  'flex size-12 items-center justify-center rounded-xl',
                  data?.authorized
                    ? 'bg-success-soft text-success-soft-foreground'
                    : 'bg-destructive-soft text-destructive-soft-foreground',
                )}
              >
                {data?.authorized ? (
                  <CircleCheck aria-hidden="true" className="size-6" />
                ) : (
                  <CircleX aria-hidden="true" className="size-6" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-lg font-bold">{data?.authorized ? 'Conectado' : 'Sin conectar'}</div>
                <div className="num text-sm text-muted-foreground">
                  {data?.authorized && data.access_token_expires_at
                    ? `El acceso actual vence el ${formatDateTime(data.access_token_expires_at)} (${timeUntil(data.access_token_expires_at)}). Se renueva solo.`
                    : data?.authorized
                      ? 'Hay autorización guardada; el acceso se obtiene en la siguiente consulta.'
                      : 'Sigue los pasos 1 y 2 para conectar la cuenta.'}
                </div>
              </div>
            </>
          )}
          <Button variant="outline" onClick={() => status.refetch()} disabled={status.isFetching}>
            <RefreshCw aria-hidden="true" className={cn(status.isFetching && 'animate-spin')} />
            Actualizar estado
          </Button>
        </section>
      )}

      <section className="flex flex-col gap-5 rounded-[20px] border border-border bg-card p-5 sm:p-6">
        <h2 className="m-0 font-display text-xl font-bold">{data?.authorized ? 'Volver a conectar' : 'Conectar'}</h2>

        <div className="flex gap-4">
          <span className="num flex size-8 shrink-0 items-center justify-center rounded-full bg-ink text-sm font-bold text-ink-foreground">
            1
          </span>
          <div className="flex flex-1 flex-col gap-3">
            <div>
              <div className="font-semibold">Autoriza la app en Mercado Libre</div>
              <div className="text-sm text-muted-foreground">
                Se abre en otra pestaña. Al terminar, Mercado Libre te mostrará un código en la dirección de la página.
              </div>
            </div>
            <Button
              variant="outline"
              className="self-start"
              onClick={() => authorize.mutate()}
              disabled={authorize.isPending}
            >
              {authorize.isPending ? (
                <Loader2 aria-hidden="true" className="animate-spin" />
              ) : (
                <ExternalLink aria-hidden="true" />
              )}
              Abrir autorización de Mercado Libre
            </Button>
          </div>
        </div>

        <div className="h-px bg-border" />

        <div className="flex gap-4">
          <span className="num flex size-8 shrink-0 items-center justify-center rounded-full bg-ink text-sm font-bold text-ink-foreground">
            2
          </span>
          <form onSubmit={handleSubmit} noValidate className="flex flex-1 flex-col gap-3">
            <div>
              <label htmlFor="ml-code" className="font-semibold">
                Pega el code devuelto
              </label>
              <div className="text-sm text-muted-foreground">
                Empieza con TG-. Úsalo pronto: vence en pocos minutos.
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Input
                id="ml-code"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value)
                  if (exchange.isError) exchange.reset()
                }}
                placeholder="TG-0000000000000000000000000-000000000"
                autoComplete="off"
                spellCheck={false}
                className="num min-w-0 flex-[1_1_260px]"
              />
              <Button type="submit" disabled={!code.trim() || exchange.isPending}>
                {exchange.isPending && <Loader2 aria-hidden="true" className="animate-spin" />}
                Conectar
              </Button>
            </div>
            {exchangeError && <FormAlert>{exchangeError}</FormAlert>}
          </form>
        </div>
      </section>
    </div>
  )
}
