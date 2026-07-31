/* ============================================================
   PORTFOLIO PAGE — séries de photos déroulées sur la page

   Les séries viennent du même data/fotos.json que la page Fotos,
   édité depuis /admin. Ajouter des photos dans le CMS les fait
   apparaître ici aussi : on n'écrit plus de HTML à la main, et
   surtout pas trois fois (PT, EN, FR).

   Sur le portfólio on n'en montre que huit — assez pour donner le
   ton d'une série, trop peu pour l'épuiser. Le bouton du bas mène
   à la série entière, sur la page Fotos.
   ============================================================ */

(function () {
  'use strict';

  const mount = document.getElementById('portfolio-series');
  if (!mount) return;

  const base = mount.dataset.base || '';          // '' en PT, '../' en en/fr
  const lang = mount.dataset.lang || 'pt';        // 'pt' | 'en' | 'fr'
  const moreLabel = mount.dataset.more || 'Ver a série completa';
  const limit = parseInt(mount.dataset.limit, 10) || 8;

  // Le portfólio général écarte les hôtels, la sous-page hôtellerie
  // ne garde qu'eux. Une seule liste de données, deux pages.
  const only = splitList(mount.dataset.only);
  const exclude = splitList(mount.dataset.exclude);

  fetch(base + 'data/fotos.json', { cache: 'no-cache' })
    .then(r => {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    })
    .then(data => render(data.series || []))
    .catch(err => {
      console.error('Portfolio series failed to load:', err);
    });

  function splitList(v) {
    return (v || '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
  }

  function render(series) {
    const kept = series.filter(s => {
      if (!(s.photos || []).length) return false;
      if (only.length) return only.indexOf(s.slug) !== -1;
      if (exclude.length) return exclude.indexOf(s.slug) === -1;
      return true;
    });
    if (!kept.length) return;

    // La numérotation reprend après les projets déjà posés dans la page
    // — galeries écrites en dur ou vignettes d'hôtels — pour que la
    // colonne de chiffres se lise d'une traite.
    let idx = document.querySelectorAll('.project-feature, .project-item').length;

    const frag = document.createDocumentFragment();

    kept.forEach(serie => {
      idx += 1;
      const name = serie['title_' + lang] || serie.title_pt || serie.slug || '';
      const type = serie['type_' + lang] || serie.type_pt || '';
      const place = serie.location || '';

      const section = document.createElement('section');
      section.className = 'project-feature';
      section.setAttribute('aria-label', name);

      /* — en-tête : le titre à gauche, le lieu et le type à droite — */
      const head = document.createElement('header');
      head.className = 'project-feature__head fi';

      const left = document.createElement('div');
      const num = document.createElement('p');
      num.className = 'project-feature__index';
      num.textContent = String(idx).padStart(2, '0');
      const title = document.createElement('h2');
      title.className = 'project-feature__title';
      title.textContent = name;
      left.appendChild(num);
      left.appendChild(title);
      head.appendChild(left);

      if (type || place) {
        const aside = document.createElement('div');
        aside.className = 'project-feature__aside';
        if (type) {
          const t = document.createElement('p');
          t.className = 'project-feature__type';
          t.textContent = type;
          aside.appendChild(t);
        }
        if (place) {
          const l = document.createElement('p');
          l.className = 'project-feature__loc';
          l.textContent = place;
          aside.appendChild(l);
        }
        head.appendChild(aside);
      }

      /* — la galerie, coupée à huit — */
      const gallery = document.createElement('div');
      gallery.className = 'project-gallery project-gallery--inline';
      const inner = document.createElement('div');
      inner.className = 'project-gallery__inner';

      serie.photos.slice(0, limit).forEach(src => {
        const fig = document.createElement('figure');
        fig.className = 'project-gallery__item fi';
        const img = document.createElement('img');
        img.loading = 'lazy';
        img.decoding = 'async';
        img.src = base + src;
        img.alt = name + ' — Lucas Machut Visuals';
        fig.appendChild(img);
        inner.appendChild(fig);
      });
      gallery.appendChild(inner);

      /* — le bouton ne s'affiche que s'il reste des photos à voir — */
      section.appendChild(head);
      section.appendChild(gallery);

      if (serie.photos.length > limit) {
        const more = document.createElement('div');
        more.className = 'project-feature__more fi';
        const a = document.createElement('a');
        a.className = 'btn btn--outline';
        a.href = 'fotos.html#' + serie.slug;
        a.textContent = moreLabel;
        more.appendChild(a);
        section.appendChild(more);
      }

      frag.appendChild(section);
    });

    // Les sections rejoignent le flux à la place du point d'ancrage, en
    // sœurs des projets déjà là : sans ça le premier bloc injecté serait
    // à son tour :first-of-type et redoublerait le filet du dessus.
    const fresh = [...frag.querySelectorAll('.fi')];
    mount.parentNode.insertBefore(frag, mount.nextSibling);
    reveal(fresh);
  }

  /* Le fondu du site n'observe que les .fi présents au chargement :
     ceux qu'on injecte après le fetch ont besoin du leur. */
  function reveal(els) {
    if (!els.length) return;
    if ('IntersectionObserver' in window) {
      const obs = new IntersectionObserver(
        entries => {
          entries.forEach(e => {
            if (e.isIntersecting) {
              e.target.classList.add('on');
              obs.unobserve(e.target);
            }
          });
        },
        { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
      );
      els.forEach(el => obs.observe(el));
    } else {
      els.forEach(el => el.classList.add('on'));
    }
  }
})();
