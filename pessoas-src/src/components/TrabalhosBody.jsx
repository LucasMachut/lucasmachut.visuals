// Trabalhos : une carte plate frame par série. Rendu en HTML par Astro
// (pages/portfolio.astro) et affiché tel quel dans l'admin.
// t = data/pessoas/trabalhos.json ; series = les séries à montrer, dans l'ordre
// (dans l'admin, les séries masquées arrivent avec hidden: true).
import { RichLines } from './Segments.jsx';
import { metaLine } from '../lib/serie-text.js';

// base : préfixe de langue des liens ('' en portugais, '/fr'…).
export default function TrabalhosBody({ t, series, base = '' }) {
  return (
    <>
      <section className="tb-open">
        <div className="tb-wrap tb-open-grid">
          <div>
            <div className="clip"><p className="eyebrow heroLine" data-edit="eyebrow"><i />{t.eyebrow}</p></div>
            <RichLines lines={t.title} tag="h1" className="tb-h1" edit="title" />
          </div>
          <p className="tb-lede heroFade" data-edit="lede">{t.lede}</p>
        </div>
      </section>
      <section className="tb-grid tb-wrap" aria-label={t.eyebrow}>
        {series.map((s, i) => (
          <article key={s.slug} className={`tb-card${s.hidden ? ' adm-hidden' : ''}`} data-num-card
            data-hidden-label={s.hidden ? 'Masquée, pas publiée' : undefined}>
            <a href={`${base}/${s.slug}`} className="tb-card-link" data-edit={`card:${s.slug}`}>
              <span className="tb-num" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
              <div className="plate tb-card-plate">
                <span className="plate-line" />
                <span className="plate-clip"><img data-drift src={s.cover} alt={s.title} loading={i < 2 ? 'eager' : 'lazy'} decoding="async" /></span>
              </div>
              <h2 className="tb-card-title t-title">{s.title}</h2>
              {metaLine(s) && <p className="tb-card-meta">{metaLine(s)}</p>}
              <span className="u-link tb-more">{t.card_link} <span aria-hidden="true">→</span></span>
            </a>
          </article>
        ))}
      </section>
      <section className="tb-contact">
        <div className="tb-wrap">
          <RichLines lines={t.contact.title} className="tb-contact-title" edit="contact.title" />
          <p className="tb-contact-text" data-edit="contact.text">{t.contact.text}</p>
          <a href={t.contact.button.href} className="tb-disc" data-edit="contact.button.label">{t.contact.button.label}</a>
        </div>
      </section>
    </>
  );
}
