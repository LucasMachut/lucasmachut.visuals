/* Accueil — version téléphone (.mv). Autonome, ne touche pas à la
   version grand écran (.dv, js/home.js).
   Ne démarre que si l'écran fait 860 px ou moins ; si une fenêtre
   passe sous ce seuil plus tard, il démarre à ce moment-là. */
(function () {
  'use strict';

  var mq = window.matchMedia('(max-width: 860px)');
  var started = false;
  function start() {
    if (started || !mq.matches) return;
    started = true;
    init();
  }
  if (mq.addEventListener) mq.addEventListener('change', start);
  else if (mq.addListener) mq.addListener(start);
  start();

  function init() {

    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
    function ease(x) { return 1 - Math.pow(1 - x, 3); }

    /* ─── la frappe ───
       Un texte tapé lettre à lettre, avec le chariot qui clignote. Soit
       au temps (la ligne d'ouverture), soit au défilement (les numéros de
       chapitre) : typeAt(el, 0..1) pose la part de texte déjà frappée. */
    function prepType(el) {
      el._full = el.getAttribute('data-type') || '';
      el._shown = -1;
      el.setAttribute('aria-label', el._full);
    }
    function typeAt(el, f) {
      var n = Math.round(clamp(f, 0, 1) * el._full.length);
      if (n === el._shown) return;
      el._shown = n;
      el.innerHTML = '';
      el.appendChild(document.createTextNode(el._full.slice(0, n)));
      if (n < el._full.length || f < 1.05) {
        var c = document.createElement('span');
        c.className = 'caret';
        el.appendChild(c);
      }
    }
    function typeTimed(el, delay, speed) {
      prepType(el);
      if (reduce) { el.textContent = el._full; return; }
      var i = 0;
      setTimeout(function tick() {
        i++;
        typeAt(el, i / el._full.length);
        if (i < el._full.length) setTimeout(tick, speed + Math.random() * speed);
        else setTimeout(function () { el.textContent = el._full; }, 2200);
      }, delay);
    }

    /* ─── ouverture ─── */
    var mv = document.querySelector('.mv');
    var open = mv.querySelector('.open');
    var film = mv.querySelector('.open__v');
    var top = mv.querySelector('.top');
    var line = mv.querySelector('.open__line');
    if (line) typeTimed(line, 2600, 45);
    if (film) {
      film.muted = true;
      var p = film.play();
      /* iOS en économie d'énergie refuse la lecture : on relance au
         premier geste, le poster tient le cadre entre-temps */
      if (p && p.catch) p.catch(function () {
        var go = function () { film.play().catch(function () {}); };
        ['touchstart', 'scroll', 'click'].forEach(function (e) {
          window.addEventListener(e, go, { once: true, passive: true });
        });
      });
      /* un onglet ouvert en arrière-plan ne lance pas le film, et iOS
         le laisse parfois en pause au retour : on relance à l'affichage */
      document.addEventListener('visibilitychange', function () {
        if (!document.hidden && film.paused) film.play().catch(function () {});
      });
    }

    /* ─── chapitres ─── */
    var chs = Array.prototype.slice.call(mv.querySelectorAll('.ch')).map(function (s) {
      var beats = Array.prototype.slice.call(s.querySelectorAll('.beat')).map(function (b) {
        return {
          el: b,
          items: Array.prototype.slice.call(b.querySelectorAll('.rv')),
          ems: Array.prototype.slice.call(b.querySelectorAll('h2 em'))
        };
      });
      var n = s.querySelector('.ch__n');
      if (n) { prepType(n); if (reduce) n.textContent = n._full; }
      var c = {
        s: s, beats: beats, n: n,
        stage: s.querySelector('.ch__stage'),
        veil: s.querySelector('.ch__veil'),
        imgs: Array.prototype.slice.call(s.querySelectorAll('.ch__photos img')),
        serie: s.querySelector('.mserie'),
        count: s.querySelector('.ch__count span'),
        seen: false, nudged: false
      };
      /* le compteur de la série suit le pouce */
      if (c.serie && c.count) {
        c.serie.addEventListener('scroll', function () {
          c.count.textContent = Math.round(c.serie.scrollLeft / c.serie.clientWidth) + 1;
        }, { passive: true });
      }
      return c;
    });

    /* Découpage d'un chapitre, en part de sa course collée (q, 0 → 1) :
       0    → .30  la photo seule, qui se pose (léger recul du zoom)
       .30  → .92  les temps de texte, chacun sa tranche : le voile monte,
                   le numéro se tape, les lignes arrivent une à une ; le
                   temps suivant chasse le précédent
       .92  → 1    tout reste, puis la section suivante recouvre celle-ci */
    var T0 = 0.30, T1 = 0.92;

    function chapterFrame(c, vh) {
      var r = c.s.getBoundingClientRect();
      if (r.bottom < -50 || r.top > vh + 50) return;
      var run = c.s.offsetHeight - vh;
      var q = clamp(-r.top / run, 0, 1);

      /* à l'arrivée à l'écran : mise au point et fuite de lumière, une fois */
      if (!c.seen && r.top < vh * 0.35) {
        c.seen = true;
        c.s.classList.add('is-in');
      }
      /* une série se présente : elle glisse d'un cran vers la suivante et
         revient, pour dire qu'on peut la pousser du pouce */
      if (c.serie && !c.nudged && q > 0.12 && !reduce) {
        c.nudged = true;
        c.serie.scrollTo({ left: c.serie.clientWidth * 0.22, behavior: 'smooth' });
        setTimeout(function () { c.serie.scrollTo({ left: 0, behavior: 'smooth' }); }, 650);
      }

      var z = 1.06 - 0.06 * ease(clamp(q / T0, 0, 1));
      c.imgs.forEach(function (i) { i.style.setProperty('--z', z.toFixed(4)); });

      if (reduce) return;

      c.veil.style.setProperty('--v', clamp((q - T0 + 0.06) / 0.14, 0, 1).toFixed(3));

      var nb = c.beats.length, L = (T1 - T0) / nb;
      c.beats.forEach(function (b, k) {
        var u = (q - T0 - k * L) / L;                      /* 0 → 1 dans sa tranche */
        var out = k < nb - 1 ? clamp((u - 0.82) / 0.18, 0, 1) : 0;
        /* le numéro appartient au premier temps : il part avec lui */
        if (k === 0 && c.n) {
          typeAt(c.n, clamp(u / 0.28, 0, 1.1));
          c.n.style.opacity = (1 - out).toFixed(3);
        }
        b.items.forEach(function (it, j) {
          var f = ease(clamp((u - 0.12 - j * 0.13) / 0.3, 0, 1));
          var o = f * (1 - out);
          it.style.opacity = o.toFixed(3);
          it.style.transform = 'translate3d(0,' + ((1 - f) * 34 - out * 24).toFixed(1) + 'px,0)';
        });
        /* le soulignement à la main se trace après l'arrivée du titre */
        b.ems.forEach(function (em) {
          em.style.setProperty('--u', (clamp((u - 0.4) / 0.3, 0, 1) * 100).toFixed(1) + '%');
        });
      });
    }

    /* ─── la page de papier : le numéro se tape à l'arrivée ─── */
    var folhaN = mv.querySelector('.folha__n');
    if (folhaN) prepType(folhaN);

    /* ─── la barre du pouce et le sommaire ─── */
    var bar = mv.querySelector('.bar');
    var barN = bar.querySelector('.bar__n');
    var barName = bar.querySelector('.bar__name');
    var barBtn = bar.querySelector('.bar__ch');
    var sheet = mv.querySelector('#sumario');
    var list = sheet.querySelector('.sheet__list');
    var marks = Array.prototype.slice.call(mv.querySelectorAll('[data-ch]'));
    var links = marks.map(function (s) {
      if (!s.id) s.id = 'cap-' + s.getAttribute('data-ch');
      var li = document.createElement('li');
      var a = document.createElement('a');
      a.href = '#' + s.id;
      a.innerHTML = '<span>' + s.getAttribute('data-ch') + '</span>' + s.getAttribute('data-name');
      a.addEventListener('click', function (e) {
        e.preventDefault();
        closeSheet();
        /* on arrive au moment où le texte est posé, pas sur la photo nue */
        var t = s.offsetTop + (s.classList.contains('ch') ? (s.offsetHeight - window.innerHeight) * 0.62 : 0);
        window.scrollTo({ top: t, behavior: reduce ? 'auto' : 'smooth' });
      });
      li.appendChild(a);
      list.appendChild(li);
      return a;
    });
    sheet.hidden = false;
    function openSheet() { sheet.classList.add('is-open'); barBtn.setAttribute('aria-expanded', 'true'); }
    function closeSheet() { sheet.classList.remove('is-open'); barBtn.setAttribute('aria-expanded', 'false'); }
    barBtn.addEventListener('click', function () {
      sheet.classList.contains('is-open') ? closeSheet() : openSheet();
    });
    sheet.addEventListener('click', function (e) { if (e.target === sheet) closeSheet(); });

    var cur = -2;
    function navFrame(vh, y) {
      var mid = y + vh * 0.5, n = -1;
      marks.forEach(function (s, i) { if (s.offsetTop <= mid) n = i; });
      if (n !== cur) {
        cur = n;
        barN.textContent = n < 0 ? '00' : marks[n].getAttribute('data-ch');
        barName.textContent = n < 0 ? 'abertura' : marks[n].getAttribute('data-name');
        links.forEach(function (a, i) { a.classList.toggle('is-cur', i === n); });
      }
      var max = document.documentElement.scrollHeight - vh;
      bar.style.setProperty('--prog', (max > 0 ? y / max : 0).toFixed(4));
    }

    /* ─── l'album, au doigt ───
       On attrape le tirage du dessus et on le pousse. Au-delà d'un seuil
       (ou d'un geste vif), il part du côté poussé en pivotant, puis se
       glisse sous la pile : l'album ne finit jamais. En deçà, il revient
       se poser. Le défilement vertical de la page reste libre
       (touch-action: pan-y). */
    var album = mv.querySelector('.album');
    if (album) {
      var cards = Array.prototype.slice.call(album.querySelectorAll('.tirage'));
      var counter = album.querySelector('.album__n span');
      var order = cards.slice();
      var shown = 0;

      var layout = function (animate) {
        order.forEach(function (c, d) {
          var dd = Math.min(d, 3);
          c.style.transition = animate ? 'transform .5s cubic-bezier(.3,.7,.2,1), filter .5s ease' : 'none';
          c.style.zIndex = String(order.length - d);
          c.style.transform = 'translate(-50%,-50%) translateY(' + (dd * 9) + 'px) scale(' + (1 - dd * 0.03) + ') rotate(var(--r,0deg))';
          c.style.filter = 'brightness(' + (1 - dd * 0.17) + ')';
          c.style.visibility = d > 3 ? 'hidden' : 'visible';
        });
        counter.textContent = ('0' + (cards.indexOf(order[0]) + 1)).slice(-2);
      };
      layout(false);

      var drag = null;
      album.addEventListener('pointerdown', function (e) {
        var c = order[0];
        if (!c.contains(e.target)) return;
        drag = { c: c, x: e.clientX, y: e.clientY, t: performance.now(), dx: 0, locked: null, id: e.pointerId };
        c.style.transition = 'none';
      });
      album.addEventListener('pointermove', function (e) {
        if (!drag || e.pointerId !== drag.id) return;
        var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
        /* le premier mouvement franc décide : horizontal, c'est l'album ;
           vertical, c'est la page, on lâche */
        if (drag.locked === null && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
          drag.locked = Math.abs(dx) > Math.abs(dy);
          if (!drag.locked) { drag = null; return; }
          drag.c.classList.add('is-drag');
          try { drag.c.setPointerCapture(e.pointerId); } catch (err) {}
        }
        if (!drag.locked) return;
        drag.dx = dx;
        drag.c.style.transform = 'translate(-50%,-50%) translate(' + dx + 'px,' + (Math.abs(dx) * -0.08) + 'px) rotate(calc(var(--r,0deg) + ' + (dx * 0.06) + 'deg))';
      });
      var release = function (e) {
        if (!drag || e.pointerId !== drag.id) return;
        var c = drag.c, dx = drag.dx;
        var v = Math.abs(dx) / Math.max(1, performance.now() - drag.t);
        c.classList.remove('is-drag');
        drag = null;
        if (Math.abs(dx) > album.clientWidth * 0.25 || (v > 0.6 && Math.abs(dx) > 30)) {
          var side = dx > 0 ? 1 : -1;
          c.style.transition = 'transform .45s cubic-bezier(.2,.6,.3,1)';
          c.style.transform = 'translate(-50%,-50%) translate(' + (side * album.clientWidth * 1.15) + 'px,-40px) rotate(calc(var(--r,0deg) + ' + (side * 22) + 'deg))';
          setTimeout(function () {
            order.push(order.shift());
            layout(false);
            /* il revient sous la pile sans être vu, puis la pile se range */
            requestAnimationFrame(function () { layout(true); });
          }, 430);
        } else {
          layout(true);
        }
      };
      album.addEventListener('pointerup', release);
      album.addEventListener('pointercancel', release);

      /* à la première rencontre, le tirage du dessus se soulève et
         retombe : on comprend qu'il se prend en main */
      if ('IntersectionObserver' in window && !reduce) {
        var io = new IntersectionObserver(function (en) {
          if (!en[0].isIntersecting) return;
          io.disconnect();
          var c = order[0];
          setTimeout(function () {
            c.style.transition = 'transform .45s cubic-bezier(.3,.7,.2,1)';
            c.style.transform = 'translate(-50%,-50%) translate(38px,-10px) rotate(calc(var(--r,0deg) + 4deg))';
            setTimeout(function () { layout(true); }, 480);
          }, 500);
        }, { threshold: 0.6 });
        io.observe(album);
      }
    }

    /* ─── la boucle ─── */
    var ticking = false;
    function frame() {
      ticking = false;
      if (!mq.matches) return;
      var vh = window.innerHeight, y = window.scrollY;
      var openEnd = open ? open.offsetTop + open.offsetHeight - vh : 0;
      if (open && !reduce) {
        var p = clamp(y / (Math.max(1, open.offsetHeight - vh) * 0.75), 0, 1);
        open.style.setProperty('--p', p.toFixed(3));
      }
      top.classList.toggle('is-hidden', y > openEnd * 0.9);
      bar.classList.toggle('is-on', y > openEnd * 0.6);

      chs.forEach(function (c) { chapterFrame(c, vh); });

      if (folhaN) {
        var fr = folhaN.getBoundingClientRect();
        typeAt(folhaN, reduce ? 1 : clamp((vh * 0.9 - fr.top) / (vh * 0.3), 0, 1.1));
      }
      navFrame(vh, y);
      ticking = false;
    }
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(frame); }
    }, { passive: true });
    window.addEventListener('resize', frame);
    frame();
  }
})();
