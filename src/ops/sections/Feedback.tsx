import { useEffect, useState } from 'react'
import { RefreshCw, Bug, Lightbulb, HelpCircle, MessageSquare } from 'lucide-react'
import {
  listFeedback,
  setFeedbackStatus,
  isBackendConnected,
  type FeedbackRow,
} from '../../supabase'
import { relativeTime } from '../../lib/stats'

const CAT_META: Record<string, { label: string; icon: typeof Bug }> = {
  bug: { label: 'Bug', icon: Bug },
  idea: { label: 'Idea', icon: Lightbulb },
  confusing: { label: 'Confusing', icon: HelpCircle },
  other: { label: 'Other', icon: MessageSquare },
}

const STATUS_NEXT: Record<string, { label: string; next: string }> = {
  new: { label: 'Mark triaged', next: 'triaged' },
  triaged: { label: 'Mark resolved', next: 'resolved' },
  resolved: { label: 'Reopen', next: 'new' },
}

/** Beta tester feedback, read from the Supabase `feedback` table. Operators can
 *  walk each item through new → triaged → resolved. */
export default function Feedback() {
  const [items, setItems] = useState<FeedbackRow[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'new' | 'triaged' | 'resolved'>('all')
  const now = Date.now()

  const load = () => {
    setLoading(true)
    listFeedback().then((f) => {
      setItems(f)
      setLoading(false)
    })
  }
  useEffect(load, [])

  async function advance(row: FeedbackRow) {
    const next = STATUS_NEXT[row.status]?.next ?? 'triaged'
    setBusy(row.id)
    const ok = await setFeedbackStatus(row.id, next)
    setBusy(null)
    if (ok) setItems((prev) => prev.map((r) => (r.id === row.id ? { ...r, status: next } : r)))
  }

  const shown = filter === 'all' ? items : items.filter((r) => r.status === filter)
  const counts = {
    all: items.length,
    new: items.filter((r) => r.status === 'new').length,
    triaged: items.filter((r) => r.status === 'triaged').length,
    resolved: items.filter((r) => r.status === 'resolved').length,
  }

  return (
    <div className="ops-admin ops-feedback">
      <div className="ops-admin-bar">
        <div className="ops-fb-filters">
          {(['all', 'new', 'triaged', 'resolved'] as const).map((f) => (
            <button
              key={f}
              className={`ops-fb-fchip ${filter === f ? 'is-active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f[0].toUpperCase() + f.slice(1)} <span className="ops-admin-dim">{counts[f]}</span>
            </button>
          ))}
        </div>
        <button className="ops-admin-btn" onClick={load} disabled={loading}>
          <RefreshCw className={`size-4 ${loading ? 'ops-spin' : ''}`} /> Refresh
        </button>
      </div>

      {shown.length === 0 ? (
        <p className="ops-admin-empty">
          {loading
            ? 'Loading feedback…'
            : !isBackendConnected
              ? 'Backend not connected.'
              : items.length === 0
                ? 'No feedback yet. Testers submit it from the in-app widget (staging builds).'
                : 'Nothing in this filter.'}
        </p>
      ) : (
        <ul className="ops-fb-list">
          {shown.map((r) => {
            const meta = CAT_META[r.category ?? 'other'] ?? CAT_META.other
            const Icon = meta.icon
            return (
              <li key={r.id} className={`ops-fb-item ops-fb-${r.status}`}>
                <div className="ops-fb-top">
                  <span className="ops-fb-cat">
                    <Icon className="size-3.5" /> {meta.label}
                  </span>
                  <span className={`ops-fb-badge ops-fb-badge-${r.status}`}>{r.status}</span>
                  <span className="ops-admin-dim ops-fb-time">
                    {relativeTime(new Date(r.createdAt).getTime(), now)}
                  </span>
                </div>
                <p className="ops-fb-msg">{r.message}</p>
                <div className="ops-fb-meta">
                  {r.page && <span>{r.page}</span>}
                  {r.appEnv && <span className="ops-admin-dim">{r.appEnv}</span>}
                  {r.viewport && <span className="ops-admin-dim">{r.viewport}</span>}
                  {r.userAgent && (
                    <span className="ops-admin-dim ops-fb-ua" title={r.userAgent}>
                      {r.userAgent.slice(0, 40)}…
                    </span>
                  )}
                </div>
                <div className="ops-fb-actions">
                  <button
                    className="ops-admin-btn"
                    onClick={() => advance(r)}
                    disabled={busy === r.id}
                  >
                    {STATUS_NEXT[r.status]?.label ?? 'Mark triaged'}
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
