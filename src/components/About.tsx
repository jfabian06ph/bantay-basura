import Footer from './Footer'

interface Props {
  onClose: () => void
  activeCount: number
  onNavigate: (view: string) => void
}

const STEPS = [
  {
    n: '01',
    title: 'Tingnan',
    body: 'May nakita kang nakakalat na basura? Buksan ang app — awtomatikong makukuha ang lokasyon mo.',
  },
  {
    n: '02',
    title: 'I-flag',
    body: 'Kumuha ng larawan, piliin ang uri at gaano kalala. Isang tap lang, nakalagay na sa mapa.',
  },
  {
    n: '03',
    title: 'Linisin',
    body: 'Makikita ng lahat — at ng LGU — kung saan ang problema. Kapag nalinis na, i-tap ang “Nalinis na”.',
  },
]

/** Minimal, editorial About page — airy, quiet, whitespace-forward. */
export default function About({ onClose, activeCount, onNavigate }: Props) {
  return (
    <div className="bb-about">
      <div className="bb-page">
      <section className="bb-about-hero">
        <h1 className="bb-about-title">
          Tingnan.
          <br />
          I-report.
          <br />
          <span className="bb-about-accent">Linisin.</span>
        </h1>
        <p className="bb-about-lede">
          Hindi lahat ng problema ay kailangang lutasin mag-isa. Minsan,
          kailangan lang muna itong <strong>makita</strong>.
        </p>
      </section>

      <section className="bb-about-block">
        <p className="bb-about-para">Mahilig akong mag-travel.</p>
        <p className="bb-about-para">
          Sa bawat biyahe, napapansin ko kung gaano kaiba ang kuwento ng bawat
          lugar. May mga komunidad na malinis at maayos. Meron ding mga lugar na
          may mga basurang <em>tila matagal nang hindi napapansin</em>.
        </p>
        <p className="bb-about-para">
          Hindi ito tungkol sa paghusga sa isang bayan o lungsod. Bagkus,
          ipinapaalala nito na ang kalinisan ay{' '}
          <strong>responsibilidad nating lahat</strong>.
        </p>
        <p className="bb-about-para">
          Bilang isang software developer, gusto kong gamitin ang aking
          kakayahan hindi lamang para sa mga komersyal na proyekto, kundi para
          rin sa mga proyektong may tunay na pakinabang sa komunidad.
        </p>
        <p className="bb-about-para">
          Mula sa simpleng obserbasyong iyon isinilang ang{' '}
          <strong>Bantay Basura</strong> — isang community-powered platform na
          nagbibigay sa bawat mamamayan ng kakayahang mag-report ng mga waste
          hotspot, makita ang progreso ng paglilinis, at makatulong sa pagbuo ng
          mas malinis na Pilipinas.
        </p>
      </section>

      <section className="bb-about-steps">
        <h2 className="bb-about-h2">Paano ito gumagana</h2>
        {STEPS.map((s) => (
          <div className="bb-about-step" key={s.n}>
            <span className="bb-about-step-n">{s.n}</span>
            <div>
              <h3 className="bb-about-step-title">{s.title}</h3>
              <p className="bb-about-step-body">{s.body}</p>
            </div>
          </div>
        ))}
      </section>

      <section className="bb-about-stat">
        <div className="bb-about-stat-num">{activeCount}</div>
        <div className="bb-about-stat-label">aktibong flag ngayon</div>
      </section>

      <section className="bb-about-cta">
        <button className="bb-about-cta-btn" onClick={onClose}>
          Simulan ang pag-flag →
        </button>
      </section>
      </div>

      <Footer onNavigate={onNavigate} />
    </div>
  )
}
