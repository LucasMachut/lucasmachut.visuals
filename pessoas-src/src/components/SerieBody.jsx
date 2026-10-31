// Page d'une série : hero, lede, scroll film, filmes YouTube, plaques, plein
// écran, série suivante. Un bloc dont le JSON est vide (lede, videos) n'apparaît
// pas. Rendu par Astro (pages/[serie].astro) et affiché tel quel dans l'admin.
import SerieFilm from './SerieFilm.jsx';
import SerieLightbox from './SerieLightbox.jsx';
import VideoFacade from './VideoFacade.jsx';
import { placeDate } from '../lib/serie-text.js';

export default function SerieBody({ s, next, p }) {
  const meta = [['location', p.meta.location, s.location], ['type', p.meta.type, s.type], ['year', p.meta.year, s.year]]
    .filter(([, , v]) => v);
  // Rythme des plaques : une grande, puis deux côte à côte, et on recommence
  const groups = [];
  for (let i = 0; i < s.photos.length;) {
    const size = groups.length % 2 === 0 ? 1 : 2;
    groups.push(s.photos.slice(i, i + size).map((ph, k) => ({ ...ph, index: i + k })));
    i += size;
  }
  const filmPoster = (s.photos[Math.floor(s.photos.length / 2)] || {}).src || s.hero;

  return (
    <>
      <section className="sh" data-edit="hero">
        <img className="sh-img" src={s.hero} alt={s.title} decoding="async" fetchpriority="high" />
        <div className="sh-content">
          {s.eyebrow && <div className="clip"><p className="heroLine sh-eyebrow">{s.eyebrow}</p></div>}
          <h1 className="sh-title t-title"><span className="clip"><span className="heroLine">{s.title}</span></span></h1>
          <div className="heroFade sh-rule" />
          {s.location && <p className="heroFade sh-sub">{s.location}</p>}
        </div>
        {placeDate(s) && <div className="heroFade sh-vertical">{placeDate(s)}</div>}
      </section>
      <div className="sh-cover" data-covers-hero>
        <section className="sl tb-wrap">
          <div className="clip"><p className="eyebrow"><i />{s.lede ? p.lede_eyebrow : s.title}</p></div>
          <div className="sl-grid">
            <dl className="sl-meta">
              {meta.map(([key, k, v]) => (<div key={key}><dt>{k}</dt><dd data-edit={key}>{v}</dd></div>))}
            </dl>
            {s.lede && <p className="sl-lede" data-edit="lede">{s.lede}</p>}
          </div>
        </section>
        <SerieFilm film={s.film} poster={filmPoster} eyebrow={p.film_eyebrow} />
        {s.videos.length > 0 && (
          <section className="sv tb-wrap" aria-label={p.videos_eyebrow} data-edit="videos">
            <p className="eyebrow"><i />{p.videos_eyebrow}</p>
            <div className="sv-row">
              {s.videos.map((v, i) => <VideoFacade key={v.id + i} {...v} />)}
            </div>
          </section>
        )}
        <section className="sp tb-wrap" aria-label={p.photos_eyebrow}>
          <p className="eyebrow"><i />{p.photos_eyebrow} · {s.photos.length}</p>
          {groups.map((g, gi) => (
            <div key={gi} className={g.length === 1 ? `sp-one ${gi % 4 === 2 ? 'sp-one--right' : ''}` : 'sp-two'}>
              {g.map((ph) => (
                <button key={ph.index} className="plate sp-plate" data-lb={ph.index} data-edit={`photos.${ph.index}`}
                  aria-label={`${s.title}, foto ${ph.index + 1}`}>
                  <span className="plate-line" />
                  <span className="plate-clip"><img data-drift src={ph.src} alt={ph.alt} width={ph.w} height={ph.h} loading="lazy" decoding="async" /></span>
                </button>
              ))}
            </div>
          ))}
        </section>
        {next && (
          <section className="sn tb-wrap">
            <a href={`/${next.slug}`} className="sn-next">
              <span className="eyebrow"><i />{p.next}</span>
              <span className="sn-row">
                <span className="sn-title t-title">{next.title} <span aria-hidden="true">→</span></span>
                <span className="plate sn-plate"><span className="plate-clip"><img data-drift src={next.cover} alt="" loading="lazy" /></span></span>
              </span>
            </a>
            <a href="/portfolio" className="u-link sn-back">← {p.back}</a>
          </section>
        )}
      </div>
      <SerieLightbox photos={s.photos} labels={{ dialog: s.title, close: 'Fechar', prev: 'Foto anterior', next: 'Próxima foto' }} />
    </>
  );
}
