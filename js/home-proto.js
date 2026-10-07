/* PROTOTYPE GRAND ÉCRAN — accueil veralem, 08.10.2026.
   Autonome : remplace home.js sur index-proto.html. Même logique que
   la version téléphone validée (js/home-mobile.js) : le défilement
   ne fait que décider du moment, le reste se joue au temps, en CSS. */
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
  function all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  /* ─── la frappe ───
     Le texte est écrit dans le HTML (lisible sans script). On le garde
     de côté, on vide l'élément, et on le retape lettre à lettre avec
     le chariot qui clignote. aria-label garde le mot entier pour les
     lecteurs d'écran pendant la frappe. */
  function prepType(el) {
    if (el._full !== undefined) return;
    el._full = el.textContent.trim();
    el.setAttribute('aria-label', el._full);
    if (!reduce) el.textContent = '';
  }
  function typeTimed(el, delay, speed) {
    prepType(el);
    if (reduce) { el.textContent = el._full; return; }
    var gen = el._gen = (el._gen || 0) + 1;
    var i = 0;
    setTimeout(function tick() {
      if (gen !== el._gen) return;
      i++;
      el.textContent = el._full.slice(0, i);
      var c = document.createElement('span');
      c.className = 'caret';
      el.appendChild(c);
      if (i < el._full.length) setTimeout(tick, speed + Math.random() * speed);
      else setTimeout(function () { if (gen === el._gen) el.textContent = el._full; }, 2200);
    }, delay);
  }
  function typeReset(el) {
    prepType(el);
    if (reduce) return;
    el._gen = (el._gen || 0) + 1;
    el.textContent = '';
  }

  /* ─── le film d'ouverture ───
     Muet et playsinline pour l'autoplay ; si le navigateur refuse, on
     relance au premier geste, le poster tient le cadre entre-temps. */
  var film = document.querySelector('.hero__v');
  if (film) {
    film.muted = true;
    var pp = film.play();
    if (pp && pp.catch) pp.catch(function () {
      var go = function () { film.play().catch(function () {}); };
      ['pointerdown', 'keydown', 'scroll', 'touchstart'].forEach(function (e) {
        window.addEventListener(e, go, { once: true, passive: true });
      });
    });
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden && film.paused) film.play().catch(function () {});
    });
  }
  var hero = document.querySelector('.hero--vf');
  var heroLine = document.querySelector('.hero__line');
  if (heroLine) typeTimed(heroLine, 2700, 45);

  /* ─── les chapitres ───
     Quand l'écran se colle, la photo reste seule 0,9 s (ou jusqu'au
     quart de la course, pour un geste rapide), puis le premier temps
     de texte monte. Les temps suivants arrivent à leur part de la
     course. Revenir au-dessus d'un chapitre le remet à zéro. */
  var chs = all('.ch').map(function (s) {
    var n = s.querySelector('.ch__n');
    if (n) prepType(n);
    return { s: s, n: n, beats: all('.beat', s), seen: false, shown: -1, timer: null, ready: false };
  });

  function showBeat(c, k) {
    if (k === c.shown) return;
    c.beats.forEach(function (b, i) {
      b.classList.toggle('is-on', i === k);
      b.classList.toggle('is-out', i < k);
    });
    c.s.classList.toggle('is-text', k > -1);
    if (c.n) {
      if (k === 0 && c.shown < 0) typeTimed(c.n, 120, 38);
      else if (k < 0) typeReset(c.n);
    }
    c.shown = k;
  }
  function resetChapter(c) {
    clearTimeout(c.timer);
    c.timer = null; c.ready = false; c.seen = false;
    c.s.classList.remove('is-in');
    showBeat(c, -1);
  }
  /* r = la position mesurée AVANT toute écriture (voir frame) */
  function chapterFrame(c, vh, r) {
    if (r.top > vh) { if (c.seen) resetChapter(c); return; }
    if (r.bottom < 0) return;
    if (!c.seen && r.top < vh * 0.35) { c.seen = true; c.s.classList.add('is-in'); }
    if (reduce) { showBeat(c, c.beats.length - 1); return; }
    if (r.top > 0) return;
    if (!c.timer && !c.ready) {
      c.timer = setTimeout(function () {
        c.ready = true;
        if (c.shown < 0) showBeat(c, 0);
      }, 900);
    }
    var nb = c.beats.length;
    var q = clamp(-r.top / Math.max(1, r.height - vh), 0, 1);
    if (q < 0.25 && !c.ready && c.shown < 0) return;
    showBeat(c, Math.min(nb - 1, Math.floor(q * nb)));
  }

  /* ─── la mise au point, sur le sujet ───
     data-focus = "x,y,l,h" : le sujet (une tête, un œil, des mains),
     en fractions de la photo d'origine. data-img = rang de la photo
     dans la planche (0 par défaut). On refait le calcul du recadrage
     (object-fit: cover + object-position) pour savoir où le sujet
     tombe à l'écran, quelle que soit la taille de la fenêtre, et les
     coins du viseur viennent s'y resserrer. */
  var afs = all('.ch__af[data-focus]').map(function (af) {
    var stage = af.closest('.ch__stage');
    var img = all('img', stage)[+(af.getAttribute('data-img') || 0)];
    return { af: af, stage: stage, img: img, f: af.getAttribute('data-focus').split(',').map(Number) };
  });
  function placeAF(o) {
    var img = o.img;
    if (!img || !img.naturalWidth) return;
    var box = img.parentElement.getBoundingClientRect();   /* le <picture>, sans le zoom */
    var st = o.stage.getBoundingClientRect();
    var W = box.width, H = box.height, nw = img.naturalWidth, nh = img.naturalHeight;
    var k = Math.max(W / nw, H / nh), dw = nw * k, dh = nh * k;
    var pos = getComputedStyle(img).objectPosition.split(' ').map(parseFloat);
    var ox = (W - dw) * (pos[0] / 100), oy = (H - dh) * ((pos[1] === undefined ? 50 : pos[1]) / 100);
    var x = box.left - st.left + ox + o.f[0] * dw, y = box.top - st.top + oy + o.f[1] * dh;
    var w = o.f[2] * dw, h = o.f[3] * dh;
    o.af.style.setProperty('--af', Math.round(y) + 'px ' + Math.round(st.width - x - w) + 'px ' +
      Math.round(st.height - y - h) + 'px ' + Math.round(x) + 'px');
  }
  function placeAll() { afs.forEach(placeAF); }
  afs.forEach(function (o) { if (o.img && !o.img.complete) o.img.addEventListener('load', function () { placeAF(o); }); });
  window.addEventListener('resize', placeAll);
  placeAll();

  /* ─── les étiquettes hors chapitre (album, papier) : frappées à
     l'arrivée, une fois ─── */
  var loose = all('.album .ch__n, .folha .ch__n');
  loose.forEach(prepType);

  /* ─── les tirages des prestations tombent sur la table ─── */
  var prests = all('.prest');
  if (reduce || !('IntersectionObserver' in window)) {
    prests.forEach(function (p) { p.classList.add('is-in'); });
  } else {
    var pio = new IntersectionObserver(function (en) {
      en.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-in'); pio.unobserve(e.target); }
      });
    }, { threshold: 0.3 });
    prests.forEach(function (p) { pio.observe(p); });
  }

  /* ─── l'album : la table de tirages ───
     Chaque tirage tombe quand il entre dans l'écran, avec un petit
     décalage pour qu'ils arrivent l'un après l'autre et pas en bloc. */
  var tiros = all('.mesa__t');
  if (reduce || !('IntersectionObserver' in window)) {
    tiros.forEach(function (t) { t.classList.add('is-down'); });
  } else {
    var queue = 0, qTimer = null;
    var tio = new IntersectionObserver(function (en) {
      en.forEach(function (e) {
        if (!e.isIntersecting) return;
        tio.unobserve(e.target);
        var t = e.target, d = queue++ * 160;
        setTimeout(function () { t.classList.add('is-down'); }, d);
        clearTimeout(qTimer);
        qTimer = setTimeout(function () { queue = 0; }, d + 200);
      });
    }, { threshold: 0.25 });
    tiros.forEach(function (t) { tio.observe(t); });
  }

  /* le tirage ouvert en grand : clic pour ouvrir, flèches pour passer,
     Échap ou clic sur la table pour refermer */
  var luz = document.querySelector('.luz');
  if (luz && tiros.length) {
    var luzImg = luz.querySelector('img'), cur = 0, opener = null;
    var show = function (i) {
      cur = (i + tiros.length) % tiros.length;
      var src = tiros[cur].querySelector('img');
      luzImg.src = src.currentSrc || src.src;
      luzImg.alt = src.alt;
    };
    var openLuz = function (i) {
      opener = tiros[i];
      show(i);
      luz.hidden = false;
      requestAnimationFrame(function () { luz.classList.add('is-open'); });
      luz.querySelector('.luz__close').focus();
    };
    var closeLuz = function () {
      luz.classList.remove('is-open');
      setTimeout(function () { luz.hidden = true; }, 350);
      if (opener) opener.focus();
    };
    tiros.forEach(function (t, i) { t.addEventListener('click', function () { openLuz(i); }); });
    luz.querySelector('.luz__prev').addEventListener('click', function () { show(cur - 1); });
    luz.querySelector('.luz__next').addEventListener('click', function () { show(cur + 1); });
    luz.querySelector('.luz__close').addEventListener('click', closeLuz);
    luz.addEventListener('click', function (e) { if (e.target === luz) closeLuz(); });
    document.addEventListener('keydown', function (e) {
      if (luz.hidden) return;
      if (e.key === 'Escape') closeLuz();
      else if (e.key === 'ArrowRight') show(cur + 1);
      else if (e.key === 'ArrowLeft') show(cur - 1);
    });
  }

  /* ─── le viseur à la souris ─── */
  var vf = document.querySelector('.vf');
  if (vf && !reduce && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    document.body.classList.add('vf-ready');
    window.addEventListener('pointermove', function (e) {
      var t = e.target;
      var on = !!(t.closest && t.closest('.ch__stage'));
      vf.classList.toggle('is-on', on);
      vf.classList.toggle('is-link', on && !!t.closest('a, button'));
      vf.style.transform = 'translate(' + e.clientX + 'px,' + e.clientY + 'px)';
    }, { passive: true });
    document.addEventListener('pointerleave', function () { vf.classList.remove('is-on'); });
  }

  /* ─── la boucle ───
     Une image = une lecture, puis une écriture. Lire la position d'un
     élément juste après en avoir modifié un autre force le navigateur à
     tout recalculer, et c'est ce qui faisait « bloquer puis lâcher » le
     défilement au pavé tactile. Donc : toutes les mesures d'abord, les
     tailles fixes gardées de côté (recalculées au redimensionnement),
     puis toutes les modifications. */
  var hd = document.querySelector('.hd');
  var flo = document.querySelector('.float');
  var contato = document.querySelector('#contato');
  var ticking = false;
  var dims = {};
  function measure() {
    dims.vh = window.innerHeight;
    dims.max = document.documentElement.scrollHeight - dims.vh;
    dims.heroTop = hero ? hero.offsetTop : 0;
    dims.heroRun = hero ? hero.offsetHeight - dims.vh : 0;
  }
  function frame() {
    ticking = false;
    var vh = dims.vh, y = window.scrollY;
    /* lecture */
    var rects = chs.map(function (c) { return c.s.getBoundingClientRect(); });
    var cTop = contato ? contato.getBoundingClientRect().top : Infinity;
    var looseTops = loose.map(function (el) { return el._typed ? 0 : el.getBoundingClientRect().top; });
    /* écriture */
    if (hero && !reduce && dims.heroRun > 0) {
      hero.style.setProperty('--p', clamp(y / (dims.heroRun * 0.7), 0, 1).toFixed(3));
    }
    if (hd) {
      hd.classList.toggle('is-scrolled', y > dims.heroTop + dims.heroRun);
      hd.style.setProperty('--prog', (dims.max > 0 ? y / dims.max : 0).toFixed(4));
    }
    if (flo) flo.classList.toggle('is-on', y > dims.heroTop + dims.heroRun * 0.8 && cTop > vh * 0.5);
    chs.forEach(function (c, i) { chapterFrame(c, vh, rects[i]); });
    loose.forEach(function (el, i) {
      if (!el._typed && looseTops[i] < vh * 0.85) {
        el._typed = true;
        typeTimed(el, 100, 40);
      }
    });
  }
  /* le grain s'arrête pendant qu'on défile : un calque plein écran qui
     bouge en même temps que la page, c'est une image entière à
     recomposer à chaque pas */
  var scrollIdle = null;
  window.addEventListener('scroll', function () {
    document.body.classList.add('is-scrolling');
    clearTimeout(scrollIdle);
    scrollIdle = setTimeout(function () { document.body.classList.remove('is-scrolling'); }, 180);
    if (!ticking) { ticking = true; requestAnimationFrame(frame); }
  }, { passive: true });
  window.addEventListener('resize', function () { measure(); frame(); });
  window.addEventListener('load', function () { measure(); frame(); });
  measure();
  frame();
})();
