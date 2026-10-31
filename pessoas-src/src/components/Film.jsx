// Scroll film Koisei (#film1, #film2) : la section s'épingle, le défilement fait
// avancer la vidéo (lissée à 10 % par image), les chapitres entrent et sortent sur
// une timeline de 100 unités. Sans vidéo (pas encore choisie), la photo d'attente
// tient la place et la barre suit le défilement.
import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Segments } from './Segments.jsx';
import { pinPriority, scheduleRefresh } from './scroll.js';

const ROMAN = ['Ⅰ', 'Ⅱ', 'Ⅲ', 'Ⅳ'];
const pad = (n) => String(Math.floor(n)).padStart(2, '0');

export default function Film({ id, data, variant = 'dia' }) {
  const root = useRef(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const sec = root.current;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isMobile = matchMedia('(max-width: 767px)').matches;
    const video = sec.querySelector('.filmVid');
    const bar = sec.querySelector('.filmBar'), time = sec.querySelector('.filmTime');
    const ch = sec.querySelectorAll('.chapter'), roms = sec.querySelectorAll('.romNum');
    const q = sec.querySelector('.quote'), dark = sec.querySelector('.filmDark');

    if (reduced) {
      gsap.set(ch[0], { autoAlpha: 1 });
      return undefined;
    }

    let target = 0, cur = 0;
    const pinLen = isMobile ? '250%' : variant === 'dia' ? '400%' : '350%';
    const tl = gsap.timeline({ scrollTrigger: { trigger: sec, start: 'top top', end: '+=' + pinLen, pin: true, scrub: 1, refreshPriority: pinPriority(sec),
      onUpdate: (s) => { target = s.progress; } } });

    if (variant === 'dia') {
      const spans = [[5, 30], [38, 63], [70, 95]];
      spans.forEach((sp, i) => {
        if (!ch[i]) return;
        tl.fromTo(ch[i], { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: 6 }, sp[0])
          .to(ch[i], { autoAlpha: 0, y: -40, duration: 5 }, sp[1] - 5)
          .to(roms[i], { color: '#B5623C', duration: 1 }, sp[0])
          .to(roms[i], { color: 'rgba(237,233,223,.5)', duration: 1 }, sp[1]);
      });
    } else {
      if (ch[0]) tl.fromTo(ch[0], { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: 8 }, 6).to(ch[0], { autoAlpha: 0, y: -40, duration: 6 }, 34);
      if (ch[1]) tl.fromTo(ch[1], { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: 8 }, 44).to(ch[1], { autoAlpha: 0, y: -40, duration: 6 }, 72);
      tl.to(dark, { opacity: .3, duration: 6 }, 82);
      if (q) tl.fromTo(q, { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 8 }, 85);
    }
    tl.to({}, { duration: 1 }, 100);

    const loop = () => {
      cur += (target - cur) * .1;
      bar.style.transform = `scaleX(${cur})`;
      if (video && video.duration) {
        const t = cur * video.duration;
        if (Math.abs(video.currentTime - t) > .02) video.currentTime = t;
        time.textContent = `00:${pad(t)} / 00:${pad(video.duration)}`;
      }
    };
    gsap.ticker.add(loop);
    scheduleRefresh();

    return () => {
      gsap.ticker.remove(loop);
      tl.scrollTrigger && tl.scrollTrigger.kill();
      tl.kill();
    };
  }, []);

  const night = variant === 'noite';
  return (
    <section id={id} ref={root} className={`film film--${variant}`} data-pin>
      {data.video
        ? <video className="filmVid film-media" src={data.video} poster={data.poster} muted playsInline preload="auto" />
        : <img className="film-media" src={data.poster} alt="" decoding="async" />}
      {night && <div className="filmDark" />}
      {data.chapters.map((c, i) => (
        <div className="chapter" key={i}>
          <p className="chapter-kicker">{c.kicker}</p>
          <h3 className="chapter-title t-title"><Segments parts={c.title} /></h3>
        </div>
      ))}
      {night && data.quote && (
        <div className="quote">
          <p className="quote-text">« {data.quote} »</p>
          <p className="quote-by">{data.quote_by}</p>
        </div>
      )}
      {!night && (
        <div className="film-roman">
          {data.chapters.map((_, i) => <span className="romNum" key={i}>{ROMAN[i]}</span>)}
        </div>
      )}
      <div className="film-progress">
        <div className="film-track"><div className="filmBar" /></div>
        <span className="filmTime">{data.video ? '00:00 / 00:00' : ''}</span>
      </div>
    </section>
  );
}
