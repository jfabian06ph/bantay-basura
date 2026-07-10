import { TriangleAlert, ThumbsDown } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from './ui/dialog'
import { Button } from './ui/button'
import { CATEGORY_LABELS, CATEGORY_EMOJI, type Report } from '../types'

function ago(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const d = Math.floor(diff / 86_400_000)
  if (d > 0) return `${d} day${d > 1 ? 's' : ''} ago`
  const h = Math.floor(diff / 3_600_000)
  if (h > 0) return `${h} hour${h > 1 ? 's' : ''} ago`
  const m = Math.max(1, Math.floor(diff / 60_000))
  return `${m} min${m > 1 ? 's' : ''} ago`
}

interface Props {
  report: Report | null
  onStillHere: () => void
  onClose: () => void
}

export default function DuplicateModal({ report, onStillHere, onClose }: Props) {
  return (
    <Dialog open={report !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <div className="mx-auto mb-1 grid size-12 place-items-center rounded-full bg-amber-400/15 text-amber-300">
            <TriangleAlert className="size-6" />
          </div>
          <DialogTitle>Already flagged here</DialogTitle>
          <DialogDescription>
            {report && (
              <>
                A {CATEGORY_EMOJI[report.category]}{' '}
                <b className="text-foreground">{CATEGORY_LABELS[report.category]}</b>{' '}
                report was already made on this spot {ago(report.createdAt)}. Instead
                of a duplicate, confirm it's still there. That helps prioritize
                clean-up more than a new pin.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button onClick={onStillHere}>
            <ThumbsDown /> Yes, it's still here
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
