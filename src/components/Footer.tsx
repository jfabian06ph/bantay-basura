interface Props {
  onNavigate: (view: string) => void
  /** Hide the full-bleed "See what's happening near you" band (e.g. on pages
   *  that already end with their own strong closing CTA). */
  hideCta?: boolean
}

interface Link {
  label: string
  to?: string
}

const COLUMNS: { title: string; links: Link[] }[] = [
  {
    title: 'Learn',
    links: [
      { label: 'How Reports Work', to: 'how' },
      { label: 'Transparency', to: 'transparency' },
      { label: 'Open Data API' },
      { label: 'Resources' },
    ],
  },
  {
    title: 'Get Involved',
    links: [
      { label: 'Volunteer' },
      { label: 'Become a Partner', to: 'partners' },
      { label: 'Contact us' },
    ],
  },
  {
    title: 'Legal',
    links: [{ label: 'Privacy' }, { label: 'Terms' }],
  },
]

const PARTNERS = ['🏛️ DENR', '🏛️ DILG', '🏛️ LGUs', '🌱 NGOs', '👥 Volunteers']

export default function Footer({ onNavigate, hideCta }: Props) {
  return (
    <>
      {/* Full-bleed coastal CTA — closes out most pages (hidden where the page
          already ends with its own strong closing CTA). */}
      {!hideCta && (
        <section
          className="bb-dash-cta"
          style={{ backgroundImage: 'url(/zambales-coast.jpg)' }}
        >
          <div className="bb-dash-cta-inner">
            <h2 className="bb-dash-cta-title">See what's happening near you.</h2>
            <p className="bb-dash-cta-lede">
              Every report helps keep this page, and your community, improving.
            </p>
            <button className="bb-dash-cta-btn" onClick={() => onNavigate('map')}>
              Return to the live map →
            </button>
          </div>
        </section>
      )}

      <footer className="bb-footer">
      <div className="bb-page bb-footer-inner">
      <div className="bb-footer-top">
        <div className="bb-footer-brand">
          <div className="bb-footer-logo">
            <img src="/logo-mark.svg" alt="" />
            <span>Bantay Basura</span>
          </div>
          <p className="bb-footer-blurb">
            Community-led waste reporting for cleaner Philippine communities.
          </p>
          <p className="bb-footer-tag">Tingnan. I-report. Linisin.</p>
        </div>

        <div className="bb-footer-cols">
        {COLUMNS.map((col) => (
          <div className="bb-footer-col" key={col.title}>
            <h4>{col.title}</h4>
            {col.links.map((l) => (
              <button
                key={l.label}
                className="bb-footer-link"
                onClick={() => l.to && onNavigate(l.to)}
                title={l.to ? undefined : 'Coming soon'}
              >
                {l.label}
              </button>
            ))}
          </div>
        ))}

        <div className="bb-footer-col">
          <h4>Future Partners</h4>
          <div className="bb-footer-partners-list">
            {PARTNERS.map((p) => (
              <span key={p}>{p}</span>
            ))}
          </div>
        </div>
        </div>
      </div>
      </div>

      <div className="bb-footer-rule" />

      <div className="bb-page bb-footer-inner">
      <div className="bb-footer-bottom">
        <span>© 2026 Bantay Basura</span>
        <span className="bb-footer-made">
          Built by volunteers. Powered by communities.
          <span className="bb-footer-heart" aria-hidden>❤️</span>
        </span>
        <span className="bb-footer-values">
          Community-led · Privacy-first · Open data
        </span>
      </div>
      </div>
    </footer>
    </>
  )
}
