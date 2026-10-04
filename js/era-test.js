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

  /* Pas de défilement amorti : la page suit exactement la
     molette ou le doigt. L'amorti donnait une glisse qui
     continuait après le geste, ressentie comme une accélération.
     Sur téléphone, la barre d'adresse qui se replie change la
     hauteur de l'écran : on ne recalcule pas tout en plein geste. */
  ScrollTrigger.config({ ignoreMobileResize: true });

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
    const img = box.querySelector(':scope > img, :scope > video');
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
    /* L'arche laisse libre le bas de l'écran : le titre vient
       s'y poser. */
    const desk = ctx.conditions.desk;
    const arch = desk
      ? 'inset(20% 34% 32% 34% round 16vw 16vw 0vw 0vw)'
      : 'inset(22% 11% 34% 11% round 39vw 39vw 0vw 0vw)';
    /* Où le titre se pose : centré dans la bande sous l'arche. */
    const settleY = () => window.innerHeight * (desk ? 0.34 : 0.33);
    const ink = getComputedStyle(root).getPropertyValue('--text').trim() || '#1f1812';
    const accent = getComputedStyle(root).getPropertyValue('--accent').trim();

    /* Sur une seule course de scroll (0 → 1) :
       0    – 0.18  le logo s'efface, le titre monte sur le film
       0.18 – 0.42  il reste en surimpression, le film tourne
       0.42 – 0.78  le film se referme en arche ; le titre ne part
                    pas : il descend se poser sous l'arche et passe
                    du crème au sombre, la phrase s'efface
       0.78 – 1     la scène, complète, reste un instant */
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: '.era-hero', start: 'top top', end: 'bottom bottom',
        scrub: 0.3, invalidateOnRefresh: true
      }
    })
      .to('.era-hero__cue', { autoAlpha: 0, duration: 0.06 }, 0)
      .to('.era-hero__logo', { autoAlpha: 0, y: -40, duration: 0.08, ease: 'power1.in' }, 0)
      .fromTo('.era-hero__texte',
        { autoAlpha: 0, yPercent: 55 },
        { autoAlpha: 1, yPercent: 0, duration: 0.14, ease: 'power2.out' }, 0.04)
      .fromTo('.era-hero__frame video', { scale: 1.1 }, { scale: 1, duration: 1, ease: 'none' }, 0)
      .to('.era-hero__frame', { clipPath: arch, duration: 0.36, ease: 'power2.inOut' }, 0.42)
      .to('.era-hero__texte .era-lead', { autoAlpha: 0, duration: 0.1, ease: 'power1.in' }, 0.42)
      .to('.era-hero__texte', { y: settleY, scale: desk ? 0.8 : 1, duration: 0.36, ease: 'power2.inOut' }, 0.42)
      .to('.era-hero__texte .era-display', { color: ink, duration: 0.2, ease: 'none' }, 0.52)
      .to('.era-hero__texte .era-label', { color: accent || ink, duration: 0.2, ease: 'none' }, 0.52)
      .fromTo('.era-hero__tag', { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.1 }, 0.74)
      .set({}, {}, 1);
  });

  /* --- En-tête transparent tant que le film est plein écran,
     bouton de contact flottant (mobile) entre la fin du film et
     la section contact. --------------------------------------- */
  document.body.classList.add('era-film');
  ScrollTrigger.create({
    trigger: '.era-hero', start: 'top top', end: 'bottom bottom',
    onUpdate: s => document.body.classList.toggle('era-film', s.progress < 0.55),
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
