/* ============================================================
   FOTOS PAGE — data-driven gallery renderer
   Reads data/fotos.json and builds the series galleries.
   The photo list is managed via /admin (Sveltia CMS), so this
   page stays in sync without hand-editing HTML.
   ============================================================ */

(function () {
  'use strict';

  const mount = document.getElementById('fotos-gallery');
  if (!mount) return;

  const base = mount.dataset.base || '';        // '' on PT, '../' on en/fr
  const lang = mount.dataset.lang || 'pt';      // 'pt' | 'en' | 'fr'
  const serieLabel = mount.dataset.serieLabel || 'SÉRIE';
  const backLabel = mount.dataset.back || '';
  const backHref = mount.dataset.backHref || 'portfolio.html';

  /* fotos.html?serie=forro n'ouvre que cette série. Le portfólio y
     renvoie ainsi projet par projet : on vient voir un travail précis,
     pas la pile de tout ce qui existe. Sans paramètre, la page reste
     ce qu'elle était — la sélection entière. */
  const solo = (new URLSearchParams(location.search).get('serie') || '').trim();

  setupLightbox();

  fetch(base + 'data/fotos.json', { cache: 'no-cache' })
    .then(r => {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    })
    .then(data => render(data.series || []))
    .catch(err => {
      // Même secours que sur le portfólio : une page ouverte depuis le
      // disque n'a pas de fetch, et la galerie restait vide.
      console.warn('Fotos: fetch indisponible, on retombe sur la copie de la page.', err);
      const inline = document.getElementById('fotos-series-data');
      if (!inline) return;
      try {
        render((JSON.parse(inline.textContent) || {}).series || []);
      } catch (e) {
        console.error('Fotos: copie de secours illisible.', e);
      }
    });

  function render(series) {
    const frag = document.createDocumentFragment();
    let idx = 0;

    let list = series;
    let alone = false;
    if (solo) {
      const found = series.filter(s => s.slug === solo && (s.photos || []).length);
      if (found.length) {
        list = found;
        alone = true;
        soloHeader(found[0]);
      }
    }

    list.forEach(serie => {
      const photos = serie.photos || [];
      if (!photos.length) return;
      idx += 1;

      const name =
        serie['title_' + lang] || serie.title_pt || serie.slug || '';
      const num = String(idx).padStart(2, '0');

      const section = document.createElement('section');
      section.className = 'project-gallery fotos-series';
      section.setAttribute('aria-label', name);
      // Ancre de série : le portfólio n'en montre que huit photos et
      // renvoie ici, sur la série entière (fotos.html#forro).
      if (serie.slug) section.id = serie.slug;

      const wrap = document.createElement('div');
      wrap.className = 'wrap';

      const label = document.createElement('span');
      label.className = 'label fi';
      label.textContent = serieLabel + ' ' + num;

      const title = document.createElement('h2');
      title.className = 'fotos-series__title fi fi-d1';
      title.textContent = name;

      const inner = document.createElement('div');
      inner.className = 'project-gallery__inner';

      photos.forEach(src => {
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

      /* Sur une série seule, le titre de la page porte déjà le nom :
         le redoubler ici ferait deux fois le même mot. */
      if (!alone) {
        wrap.appendChild(label);
        wrap.appendChild(title);
      }
      wrap.appendChild(inner);
      section.appendChild(wrap);
      frag.appendChild(section);
    });

    mount.appendChild(frag);
    reveal(mount.querySelectorAll('.fi'));
  }

  /* Une série seule prend le haut de la page : son nom devient le titre,
     et le chapô laisse place au chemin de retour vers le portfólio. */
  function soloHeader(serie) {
    const name = serie['title_' + lang] || serie.title_pt || serie.slug || '';
    document.title = name + ' — Lucas Machut Visuals';
    const hero = document.querySelector('.page-hero');
    if (!hero) return;
    const h1 = hero.querySelector('h1');
    if (h1) h1.textContent = name;
    const lede = hero.querySelector('p');
    if (!lede) return;
    if (!backLabel) { lede.remove(); return; }
    lede.textContent = '';
    const a = document.createElement('a');
    a.href = backHref;
    a.className = 'project-back__link';
    a.textContent = backLabel;
    lede.appendChild(a);
  }

  /* Tap/click a photo to view it full-screen, then swipe or use the arrows
     to move through the same series — Instagram-style. Delegated on the
     mount so it also covers the images injected after fetch. */
  function setupLightbox() {
    const box = document.createElement('div');
    box.className = 'fotos-lightbox';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-hidden', 'true');
    box.innerHTML =
      '<button class="fotos-lightbox__close" aria-label="Fermer" type="button">&times;</button>' +
      '<button class="fotos-lightbox__nav fotos-lightbox__nav--prev" aria-label="Précédente" type="button">&#8249;</button>' +
      '<img class="fotos-lightbox__img" alt="" />' +
      '<button class="fotos-lightbox__nav fotos-lightbox__nav--next" aria-label="Suivante" type="button">&#8250;</button>' +
      '<span class="fotos-lightbox__count" aria-hidden="true"></span>';
    document.body.appendChild(box);

    const boxImg = box.querySelector('.fotos-lightbox__img');
    const count = box.querySelector('.fotos-lightbox__count');
    const btnPrev = box.querySelector('.fotos-lightbox__nav--prev');
    const btnNext = box.querySelector('.fotos-lightbox__nav--next');

    let list = [];      // photo srcs of the current series
    let index = 0;

    const show = i => {
      index = (i + list.length) % list.length;   // wrap around
      boxImg.src = list[index];
      count.textContent = (index + 1) + ' / ' + list.length;
      const solo = list.length < 2;
      btnPrev.hidden = btnNext.hidden = solo;
    };
    const open = (srcs, i) => {
      list = srcs;
      show(i);
      box.classList.add('open');
      box.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    };
    const close = () => {
      box.classList.remove('open');
      box.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      boxImg.removeAttribute('src');
    };
    const next = () => show(index + 1);
    const prev = () => show(index - 1);

    // Open: collect the srcs of the series (section) the photo belongs to
    mount.addEventListener('click', e => {
      const img = e.target.closest('.project-gallery__item img');
      if (!img) return;
      const section = img.closest('.fotos-series');
      const imgs = [...section.querySelectorAll('.project-gallery__item img')];
      open(imgs.map(im => im.currentSrc || im.src), imgs.indexOf(img));
    });

    btnPrev.addEventListener('click', e => { e.stopPropagation(); prev(); });
    btnNext.addEventListener('click', e => { e.stopPropagation(); next(); });

    // Tap the dark area (not the image or a button) closes.
    box.addEventListener('click', e => {
      if (e.target === box || e.target === boxImg) close();
    });
    box.querySelector('.fotos-lightbox__close')
       .addEventListener('click', e => { e.stopPropagation(); close(); });

    document.addEventListener('keydown', e => {
      if (!box.classList.contains('open')) return;
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowRight') next();
      else if (e.key === 'ArrowLeft') prev();
    });

    // Touch swipe: horizontal drag navigates; a still tap on the image closes.
    let sx = 0, sy = 0, moved = false;
    box.addEventListener('touchstart', e => {
      const t = e.changedTouches[0];
      sx = t.clientX; sy = t.clientY; moved = false;
    }, { passive: true });
    box.addEventListener('touchend', e => {
      const t = e.changedTouches[0];
      const dx = t.clientX - sx, dy = t.clientY - sy;
      if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) {
        moved = true;
        dx < 0 ? next() : prev();
      }
    }, { passive: true });
    // Swallow the click that follows a swipe so it doesn't close the box.
    box.addEventListener('click', e => { if (moved) { e.stopPropagation(); moved = false; } }, true);
  }

  /* Re-run the same fade-in used site-wide on the injected elements
     (main.js only observes .fi that existed at initial load). */
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
