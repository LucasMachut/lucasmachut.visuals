// Scroll film Koisei (setupFilm de l'Overview) : la section est épinglée, le
// défilement fait avancer la vidéo, la barre et le minutage suivent.
// Tant que film.video est vide, l'emplacement montre une photo fixe et le
// libellé « Filme em breve », sans épinglage.
import { useEffect, useRef } from 'react';

const mmss = (t) => `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(Math.floor(t % 60)).padStart(2, '0')}`;

export default function SerieFilm({ film, poster, eyebrow }) {
  const sec = useRef(null), vid = useRef(null), bar = useRef(null), time = useRef(null);

  useEffect(() => {
    if (!film.video || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let alive = true, raf, st, target = 0, cur = 0;
    (async () => {
      const { default: gsap } = await import('gsap');
      const { ScrollTrigger } = await import('gsap/ScrollTrigger');
      if (!alive) return;
      gsap.registerPlugin(ScrollTrigger);
      const mobile = innerWidth < 768;
      st = ScrollTrigger.create({
        trigger: sec.current, start: 'top top', end: mobile ? '+=250%' : '+=400%', pin: true, scrub: 1,
        onUpdate: (s) => { target = s.progress; },
      });
      const loop = () => {
        cur += (target - cur) * .1;
        const v = vid.current;
        if (v && v.duration) {
          const t = cur * v.duration;
          if (Math.abs(v.currentTime - t) > .02) v.currentTime = t;
          bar.current.style.transform = `scaleX(${cur})`;
          time.current.textContent = `${mmss(t)} / ${mmss(v.duration)}`;
        }
        raf = requestAnimationFrame(loop);
      };
      loop();
    })();
    return () => { alive = false; cancelAnimationFrame(raf); st && st.kill(); };
  }, [film.video]);

  return (
    <section ref={sec} className="sfilm" aria-label={eyebrow}>
      {film.video
        ? <video ref={vid} className="sfilm-media" src={film.video} poster={film.poster || poster} muted playsInline preload="auto" />
        : <img className="sfilm-media" src={film.poster || poster} alt="" loading="lazy" />}
      <div className="sfilm-chapter">
        <p className="sfilm-eyebrow">{eyebrow}</p>
        {!film.video && <h3 className="sfilm-title t-title">{film.label}</h3>}
      </div>
      {film.video && (
        <div className="sfilm-progress">
          <div className="sfilm-track"><div ref={bar} className="sfilm-bar" /></div>
          <span ref={time} className="sfilm-time">00:00 / 00:00</span>
        </div>
      )}
    </section>
  );
}
