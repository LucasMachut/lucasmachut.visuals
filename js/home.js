/* Le Regard — page d'accueil. Autonome, n'utilise pas js/main.js. */
(function () {
  'use strict';

  /* apparition au défilement */
  var els = document.querySelectorAll('.fi:not(.in)');
  if (!('IntersectionObserver' in window)) {
    Array.prototype.forEach.call(els, function (e) { e.classList.add('in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.05 });
    Array.prototype.forEach.call(els, function (e) { io.observe(e); });
  }

  /* barre de navigation */
  var hd = document.querySelector('.hd');
  if (hd) {
    var onScroll = function () {
      hd.classList.toggle('is-scrolled', window.scrollY > window.innerHeight * 0.9);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    var toggle = hd.querySelector('.hd__toggle');
    if (toggle) {
      toggle.addEventListener('click', function () {
        var open = hd.classList.toggle('is-open');
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
      Array.prototype.forEach.call(hd.querySelectorAll('.hd__link'), function (a) {
        a.addEventListener('click', function () {
          hd.classList.remove('is-open');
          toggle.setAttribute('aria-expanded', 'false');
        });
      });
    }
  }

  /* dérive lente des photos de panneau pendant le défilement.
     #contato est exclu : son cadrage est calé sur le bord bas,
     la dérive ferait sortir le corps du cadre. */
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (window.innerWidth < 900) return;

  /* les panneaux qui changent de photo sur mobile ont leur image dans
     un <picture> : on vise les deux formes */
  var imgs = Array.prototype.slice.call(
    document.querySelectorAll('.panel:not(#contato) > img, .panel:not(#contato) > picture > img')
  );
  if (!imgs.length) return;

  imgs.forEach(function (i) {
    i.style.transform = 'scale(1.08)';
    i.style.willChange = 'transform';
  });

  var ticking = false;
  function frame() {
    var vh = window.innerHeight;
    imgs.forEach(function (i) {
      var r = i.closest('.panel').getBoundingClientRect();
      if (r.bottom < -100 || r.top > vh + 100) return;
      var p = (r.top + r.height / 2 - vh / 2) / vh;
      i.style.transform = 'scale(1.08) translate3d(0,' + (-p * 3.2).toFixed(2) + '%,0)';
    });
    ticking = false;
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(frame); }
  }, { passive: true });
  window.addEventListener('resize', frame);
  frame();
})();
