// Pied de page (#visit) : à gauche l'invitation (surtitre, titre, pilule fine
// comme celle de la nav), à droite les colonnes de liens, puis le logo qui monte
// quand le pied de page atteint 30 % de l'écran, et la barre du bas.
import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Lines, Arrow } from './Segments.jsx';

export default function Fim({ data }) {
  const root = useRef(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const sec = root.current;
    const tw = gsap.to(sec.querySelector('.wordmark'), { y: 0, duration: 1.3, ease: 'power4.out',
      scrollTrigger: { trigger: sec, start: 'top 30%', toggleActions: 'play none none reverse' } });
    return () => { tw.scrollTrigger && tw.scrollTrigger.kill(); tw.kill(); };
  }, []);

  return (
    <footer id="visit" ref={root} className="fim">
      <div className="fim-inner">
        <div className="fim-call">
          <p className="eyebrow fim-eyebrow" data-edit="fim.eyebrow"><i />{data.eyebrow}</p>
          <h2 className="fim-title t-title"><Lines lines={data.lines} lineClass="fim-line" edit="fim.lines" /></h2>
          <a href={data.disc.href} className="fim-pill">
            <span data-edit="fim.disc.label">{data.disc.label}</span>
            <Arrow size={16} />
          </a>
        </div>
        <div className="fim-cols">
          {data.columns.map((col, ci) => (
            <div className="fim-col" key={ci}>
              <span className="fim-head" data-edit={`fim.columns.${ci}.head`}>{col.head}</span>
              {col.links.map((l, li) => (
                <a key={li} href={l.href} className="u-link" data-edit={`fim.columns.${ci}.links.${li}.label`}
                  {...(l.href.startsWith('http') ? { target: '_blank', rel: 'noopener' } : {})}>{l.label}</a>
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="wordmark-clip">
        <div className="wordmark"><img src={data.logo} alt={data.wordmark} loading="lazy" decoding="async" /></div>
      </div>
      <div className="fim-bar">
        <div><span data-edit="fim.bar_left">{data.bar_left}</span><span data-edit="fim.bar_right">{data.bar_right}</span></div>
      </div>
    </footer>
  );
}
