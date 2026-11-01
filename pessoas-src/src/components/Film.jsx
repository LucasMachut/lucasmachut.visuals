// Scroll film Koisei (#film1, #film2) : la section s'épingle, le défilement fait
// avancer la vidéo (lissée à 10 % par image), les chapitres entrent et sortent sur
// une timeline de 100 unités. Sans vidéo (pas encore choisie), la photo d'attente
// tient la place et la barre suit le défilement.
import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Segments } from './Segments.jsx';
import Pic, { isTall } from './Pic.jsx';
import { pinPriority, scheduleRefresh } from './scroll.js';

const ROMAN = ['Ⅰ', 'Ⅱ', 'Ⅲ', 'Ⅳ', 'Ⅴ', 'Ⅵ', 'Ⅶ', 'Ⅷ'];
const pad = (n) => String(Math.floor(n)).padStart(2, '0');
// Cadrage d'une photo de la suite choisi dans l'admin : un pour écran large,
// un pour écran haut (téléphone), appliqués par la feuille de style.
const pos = (c) => (c ? `${(c.x ?? .5) * 100}% ${(c.y ?? .5) * 100}%` : '50% 50%');
const slideCrop = (crop) => (crop ? { '--pos-wide': pos(crop.desktop), '--pos-tall': pos(crop.mobile) } : undefined);

