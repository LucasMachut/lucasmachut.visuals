/* ============================================================
   LUGARES — mouvements (langage Elicyon)
   Tout le contenu est visible sans ce script : les états de
   départ des animations sont posés ici, jamais dans le CSS.
   ============================================================ */

(function () {
  'use strict';

  const body = document.body;
  const header = document.querySelector('.lh-header');
  const hero = document.querySelector('.lh-hero');
  const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* --- Lettres une à une -------------------------------- */
  /* Le nom des projets est découpé en spans, pour tomber lettre
     par lettre. */
  const splitChars = el => {
    const text = el.textContent;
    el.textContent = '';
    [...text].forEach(c => {
      const s = document.createElement('span');
      if (c === ' ') { s.className = 'sp'; }
      else { s.className = 'ch'; s.textContent = c; }
      el.appendChild(s);
    });
    return el.querySelectorAll('.ch');
  };
  document.querySelectorAll('.lh-slide__letters').forEach(splitChars);
  /* --- Menu --------------------------------------------- */
  let lenis = null;
  const toggle = document.querySelector('.lh-header__toggle');
  const setMenu = open => {
    body.classList.toggle('menu-open', open);
    if (toggle) toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (lenis) open ? lenis.stop() : lenis.start();
  };
  if (toggle) {
    toggle.addEventListener('click', () => setMenu(!body.classList.contains('menu-open')));
    document.querySelectorAll('.lh-menu a').forEach(a => a.addEventListener('click', () => setMenu(false)));
    document.addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });
  }

  /* --- En-tête ------------------------------------------ */
  /* Disparaît en descendant, revient en remontant ; passé le film
     d'ouverture, il se lit en sombre sur le crème (exclusion). */
  if (header) {
    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      const past = hero ? y > hero.offsetHeight - header.offsetHeight : true;
      header.classList.toggle('is-past', past);
      if (Math.abs(y - lastY) > 4) {
        header.classList.toggle('is-hidden', y > lastY && y > 120);
        lastY = y;
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  if (calm || !window.gsap || !window.ScrollTrigger) return;
  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;
  gsap.registerPlugin(ScrollTrigger);

  /* --- Défilement doux ---------------------------------- */
  if (window.Lenis) {
    lenis = new window.Lenis({ lerp: 0.1 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  /* --- 1 · Ouverture ------------------------------------ */
  /* Le film s'ouvre depuis le centre et se pose (1.2 -> 1), les
     mots glissent en alternance, puis l'en-tête apparaît. Au
     scroll, l'image dérive de 10 %. */
  if (hero) {
    const media = hero.querySelector('.lh-hero__media');
    const drift = hero.querySelector('.lh-hero__drift');
    const words = hero.querySelectorAll('.lh-hero__word');
    const intro = gsap.timeline({ defaults: { ease: 'expo.inOut' } });
    intro
      .fromTo(media, { clipPath: 'inset(50% 50% 50% 50%)' },
                     { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.5 })
      .fromTo(drift, { scale: 1.2 }, { scale: 1, duration: 2.2, ease: 'expo.out' }, 0.3)
      .from(words, {
        xPercent: i => (i % 2 ? 20 : -20), opacity: 0,
        duration: 1.2, stagger: 0.1, ease: 'power3.out'
      }, 0.9)
      .fromTo([header, hero.querySelector('.lh-hero__lead')], { opacity: 0 },
              { opacity: 1, duration: 0.8, ease: 'power1.out', clearProps: 'opacity' }, 1.6);

    gsap.to(media, {
      yPercent: 10, ease: 'none',
      scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true }
    });
  }

  /* --- Titres ligne à ligne, textes qui montent --------- */
  document.querySelectorAll('[data-lines]').forEach(h => {
    gsap.from(h.querySelectorAll('.lh-line > span'), {
      yPercent: 110, duration: 1.1, stagger: 0.1, ease: 'power3.out',
      scrollTrigger: { trigger: h, start: 'top 88%' }
    });
  });
  document.querySelectorAll('[data-rise]').forEach(el => {
    gsap.from(el, {
      y: 24, opacity: 0, duration: 1, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 90%' }
    });
  });

  /* --- 3 · Déclaration ---------------------------------- */
  const statement = document.querySelector('.lh-statement');
  if (statement) {
    const lines = statement.querySelectorAll('.lh-statement__line');
    const fades = gsap.utils.shuffle([...statement.querySelectorAll('.fade-word')]);
    gsap.timeline({
      scrollTrigger: {
        trigger: statement, start: 'top top', end: '+=130%',
        pin: true, scrub: true, invalidateOnRefresh: true
      }
    })
      .to(fades, { opacity: 0, duration: 0.2, stagger: 0.03 }, 0)
      .to(statement.querySelector('.lh-statement__intro'), { height: 0, duration: 0.4, ease: 'power1.inOut' }, 0.6)
      .to(lines, { x: 0, duration: 1, ease: 'none' }, 0)
      .fromTo(statement.querySelector('.lh-statement__bg img'), { scale: 1.08 }, { scale: 1, duration: 1, ease: 'none' }, 0);
  }

  /* --- 4 · Lignes : la photo glisse dans son cadre ------ */
  document.querySelectorAll('.lh-row__media').forEach(frame => {
    gsap.fromTo(frame.querySelector('img'), { yPercent: -3 }, {
      yPercent: 3, ease: 'none',
      scrollTrigger: { trigger: frame, start: 'top bottom', end: 'bottom top', scrub: true }
    });
  });

  /* --- 5 · Projets --------------------------------------- */
  /* Scène épinglée : chaque projet est découpé vers le haut et
     découvre le suivant, dont les lettres tombent en place. */
  const stage = document.querySelector('.lh-slides');
  if (stage) {
    const slides = gsap.utils.toArray('.lh-slide', stage);
    const dots = stage.querySelectorAll('.lh-pager i');
    const n = slides.length;
    gsap.from(slides[0].querySelectorAll('.ch'), {
      yPercent: -100, opacity: 0, duration: 1, stagger: 0.04, ease: 'power3.out',
      scrollTrigger: { trigger: stage, start: 'top 60%' }
    });
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: stage, start: 'top top', end: () => '+=' + (n - 1) * window.innerHeight * 1.2,
        pin: true, scrub: true, invalidateOnRefresh: true,
        onUpdate: self => {
          const i = Math.round(self.progress * (n - 1));
          dots.forEach((d, k) => d.classList.toggle('is-on', k === i));
        }
      }
    });
    slides.slice(0, -1).forEach((s, i) => {
      tl.fromTo(s, { clipPath: 'inset(0% 0% 0% 0%)' },
                   { clipPath: 'inset(0% 0% 100% 0%)', duration: 1, ease: 'none' })
        .from(slides[i + 1].querySelectorAll('.ch'),
              { yPercent: -100, opacity: 0, duration: 0.5, stagger: 0.02, ease: 'power2.out' }, '<0.35');
    });
  }

  /* --- 8 · Clôture -------------------------------------- */
  const fin = document.querySelector('.lh-fin');
  if (fin) {
    gsap.fromTo(fin.querySelector('.lh-fin__media'), { yPercent: -6 }, {
      yPercent: 6, ease: 'none',
      scrollTrigger: { trigger: fin, start: 'top bottom', end: 'bottom top', scrub: true }
    });
    /* Au clavier aussi, le cadre se resserre autour de l'appel. */
    const call = fin.querySelector('.lh-fin__call');
    call.addEventListener('focus', () => fin.classList.add('is-tight'));
    call.addEventListener('blur', () => fin.classList.remove('is-tight'));
  }

  /* --- Pied de page : liens puis logo qui montent ------- */
  const foot = document.querySelector('.lh-foot');
  if (foot) {
    gsap.from(foot.querySelectorAll('.lh-foot__link span'), {
      yPercent: 100, duration: 0.8, stagger: 0.04, ease: 'power3.out',
      scrollTrigger: { trigger: foot, start: 'top 85%' }
    });
    gsap.from(foot.querySelector('.lh-foot__logo'), {
      y: 40, opacity: 0, duration: 1.2, ease: 'power3.out',
      scrollTrigger: { trigger: foot, start: 'top 70%' }
    });
  }

  /* Les polices changent la hauteur des titres : on recalcule. */
  if (document.fonts) document.fonts.ready.then(() => ScrollTrigger.refresh());
})();
