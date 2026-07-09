import ReportSheet from './ReportSheet'
import LocationMismatchModal, { type Mismatch } from './LocationMismatchModal'
import DuplicateModal from './DuplicateModal'
import Celebration from './Celebration'
import type { LatLng, Report } from '../types'

type Draft = Omit<Report, 'id' | 'status' | 'stillHere' | 'cleared' | 'createdAt'>

interface Props {
  sheetOpen: boolean
  onSheetOpenChange: (open: boolean) => void
  onSubmit: (draft: Draft) => void
  pendingCoords: LatLng | null
  pendingDetected: boolean
  onAdjustLocation: () => void

  mismatch: Mismatch | null
  onMismatchUseCurrent: () => void
  onMismatchKeepChosen: () => void
  onMismatchCancel: () => void

  duplicate: Report | null
  onDuplicateStillHere: () => void
  onDuplicateClose: () => void

  celebrateMsg: string | null
  onCelebrationDone: () => void
}

/** All of the report-flow modals and toasts, in one place. */
export default function MapDialogs({
  sheetOpen,
  onSheetOpenChange,
  onSubmit,
  pendingCoords,
  pendingDetected,
  onAdjustLocation,
  mismatch,
  onMismatchUseCurrent,
  onMismatchKeepChosen,
  onMismatchCancel,
  duplicate,
  onDuplicateStillHere,
  onDuplicateClose,
  celebrateMsg,
  onCelebrationDone,
}: Props) {
  return (
    <>
      <ReportSheet
        open={sheetOpen}
        onOpenChange={onSheetOpenChange}
        onSubmit={onSubmit}
        coords={pendingCoords}
        detected={pendingDetected}
        onAdjustLocation={onAdjustLocation}
      />

      <LocationMismatchModal
        mismatch={mismatch}
        onUseCurrent={onMismatchUseCurrent}
        onKeepChosen={onMismatchKeepChosen}
        onCancel={onMismatchCancel}
      />

      <DuplicateModal
        report={duplicate}
        onStillHere={onDuplicateStillHere}
        onClose={onDuplicateClose}
      />

      {celebrateMsg && (
        <Celebration message={celebrateMsg} onDone={onCelebrationDone} />
      )}
    </>
  )
}
