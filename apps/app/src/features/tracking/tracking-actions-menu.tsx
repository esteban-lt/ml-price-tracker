import { useState } from 'react'
import { ExternalLink, MoreHorizontal, Pause, Pencil, Play, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { TrackedProduct } from '@/lib/api/types'
import { EditThresholdDialog } from './edit-threshold-dialog'
import { useTrackingActions } from './queries'
import { UnfollowDialog } from './unfollow-dialog'

const ITEM = 'h-10 gap-2.5 rounded-lg px-2.5 text-[15px]'

/** "…" menu of a tracking card: edit, pause/resume, open in Mercado Libre, unfollow (last, red, confirmed). */
export function TrackingActionsMenu({ tracking }: { tracking: TrackedProduct }) {
  const { pause, resume } = useTrackingActions()
  const [editOpen, setEditOpen] = useState(false)
  const [unfollowOpen, setUnfollowOpen] = useState(false)
  const paused = tracking.status === 'paused'

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={`Más acciones para ${tracking.product.name}`}>
            <MoreHorizontal aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 rounded-[14px] p-1.5">
          <DropdownMenuItem className={ITEM} onSelect={() => setEditOpen(true)}>
            <Pencil aria-hidden="true" />
            Editar umbral
          </DropdownMenuItem>
          <DropdownMenuItem
            className={ITEM}
            disabled={pause.isPending || resume.isPending}
            onSelect={() => (paused ? resume.mutate(tracking.id) : pause.mutate(tracking.id))}
          >
            {paused ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}
            {paused ? 'Reanudar' : 'Pausar'}
          </DropdownMenuItem>
          <DropdownMenuItem asChild className={ITEM}>
            <a
              href={tracking.product.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground no-underline"
            >
              <ExternalLink aria-hidden="true" />
              Ver en Mercado Libre
            </a>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" className={ITEM} onSelect={() => setUnfollowOpen(true)}>
            <Trash2 aria-hidden="true" />
            Dejar de seguir
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <EditThresholdDialog tracking={tracking} open={editOpen} onOpenChange={setEditOpen} />
      <UnfollowDialog tracking={tracking} open={unfollowOpen} onOpenChange={setUnfollowOpen} />
    </>
  )
}
