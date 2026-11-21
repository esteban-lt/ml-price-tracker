import { Loader2, Trash2 } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import type { TrackedProduct } from '@/lib/api/types'
import { useTrackingActions } from './queries'

/** Confirmation before unfollowing (it also deletes the tracking's alerts). */
export function UnfollowDialog({
  tracking,
  open,
  onOpenChange,
  onDeleted,
}: {
  tracking: TrackedProduct
  open: boolean
  onOpenChange: (open: boolean) => void
  onDeleted?: () => void
}) {
  const { remove } = useTrackingActions()

  return (
    <AlertDialog open={open} onOpenChange={(next) => !remove.isPending && onOpenChange(next)}>
      <AlertDialogContent>
        <AlertDialogHeader className="items-start text-left">
          <span className="mb-1 flex size-11 items-center justify-center rounded-full bg-destructive-soft text-destructive-soft-foreground">
            <Trash2 aria-hidden="true" className="size-5" />
          </span>
          <AlertDialogTitle className="font-display text-xl font-bold">
            ¿Dejar de seguir este producto?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Dejarás de recibir avisos de <b className="text-foreground">{tracking.product.name}</b> y se borrarán sus
            alertas.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={remove.isPending}>Cancelar</AlertDialogCancel>
          <Button
            variant="destructive"
            disabled={remove.isPending}
            onClick={() =>
              remove.mutate(tracking.id, {
                onSuccess: () => {
                  onOpenChange(false)
                  onDeleted?.()
                },
              })
            }
          >
            {remove.isPending && <Loader2 aria-hidden="true" className="animate-spin" />}
            Dejar de seguir
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
