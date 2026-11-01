// Galerie horizontale Koisei (#gallery) avec mes 4 offres. Sur ordinateur la
// section s'épingle et la piste glisse ; la carte au centre remplit son numéro.
// (Koisei agrandit la photo à 1.15 pour la faire dériver : retiré, la photo
// garde le cadrage choisi dans l'admin, sans rien rogner de plus.) Sur téléphone la piste se glisse au doigt et la barre
// et le compteur suivent ce glissement (mode mobile de Koisei).
import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Segments, Arrow } from './Segments.jsx';
import { pinPriority, scheduleRefresh } from './scroll.js';
import Pic from './Pic.jsx';

const pad = (n) => String(n).padStart(2, '0');

export default function Oferta({ data }) {
  const root = useRef(null);
  const n = data.cards.length;

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const sec = root.current;
    const track = sec.querySelector('.galTrack');
    const barEl = sec.querySelector('.galBar'), countEl = sec.querySelector('.galCount');
    const cards = [...sec.querySelectorAll('.galCard')];
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isMobile = matchMedia('(max-width: 767px)').matches;

    const paint = (p) => {
      barEl.style.transform = `scaleX(${p})`;
      countEl.textContent = `${pad(Math.min(n, 1 + Math.floor(p * n)))} · ${pad(n)}`;
      cards.forEach((card) => {
        const r = card.getBoundingClientRect(), c = r.left + r.width / 2;
        const near = Math.abs(c - innerWidth / 2) < r.width / 2;
        card.querySelector('.galNum').style.color = near ? 'var(--terra)' : 'transparent';
      });
    };

    if (reduced || isMobile) {
      track.classList.add('is-swipe');
      const onSwipe = () => {
        const max = track.scrollWidth - track.clientWidth;
        paint(max > 0 ? track.scrollLeft / max : 0);
      };
      track.addEventListener('scroll', onSwipe, { passive: true });
      onSwipe();
      return () => track.removeEventListener('scroll', onSwipe);
    }

    const getDist = () => track.scrollWidth - innerWidth + 48;
    const tw = gsap.to(track, { x: () => -getDist(), ease: 'none',
      scrollTrigger: { trigger: sec, start: 'top top', end: '+=250%', pin: true, anticipatePin: 1, scrub: 1, invalidateOnRefresh: true, refreshPriority: pinPriority(sec),
        onUpdate: (s) => paint(s.progress) } });
    paint(0);
    scheduleRefresh();
    return () => { tw.scrollTrigger && tw.scrollTrigger.kill(); tw.kill(); };
  }, []);

  return (
    <div className="pin-wrap">
    {/* Enveloppe : l'épinglage glisse la section dans un conteneur ; sans elle, React
        ne la retrouve plus à sa place quand l'admin la remplace, et tout l'écran tombe. */}
      <section id="oferta" ref={root} className="gallery" data-pin>
        <div className="gallery-inner">
          <div className="gallery-head">
            <div>
              <p className="eyebrow gallery-eyebrow" data-edit="oferta.eyebrow"><i />{data.eyebrow}</p>
              <h2 className="gallery-title t-title" data-edit="oferta.title"><Segments parts={data.title} /></h2>
            </div>
            <span className="gallery-hint" data-edit="oferta.hint">{data.hint}</span>
          </div>
          <div className="galTrack">
            {data.cards.map((c, i) => (
              <article className="galCard" key={i}>
                <span className="galNum">{pad(i + 1)}</span>
                <div className="galFrame" data-edit={`oferta.cards.${i}.photo`}>
                  <div className="galLine" />
                  <div className="galClip">
                    <Pic className="galImg" src={c.photo} mobile={c.photo_mobile} alt={c.title}
                      style={c.crop ? { objectPosition: `${c.crop.x * 100}% ${c.crop.y * 100}%` } : undefined} />
                  </div>
                </div>
                <h3 className="galCard-title t-title" data-edit={`oferta.cards.${i}.title`}>{c.title}</h3>
                <p className="galCard-text" data-edit={`oferta.cards.${i}.text`}>{c.text}</p>
                <a href={c.link.href} className="u-link galCard-link" data-edit={`oferta.cards.${i}.link.label`}>{c.link.label} <Arrow size={14} /></a>
              </article>
            ))}
          </div>
          <div className="gallery-progress">
            <div className="gallery-track"><div className="galBar" /></div>
            <span className="galCount">{`01 · ${pad(n)}`}</span>
          </div>
        </div>
      </section>
    </div>
  );
}
