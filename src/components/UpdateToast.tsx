import { useRegisterSW } from 'virtual:pwa-register/react'
import { RefreshCw, X } from 'lucide-react'
import './update-toast.css'

/**
 * "New version available" toast. When a new build's service worker is waiting,
 * `needRefresh` flips true; tapping Refresh activates it and reloads to the
 * fresh assets in one tap (no more "looks the same after refresh").
 */
export default function UpdateToast() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  if (!needRefresh) return null

  return (
    <div className="bb-update" role="status" aria-live="polite">
      <RefreshCw className="bb-update-ico size-4" />
      <span className="bb-update-text">New version available</span>
      <button className="bb-update-btn" onClick={() => updateServiceWorker(true)}>
        Refresh
      </button>
      <button
        className="bb-update-x"
        aria-label="Dismiss"
        onClick={() => setNeedRefresh(false)}
      >
        <X className="size-4" />
      </button>
    </div>
  )
}