export default function Film({ id, data, variant = 'dia' }) {
  const root = useRef(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const sec = root.current;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isMobile = matchMedia('(max-width: 767px)').matches;
    const video = sec.querySelector('.filmVid');
    // photo d'attente du film : version téléphone si l'écran est plus haut que large
    if (video && data.poster_mobile && isTall()) video.poster = data.poster_mobile;
    const bar = sec.querySelector('.filmBar'), time = sec.querySelector('.filmTime');
    const ch = sec.querySelectorAll('.chapter'), roms = sec.querySelectorAll('.romNum');
    const q = sec.querySelector('.quote'), dark = sec.querySelector('.filmDark');

    if (reduced) {
      if (video) video.src = data.video;
      gsap.set(ch[0], { autoAlpha: 1 });
      return undefined;
    }

    let target = 0, cur = 0;
    const pinLen = isMobile ? '250%' : variant === 'dia' ? '400%' : '350%';
    const tl = gsap.timeline({ scrollTrigger: { trigger: sec, start: 'top top', end: '+=' + pinLen, pin: true, anticipatePin: 1, scrub: 1, refreshPriority: pinPriority(sec),
      onUpdate: (s) => { target = s.progress; } } });

    if (variant === 'dia') {
      // Koisei : 3 phrases sur [5,30] [38,63] [70,95]. Autre nombre (ajouté ou
      // retiré dans l'admin) : même rythme réparti sur 5 à 95.
      const n = ch.length;
      const seg = 90 / Math.max(1, n);
      const spans = n === 3 ? [[5, 30], [38, 63], [70, 95]]
        : Array.from({ length: n }, (_, i) => [5 + i * seg, 5 + (i + 1) * seg - Math.min(8, seg * .25)]);
      spans.forEach((sp, i) => {
        if (!ch[i]) return;
        tl.fromTo(ch[i], { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: 6 }, sp[0])
          .to(ch[i], { autoAlpha: 0, y: -40, duration: 5 }, sp[1] - 5)
          .to(roms[i], { color: '#B5623C', duration: 1 }, sp[0])
          .to(roms[i], { color: 'rgba(237,233,223,.5)', duration: 1 }, sp[1]);
      });
    } else {
      // Koisei : 2 phrases sur [6,40] et [44,78], puis la citation. Autre nombre :
      // même rythme réparti sur 6 à 78.
      const n = ch.length;
      const seg = 72 / Math.max(1, n);
      const spans = n === 2 ? [[6, 40], [44, 78]]
        : Array.from({ length: n }, (_, i) => [6 + i * seg, 6 + (i + 1) * seg - Math.min(4, seg * .12)]);
      spans.forEach((sp, i) => {
        const fade = Math.min(8, (sp[1] - sp[0]) * .25);
        tl.fromTo(ch[i], { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: fade }, sp[0])
          .to(ch[i], { autoAlpha: 0, y: -40, duration: fade * .75 }, sp[1] - fade * .75);
      });
      tl.to(dark, { opacity: .3, duration: 6 }, 82);
      if (q) tl.fromTo(q, { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 8 }, 85);
    }
    tl.to({}, { duration: 1 }, 100);

    // Téléphone : même lecture au défilement que sur ordinateur, mais sans
    // vidéo. iOS ne charge pas une vidéo jamais lue (et refuse de la lire en
    // économie d'énergie) : le film y est une suite d'images (data.frames)
    // peinte sur une toile, comme les pages produit d'Apple. Chargement en deux
    // passes : une image sur quatre d'abord, puis le reste.
    const touch = matchMedia('(hover: none), (pointer: coarse), (max-width: 767px)').matches;
    const fr = data.frames;
    const canvas = sec.querySelector('.film-canvas');
    let imgs = null, drawn = -1, onSize = null, loadTimer = 0;
    if (touch && fr && canvas) {
      if (video) video.style.display = 'none';
      canvas.hidden = false;
      const ctx = canvas.getContext('2d');
      const size = () => {
        const r = sec.getBoundingClientRect(), k = Math.min(devicePixelRatio || 1, 2);
        canvas.width = Math.round(r.width * k); canvas.height = Math.round(r.height * k); drawn = -1;
      };
      size();
      onSize = size;
      addEventListener('resize', size);
      imgs = new Array(fr.count);
      const url = (i) => fr.path.replace('{n}', String(i + 1).padStart(3, '0'));
      const load = () => {
        const order = [];
        for (let i = 0; i < fr.count; i += 4) order.push(i);
        for (let i = 0; i < fr.count; i++) if (i % 4) order.push(i);
        order.forEach((i) => { const im = new Image(); im.decoding = 'async'; im.onload = () => { imgs[i] = im; if (drawn < 0) drawn = -2; }; im.src = url(i); });
      };
      // Chargées dès l'arrivée sur la page : attendre l'approche du film les
      // faisait arriver trop tard, on dépassait le film avant qu'il démarre.
      loadTimer = setTimeout(load, 300);
      // l'image chargée la plus proche, dessinée en « cover » sur la toile
      const draw = (want) => {
        let i = want, j = want;
        while (i >= 0 && !imgs[i]) i--;
        while (j < fr.count && !imgs[j]) j++;
        const k = i < 0 ? j : j >= fr.count ? i : (want - i <= j - want ? i : j);
        if (k < 0 || k >= fr.count || !imgs[k] || k === drawn) return;
        const im = imgs[k], cw = canvas.width, ch = canvas.height;
        const sc = Math.max(cw / im.width, ch / im.height), w = im.width * sc, h = im.height * sc;
        ctx.drawImage(im, (cw - w) / 2, (ch - h) / 2, w, h);
        drawn = k;
      };
      canvas._draw = draw;
    } else if (video) {
      video.muted = true;
      video.setAttribute('muted', '');
      video.src = data.video;
    }

    const loop = () => {
      cur += (target - cur) * .1;
      bar.style.transform = `scaleX(${cur})`;
      // Suite de photos (data.slides) : chacune son tour, en fondu, au fil du défilement
      // relues à chaque image : dans l'admin, la suite change (ordre, ajout) sans recharger
      const slides = sec.querySelectorAll('.film-slide');
      if (slides.length) {
        const on = Math.min(slides.length - 1, Math.floor(cur * slides.length));
        slides.forEach((el, i) => el.classList.toggle('is-on', i === on));
      }
      if (imgs) {
        canvas._draw(Math.round(cur * (fr.count - 1)));
        time.textContent = `00:${pad(cur * fr.duration)} / 00:${pad(fr.duration)}`;
      } else if (video && video.duration) {
        const t = cur * video.duration;
        if (!video.seeking && Math.abs(video.currentTime - t) > .02) video.currentTime = t;
        time.textContent = `00:${pad(t)} / 00:${pad(video.duration)}`;
      }
    };
    gsap.ticker.add(loop);
    scheduleRefresh();

    return () => {
      clearTimeout(loadTimer);
      if (onSize) removeEventListener('resize', onSize);
      gsap.ticker.remove(loop);
      tl.scrollTrigger && tl.scrollTrigger.kill();
      tl.kill();
    };
  }, []);

  const night = variant === 'noite';
  const field = night ? 'film_noite' : 'film_dia';
  return (
    <div className="pin-wrap">
    {/* Enveloppe : l'épinglage glisse la section dans un conteneur ; sans elle, React
        ne la retrouve plus à sa place quand l'admin la remplace, et tout l'écran tombe. */}
      <section id={id} ref={root} className={`film film--${variant}`} data-pin data-edit={data.slides && data.slides.length ? `${field}.slides` : `${field}.poster`}>
        {data.video
          ? <video className="filmVid film-media" poster={data.poster} muted playsInline preload="auto" />
          : data.slides && data.slides.length
            ? data.slides.map((sl, i) => (
              <Pic key={sl.src} className={`film-media film-slide${i === 0 ? ' is-on' : ''}`} src={sl.src} mobile={sl.src_mobile}
                style={slideCrop(sl.crop)}
                loading={i < 2 ? 'eager' : 'lazy'} />
            ))
            : <Pic className="film-media" src={data.poster} mobile={data.poster_mobile} />}
        {data.frames && <canvas className="film-media film-canvas" hidden aria-hidden="true" />}
        {night && <div className="filmDark" />}
        {data.chapters.map((c, i) => (
          <div className="chapter" key={i}>
            <p className="chapter-kicker" data-edit={`${field}.chapters.${i}.kicker`}>{c.kicker}</p>
            <h3 className="chapter-title t-title" data-edit={`${field}.chapters.${i}.title`}><Segments parts={c.title} /></h3>
          </div>
        ))}
        {night && data.quote && (
          <div className="quote">
            <p className="quote-text" data-edit={`${field}.quote`}>« {data.quote} »</p>
            <p className="quote-by" data-edit={`${field}.quote_by`}>{data.quote_by}</p>
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
    </div>
  );
}
