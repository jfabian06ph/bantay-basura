import Footer from './Footer'

interface Props {
  onNavigate: (view: string) => void
}

/**
 * Privacy page — plain-language, honest about the little we collect. Reuses the
 * About page's editorial classes so it matches the rest of the site.
 */
export default function Privacy({ onNavigate }: Props) {
  return (
    <div className="bb-about">
      <div className="bb-page">
        <section className="bb-about-hero">
          <div className="bb-about-manifesto-label">Privacy</div>
          <h1 className="bb-about-title">Privacy, by default.</h1>
          <p className="bb-about-lede">
            Bantay Basura is public infrastructure, not a social network. You can use it without an
            account, and we collect as little as possible.
          </p>
        </section>

        <section className="bb-about-block">
          <h2 className="bb-about-h2">What we collect</h2>
          <p className="bb-about-para">
            <strong>Reports.</strong> When you submit a report we store the pinned location, the
            category, any description you write, the photos you attach, and timestamps. We do
            <strong> not</strong> attach your name, email, or an account &mdash; reports are anonymous.
          </p>
          <p className="bb-about-para">
            <strong>Location.</strong> If you tap &ldquo;locate me,&rdquo; your browser shares your
            device location with your permission, used only to centre the map or place a pin. We
            don&rsquo;t store it beyond the report you choose to submit.
          </p>
          <p className="bb-about-para">
            <strong>Feedback.</strong> If you send feedback, we store your message plus the page you
            were on and basic device/browser info, so we can reproduce issues. No identity attached.
          </p>
          <p className="bb-about-para">
            <strong>Usage analytics.</strong> We use privacy-friendly, aggregate analytics (no
            cookies, no personal profiles) to understand which pages are used and what&rsquo;s slow.
          </p>
        </section>

        <section className="bb-about-block">
          <h2 className="bb-about-h2">What we don&rsquo;t do</h2>
          <p className="bb-about-para">
            No accounts required, no advertising trackers, no selling of data. We don&rsquo;t build
            profiles of individuals &mdash; the value is in the community agreeing on what&rsquo;s
            real, not in who reported it.
          </p>
        </section>

        <section className="bb-about-block">
          <h2 className="bb-about-h2">Photos &amp; public reports</h2>
          <p className="bb-about-para">
            Reports and their photos appear publicly on the map &mdash; that&rsquo;s the point, to
            make waste visible so it can be cleaned up. Please don&rsquo;t upload sensitive or
            personal content, or photos that identify specific people. Uploaded photos are being
            moved behind an automated moderation check before they appear publicly.
          </p>
        </section>

        <section className="bb-about-block">
          <h2 className="bb-about-h2">Removing your data</h2>
          <p className="bb-about-para">
            Want a report or photo taken down? Email{' '}
            <a href="mailto:hello@bantaybasura.ph?subject=Data%20removal%20request">
              hello@bantaybasura.ph
            </a>{' '}
            with a link or description and we&rsquo;ll remove it.
          </p>
        </section>

        <section className="bb-about-block">
          <h2 className="bb-about-h2">Changes &amp; contact</h2>
          <p className="bb-about-para">
            Bantay Basura is in beta, so this page will evolve as the product does. Questions about
            privacy? Email{' '}
            <a href="mailto:hello@bantaybasura.ph?subject=Privacy%20question">
              hello@bantaybasura.ph
            </a>
            .
          </p>
          <p className="bb-about-para" style={{ color: '#8a847c', fontSize: '13px' }}>
            Last updated: July 2026
          </p>
        </section>
      </div>
      <Footer onNavigate={onNavigate} />
    </div>
  )
}
