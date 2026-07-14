import { useEffect, useState } from 'react'
import { MessageSquarePlus, X, Check, Bug, Lightbulb, HelpCircle, MoreHorizontal } from 'lucide-react'
import { insertFeedback, isBackendConnected } from '../supabase'
import { APP_ENV, isBeta } from '../lib/env'
import './feedback.css'

const CATEGORIES = [
  { key: 'bug', label: 'Bug', icon: Bug },
  { key: 'idea', label: 'Idea', icon: Lightbulb },
  { key: 'confusing', label: 'Confusing', icon: HelpCircle },
  { key: 'other', label: 'Other', icon: MoreHorizontal },
]

/**
 * A floating "Send feedback" widget for the friends-beta. Only renders on
 * non-production builds (isBeta), so it never appears on the real launch.
 * Submits anonymously to the Supabase `feedback` table, auto-capturing the
 * page, app environment, device and viewport so QA reports are actionable.
 */
export default function FeedbackWidget() {
  const [open, setOpen] = useState(false)
  const [category, setCategory] = useState('bug')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  if (!isBeta) return null

  async function submit() {
    if (!message.trim() || sending) return
    setSending(true)
    const ok = await insertFeedback({
      message: message.trim(),
      category,
      page: window.location.pathname + window.location.hash,
      appEnv: APP_ENV,
      userAgent: navigator.userAgent,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
    })
    setSending(false)
    if (ok) {
      setSent(true)
      setMessage('')
      setTimeout(() => {
        setSent(false)
        setOpen(false)
      }, 1600)
    }
  }

  return (
    <div className="bb-fb">
      {open && (
        <div className="bb-fb-panel" role="dialog" aria-label="Send feedback">
          <div className="bb-fb-head">
            <span className="bb-fb-badge">Sandbox · {APP_ENV}</span>
            <button className="bb-fb-x" onClick={() => setOpen(false)} aria-label="Close">
              <X className="size-4" />
            </button>
          </div>

          {sent ? (
            <div className="bb-fb-done">
              <span className="bb-fb-done-ico">
                <Check className="size-6" />
              </span>
              <p>Thanks! 🙌</p>
              <span>Your feedback helps us build this.</span>
            </div>
          ) : (
            <>
              <h3 className="bb-fb-title">Send feedback</h3>
              {!isBackendConnected && (
                <p className="bb-fb-warn">Backend not connected — feedback can’t be saved here.</p>
              )}
              <div className="bb-fb-cats">
                {CATEGORIES.map((c) => {
                  const Icon = c.icon
                  return (
                    <button
                      key={c.key}
                      className={`bb-fb-cat ${category === c.key ? 'is-on' : ''}`}
                      onClick={() => setCategory(c.key)}
                    >
                      <Icon className="size-3.5" />
                      {c.label}
                    </button>
                  )
                })}
              </div>
              <textarea
                className="bb-fb-text"
                placeholder="What happened, or what would make this better?"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                autoFocus
              />
              <button
                className="bb-fb-send"
                onClick={submit}
                disabled={!message.trim() || sending || !isBackendConnected}
              >
                {sending ? 'Sending…' : 'Send feedback'}
              </button>
            </>
          )}
        </div>
      )}

      <button
        className={`bb-fb-fab ${open ? 'is-open' : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Close feedback' : 'Send feedback'}
      >
        {open ? <X className="size-5" /> : <MessageSquarePlus className="size-5" />}
        {!open && <span className="bb-fb-fab-label">Feedback</span>}
      </button>
    </div>
  )
}
