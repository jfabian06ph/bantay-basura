interface Props {
  onNavigate: (view: string) => void
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
      { label: 'Contact' },
    ],
  },
  {
    title: 'Legal',
    links: [{ label: 'Privacy' }, { label: 'Terms' }],
  },
]

const PARTNERS = ['🏛️ DENR', '🏛️ DILG', '🏛️ LGUs', '🌱 NGOs', '👥 Volunteers']

export default function Footer({ onNavigate }: Props) {
  return (
    <footer className="bb-footer">
      <div className="bb-page">
      <div className="bb-footer-top">
        <div className="bb-footer-brand">
          <div className="bb-footer-logo">
            <img src="/logo-mark.svg" alt="" />
            <span>Bantay Basura</span>
          </div>
          <p className="bb-footer-blurb">
            Community-led waste reporting for cleaner Philippine communities.
          </p>
          <p className="bb-footer-tag">Tingnan. I-flag. Linisin.</p>
        </div>

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
      </div>

      <div className="bb-footer-partners">
        <span className="bb-footer-partners-label">Future partners</span>
        <div className="bb-footer-partners-list">
          {PARTNERS.map((p) => (
            <span key={p}>{p}</span>
          ))}
        </div>
      </div>

      <div className="bb-footer-bottom">
        <span>© 2026 Bantay Basura</span>
        <span className="bb-footer-values">
          Community-led · Privacy-first · Open data
        </span>
      </div>
      </div>
    </footer>
  )
}
