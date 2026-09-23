/* ============================================================
   MAQUETTE « ERA » — mise en scène au scroll
   Un seul vocabulaire pour toute la page, pour qu'aucune section
   ne paraisse figée à côté d'une autre qui bouge :

   1. [data-rise]  chaque bloc de texte monte et apparaît, même
                   durée, même courbe ; les blocs qui entrent
                   ensemble se suivent de près.
   2. [data-img]   chaque image se découvre de bas en haut, puis
                   glisse lentement dans son cadre tant qu'elle
                   est à l'écran.
   3. deux scènes fixes : le film (promesse en surimpression,
      puis arche), l'image de la percepção qui recule.

   Sans GSAP, ou si le visiteur a demandé moins de mouvement, la
   page reste entière : rien n'est caché par le CSS.
   ============================================================ */

(function () {
  'use strict';

  const root = document.documentElement;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (reduce || !window.gsap || !window.ScrollTrigger) {
    root.classList.add('era-static');
    return;
  }

  gsap.registerPlugin(ScrollTrigger);
  root.classList.add('era-anim');

  /* --- Défilement amorti --------------------------------- */
  if (window.Lenis) {
    const lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  /* --- 1. Textes ----------------------------------------- */
  const rise = window.matchMedia('(max-width: 860px)').matches ? 24 : 36;
  gsap.set('[data-rise]', { autoAlpha: 0, y: rise });
  ScrollTrigger.batch('[data-rise]', {
    start: 'top 90%',
    once: true,
    onEnter: batch => gsap.to(batch, {
      autoAlpha: 1, y: 0, duration: 1.1, ease: 'power3.out', stagger: 0.12, overwrite: true
    })
  });

  /* --- 2. Images ----------------------------------------- */
  gsap.utils.toArray('[data-img]').forEach(box => {
    const img = box.querySelector(':scope > img');
    gsap.fromTo(box,
      { clipPath: 'inset(100% 0% 0% 0%)' },
      {
        clipPath: 'inset(0% 0% 0% 0%)', duration: 1.4, ease: 'power4.inOut',
        scrollTrigger: { trigger: box, start: 'top 88%', once: true }
      });
    if (img) {
      gsap.fromTo(img, { yPercent: -6 }, {
        yPercent: 6, ease: 'none',
        scrollTrigger: { trigger: box, start: 'top bottom', end: 'bottom top', scrub: true }
      });
    }
  });

  /* --- 3a. Ouverture ------------------------------------- */
  gsap.matchMedia().add({
    desk: '(min-width: 861px)',
    mob: '(max-width: 860px)'
  }, ctx => {
    const arch = ctx.conditions.desk
      ? 'inset(20% 29% 0% 29% round 21vw 21vw 0vw 0vw)'
      : 'inset(22% 11% 0% 11% round 39vw 39vw 0vw 0vw)';

    /* Sur une seule course de scroll (0 → 1) :
       0    – 0.18  le logo s'efface, la promesse monte sur le film
       0.18 – 0.52  elle reste en surimpression, le film tourne
       0.52 – 0.62  elle repart vers le haut
       0.60 – 1     le film se referme en arche */
    gsap.timeline({
      scrollTrigger: { trigger: '.era-hero', start: 'top top', end: 'bottom bottom', scrub: 0.8 }
    })
      .to('.era-hero__cue', { autoAlpha: 0, duration: 0.06 }, 0)
      .to('.era-hero__logo', { autoAlpha: 0, y: -40, duration: 0.08, ease: 'power1.in' }, 0)
      .fromTo('.era-hero__texte',
        { autoAlpha: 0, yPercent: 55 },
        { autoAlpha: 1, yPercent: 0, duration: 0.14, ease: 'power2.out' }, 0.04)
      .to('.era-hero__texte', { autoAlpha: 0, yPercent: -55, duration: 0.1, ease: 'power2.in' }, 0.52)
      .fromTo('.era-hero__frame video', { scale: 1.1 }, { scale: 1, duration: 1, ease: 'none' }, 0)
      .to('.era-hero__frame', { clipPath: arch, duration: 0.4, ease: 'power2.inOut' }, 0.6)
      .fromTo('.era-hero__tag', { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.1 }, 0.9);
  });

  /* --- En-tête transparent tant que le film est plein écran,
     bouton de contact flottant (mobile) entre la fin du film et
     la section contact. --------------------------------------- */
  document.body.classList.add('era-film');
  ScrollTrigger.create({
    trigger: '.era-hero', start: 'top top', end: 'bottom bottom',
    onUpdate: s => document.body.classList.toggle('era-film', s.progress < 0.6),
    onLeave: () => document.body.classList.remove('era-film')
  });
  /* Le bouton ne gêne jamais la lecture : il se cache quand on
     descend (on lit), apparaît quand on remonte (on cherche),
     comme la barre de Safari ; seulement entre la fin du film
     et le contact. */
  const cta = document.querySelector('.era-cta');
  if (cta) {
    let inRange = false;
    ScrollTrigger.create({
      trigger: '.era-promessa', start: 'bottom 70%',
      endTrigger: '.era-fin', end: 'top 80%',
      onToggle: s => { inRange = s.isActive; if (!inRange) cta.classList.remove('is-on'); },
      onUpdate: s => cta.classList.toggle('is-on', inRange && s.direction < 0)
    });
  }

  /* --- 3b. Percepção : l'image recule nettement pendant la
     lecture — on entre serré dans le salão, on finit sur la
     pièce entière. */
  gsap.fromTo('.era-percep__media img', { scale: 1.5 }, {
    scale: 1, ease: 'power1.inOut',
    scrollTrigger: { trigger: '.era-percep', start: 'top bottom', end: 'bottom bottom', scrub: true }
  });

  /* --- Barre de progression ------------------------------ */
  gsap.to('.era-progress i', {
    scaleY: 1, ease: 'none',
    scrollTrigger: { start: 0, end: 'max', scrub: true }
  });

  window.addEventListener('load', () => ScrollTrigger.refresh());
})();
