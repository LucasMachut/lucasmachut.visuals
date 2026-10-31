// Plate frame Koisei en défilement vertical.
// Koisei (galerie horizontale) : img scale(1.15) translateX(offset × 7 %), offset =
// distance du centre de la carte au centre de l'écran / largeur d'écran ; le numéro
// en contour se remplit quand ce centre est à moins d'une demi-carte du centre.
// Ici le défilement est vertical : même calcul sur l'axe Y.
// À 1.15 l'image déborde de 7,5 % de chaque côté ; à l'écran |offset| < .75,
// donc le décalage reste sous 5,3 % (borné à .9 hors écran : 7 × .9 × 1.15 < 7,5).
export function initDrift() {
  const plates = [...document.querySelectorAll('[data-drift]')];
  const cards = [...document.querySelectorAll('[data-num-card]')];
  if (!plates.length && !cards.length) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let queued = false;

  const update = () => {
    queued = false;
    const mid = innerHeight / 2;
    for (const img of plates) {
      const r = img.parentElement.getBoundingClientRect();
      if (r.bottom < -200 || r.top > innerHeight + 200) continue;
      const off = Math.max(-.9, Math.min(.9, (r.top + r.height / 2 - mid) / innerHeight));
      img.style.transform = reduced ? 'scale(1.15)' : `scale(1.15) translateY(${off * 7}%)`;
    }
    for (const card of cards) {
      const r = card.getBoundingClientRect();
      card.classList.toggle('is-near', Math.abs(r.top + r.height / 2 - mid) < r.height / 2);
    }
  };
  const queue = () => { if (!queued) { queued = true; requestAnimationFrame(update); } };
  addEventListener('scroll', queue, { passive: true });
  addEventListener('resize', queue);
  addEventListener('load', queue);
  update();
}

// Titres Koisei : chaque .heroLine monte de 110 % avec une rotation de 2°,
// les .heroFade apparaissent ensuite (valeurs de l'Overview).
export async function initReveal() {
  const lines = document.querySelectorAll('.heroLine');
  const fades = document.querySelectorAll('.heroFade');
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    fades.forEach((f) => (f.style.opacity = 1));
    return;
  }
  const { default: gsap } = await import('gsap');
  gsap.fromTo(lines, { yPercent: 110, rotate: 2 }, { yPercent: 0, rotate: 0, duration: 1.1, ease: 'power4.out', stagger: .12, delay: .2 });
  gsap.fromTo(fades, { opacity: 0 }, { opacity: 1, duration: 1, delay: .8, stagger: .1 });
}
