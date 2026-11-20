import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface SearchFormProps {
  defaultValue?: string
  size?: 'header' | 'hero'
  placeholder?: string
  autoFocus?: boolean
  className?: string
  onSubmitted?: () => void
  children?: React.ReactNode
}

/** Search box: sends on Enter or button, never on every key (2 to 100 characters). */
export function SearchForm({
  defaultValue = '',
  size = 'header',
  placeholder = 'Busca un producto de Mercado Libre',
  autoFocus,
  className,
  onSubmitted,
  children,
}: SearchFormProps) {
  const navigate = useNavigate()
  const [value, setValue] = useState(defaultValue)
  const [error, setError] = useState<string | null>(null)
  const id = size === 'hero' ? 'hero-search' : 'header-search'

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const q = value.trim()
    if (q.length < 2) {
      setError('Escribe al menos 2 caracteres.')
      return
    }
    setError(null)
    navigate(`/buscar?q=${encodeURIComponent(q)}`)
    onSubmitted?.()
  }

  const hero = size === 'hero'

  return (
    <form role="search" onSubmit={handleSubmit} className={cn('relative', className)} noValidate>
      <div className={cn('flex gap-2.5', hero && 'flex-wrap')}>
        <div className="relative flex-1 basis-64">
          <label htmlFor={id} className="sr-only">
            Buscar productos
          </label>
          <Search
            aria-hidden="true"
            className={cn(
              'pointer-events-none absolute top-1/2 -translate-y-1/2 text-muted-foreground',
              hero ? 'left-4 size-[22px]' : 'left-3.5 size-5',
            )}
          />
          <Input
            id={id}
            type="search"
            value={value}
            maxLength={100}
            autoFocus={autoFocus}
            onChange={(e) => {
              setValue(e.target.value)
              if (error) setError(null)
            }}
            placeholder={placeholder}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${id}-error` : undefined}
            className={cn(
              hero ? 'h-14 border-[1.5px] pl-12 text-[17px]' : 'h-11 border-border bg-background pl-[42px]',
            )}
          />
        </div>
        {children}
      </div>
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1.5 text-[13px] text-destructive">
          {error}
        </p>
      )}
    </form>
  )
}
