/* PROTOTYPE — viseur d'ouverture, dérive des photos.
   Se charge après home.js, sans rien lui retirer. */
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hero = document.querySelector('.hero--vf');
  var hd = document.querySelector('.hd');

  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }

  function frame() {
    var vh = window.innerHeight;
    var y = window.scrollY;

    /* le viseur s'ouvre sur les deux tiers de la course collée, puis
       tient le plein cadre un instant avant que la page reparte */
    var heroEnd = 0;
    if (hero) {
      var run = hero.offsetHeight - vh;
      heroEnd = hero.offsetTop + run;
      if (!reduce && run > 0) {
        var p = Math.min(1, Math.max(0, y / (run * 0.7)));
        hero.style.setProperty('--p', p.toFixed(3));
      }
    }

    /* la barre prend son fond quand le film est sorti, pas avant */
    if (hd) hd.classList.toggle('is-scrolled', y > heroEnd + vh * 0.9);

    if (!reduce) reliefFrame(vh);
    ticking = false;
  }

  /* ─── la dérive des photos ───
     p = écart entre le centre de la section et le centre de l'écran,
     en hauteurs d'écran : 0 quand la section est centrée. La photo est
     décalée de -p (elle traîne derrière la page). Le texte, lui, ne
     bouge pas : il reste collé à sa section, sur la zone où il a été
     mesuré, et se lit à n'importe quel moment du défilement.
     Cette boucle remplace la dérive de home.js : elle passe après lui à
     chaque image, et vaut aussi sur téléphone.
     #contato garde sa photo fixe — son cadrage est calé sur le bord
     bas, la dérive ferait sortir le corps du cadre. */
  var layers = Array.prototype.slice.call(
    document.querySelectorAll('section.panel, section.band')
  ).filter(function (s) {
    return s.id !== 'o-que-eu-faco' && s.id !== 'contato';
  }).map(function (s) {
    return {
      s: s,
      imgs: Array.prototype.slice.call(
        s.querySelectorAll(':scope > picture > img, :scope > img, .tile img'))
    };
  });

  function reliefFrame(vh) {
    var ki = window.innerWidth < 861 ? 5 : 6;   /* dérive, % de la hauteur */
    layers.forEach(function (L) {
      var r = L.s.getBoundingClientRect();
      if (r.bottom < -100 || r.top > vh + 100) return;
      var p = clamp((r.top + r.height / 2 - vh / 2) / vh, -1.2, 1.2);
      L.imgs.forEach(function (img, i) {
        if (!img.offsetWidth) return;          /* tuile masquée sur téléphone */
        /* dans une bande, chaque tuile traîne un peu plus que la
           précédente : les images se décollent aussi entre elles */
        var kk = ki * (1 + i * 0.25);
        /* à scale(1.2) il reste 10 % de marge de chaque côté ; le
           décalage (lui aussi agrandi de 1.2) ne doit jamais la dépasser,
           sinon le bord de l'image apparaît */
        var dy = clamp(-p * kk, -7.8, 7.8);
        img.style.transform = 'scale(1.2) translate3d(0,' + dy.toFixed(2) + '%,0)';
      });
    });
  }

  var ticking = false;
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(frame); }
  }, { passive: true });
  window.addEventListener('resize', frame);
  frame();
})();
