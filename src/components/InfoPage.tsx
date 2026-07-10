import Footer from './Footer'

interface Props {
  eyebrow: string
  title: string
  intro: string
  points: { title: string; body: string }[]
  onClose: () => void
  onNavigate: (view: string) => void
}

/** A light, editorial "coming soon" page for not-yet-built sections. */
export default function InfoPage({
  eyebrow,
  title,
  intro,
  points,
  onNavigate,
}: Props) {
  return (
    <div className="bb-about">
      <div className="bb-page">
      <section className="bb-about-hero">
        <div className="bb-trust-eyebrow" style={{ color: '#8a847c' }}>
          {eyebrow}
        </div>
        <h1 className="bb-about-title" style={{ fontSize: 'clamp(40px, 11vw, 72px)' }}>
          {title}
        </h1>
        <p className="bb-about-lede">{intro}</p>
        <span
          className="bb-beta"
          style={{ display: 'inline-block', marginTop: 20 }}
        >
          Coming soon
        </span>
      </section>

      <section className="bb-about-steps">
        <h2 className="bb-about-h2">What this page will show</h2>
        {points.map((p) => (
          <div className="bb-about-step" key={p.title}>
            <span className="bb-about-step-n">›</span>
            <div>
              <h3 className="bb-about-step-title">{p.title}</h3>
              <p className="bb-about-step-body">{p.body}</p>
            </div>
          </div>
        ))}
      </section>

      </div>

      <Footer onNavigate={onNavigate} />
    </div>
  )
}
