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
  const pageLabel = mount.dataset.project || '';   // projets qui ont leur propre page
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
      // Un fetch n'existe pas quand la page est ouverte depuis le
      // disque : file:// le bloque, sans recours. La page se réduisait
      // alors au seul projet écrit en dur dans le HTML, en silence.
      // Chaque page porte donc une copie des séries, dont on ne se sert
      // que là. Sur le site en ligne le fetch passe et c'est le CMS qui
      // décide ; la copie se resynchronise avec
      // tools/sync_portfolio_fallback.py.
      console.warn('Portfolio series: fetch indisponible, on retombe sur la copie de la page.', err);
      const inline = document.getElementById('portfolio-series-data');
      if (!inline) return;
      try {
        render((JSON.parse(inline.textContent) || {}).series || []);
      } catch (e) {
        console.error('Portfolio series: copie de secours illisible.', e);
      }
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

      /* Pas de film ici. Certains projets en ont un — la clé `videos`
         de fotos.json le note — mais il reste sur la page du projet :
         le portfólio est une suite d'images qu'on parcourt d'un trait,
         et un lecteur vidéo au milieu arrête la lecture. */

      /* — la galerie, la vitrine du projet — */
      const gallery = document.createElement('div');
      gallery.className = 'project-gallery project-gallery--inline';
      const inner = document.createElement('div');
      inner.className = 'project-gallery__inner';

      /* La vitrine d'un projet, c'est son dossier `destaque` : on montre
         ce qu'il contient, dans l'ordre. Sans ce dossier on retombe sur
         les premières photos de la série, comme avant. La liste est
         inscrite dans fotos.json par tools/sync_portfolio.py. */
      const shots = (serie.destaque && serie.destaque.length)
        ? serie.destaque
        : serie.photos.slice(0, limit);

      shots.forEach(src => {
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

      section.appendChild(head);
      section.appendChild(gallery);

      /* — le bouton ne s'affiche que s'il reste quelque chose à voir —
         Un projet qui a sa propre page y mène (fotos.json, clé `page`) ;
         les autres renvoient à leur série sur la page Fotos. */
      const own = serie.page;
      if (own || serie.photos.length > shots.length) {
        const more = document.createElement('div');
        more.className = 'project-feature__more fi';
        const a = document.createElement('a');
        a.className = 'btn btn--outline';
        /* ?serie= et non #ancre : l'ancre ouvrait la page entière et
           faisait défiler jusqu'au bon endroit — on venait voir un
           projet, on tombait sur la pile de tous les autres. */
        a.href = own || ('fotos.html?serie=' + encodeURIComponent(serie.slug));
        a.textContent = own && pageLabel ? pageLabel : moreLabel;
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
