// Pied de page Koisei (#visit) : grand titre + disque aimanté (Begin disc),
// colonnes de liens, mot vertical, nom géant qui monte quand le pied de page
// atteint 30 % de l'écran, barre du bas.
import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Lines, Arrow } from './Segments.jsx';

export default function Fim({ data }) {
  const root = useRef(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const sec = root.current;
    const word = sec.querySelector('.wordmark'), mag = sec.querySelector('.disc');
    const isMobile = matchMedia('(max-width: 767px)').matches;
    // Koisei : innerWidth / 3.95 pour KOISEI (6 lettres). LUCAS MACHUT en a 12 et
    // Special Elite chasse large : on mesure le mot et on le cale sur la largeur.
    const fit = () => {
      word.style.fontSize = '100px';
      const w = word.scrollWidth || 1;
      word.style.fontSize = Math.max(32, (innerWidth - 16) / w * 100) + 'px';
    };
    fit();
    if (document.fonts) document.fonts.ready.then(fit);
    addEventListener('resize', fit);
    const tw = gsap.to(word, { y: 0, duration: 1.3, ease: 'power4.out',
      scrollTrigger: { trigger: sec, start: 'top 30%', toggleActions: 'play none none reverse' } });

    let onMove = null, onLeave = null;
    if (!isMobile) {
      onMove = (e) => {
        const r = mag.getBoundingClientRect();
        gsap.to(mag, { x: (e.clientX - r.left - r.width / 2) * .3, y: (e.clientY - r.top - r.height / 2) * .3, duration: .4 });
      };
      onLeave = () => gsap.to(mag, { x: 0, y: 0, duration: .8, ease: 'elastic.out(1,0.4)' });
      mag.addEventListener('mousemove', onMove);
      mag.addEventListener('mouseleave', onLeave);
    }
    return () => {
      removeEventListener('resize', fit);
      tw.scrollTrigger && tw.scrollTrigger.kill(); tw.kill();
      if (onMove) { mag.removeEventListener('mousemove', onMove); mag.removeEventListener('mouseleave', onLeave); }
    };
  }, []);

  return (
    <footer id="visit" ref={root} className="fim">
      <div className="fim-inner">
        <p className="eyebrow fim-eyebrow"><i />{data.eyebrow}</p>
        <div className="fim-call">
          <h2 className="fim-title t-title"><Lines lines={data.lines} lineClass="fim-line" /></h2>
          <a href={data.disc.href} className="disc">
            <span>{data.disc.label}</span>
            <Arrow size={18} />
          </a>
        </div>
        <div className="fim-cols">
          {data.columns.map((col) => (
            <div className="fim-col" key={col.head}>
              <span className="fim-head">{col.head}</span>
              {col.links.map((l) => (
                <a key={l.href} href={l.href} className="u-link"
                  {...(l.href.startsWith('http') ? { target: '_blank', rel: 'noopener' } : {})}>{l.label}</a>
              ))}
            </div>
          ))}
          <div className="fim-vertical"><span>{data.vertical}</span></div>
        </div>
      </div>
      <div className="wordmark-clip">
        <div className="wordmark">{data.wordmark}</div>
      </div>
      <div className="fim-bar">
        <div><span>{data.bar_left}</span><span>{data.bar_right}</span></div>
      </div>
    </footer>
  );
}
