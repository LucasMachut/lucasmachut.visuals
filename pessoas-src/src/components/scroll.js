// Chez Koisei tout est créé dans un seul script, de haut en bas. Ici chaque
// section est un composant qui s'hydrate à son rythme : les épinglages peuvent
// naître dans le désordre et fausser les hauteurs. Chaque section épinglée porte
// data-pin ; sa priorité suit l'ordre de la page, et un seul recalcul groupé
// remet tout d'aplomb après chaque création.
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Téléphone : la barre d'adresse qui apparaît ou disparaît change la hauteur
// de l'écran ; sans ce réglage, ScrollTrigger recalcule tout en plein geste et
// les épinglages arrivent en retard (on voit la section suivante avant le film).
ScrollTrigger.config({ ignoreMobileResize: true });

export function pinPriority(el) {
  const all = [...document.querySelectorAll('[data-pin]')];
  return 100 - all.indexOf(el);
}

let timer = 0;
export function scheduleRefresh() {
  clearTimeout(timer);
  timer = setTimeout(() => {
    ScrollTrigger.sort();
    ScrollTrigger.refresh();
    dispatchEvent(new Event('lm:layout'));
  }, 60);
}
