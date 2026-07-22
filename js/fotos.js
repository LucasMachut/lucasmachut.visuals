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

  setupLightbox();

  fetch(base + 'data/fotos.json', { cache: 'no-cache' })
    .then(r => {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    })
    .then(data => render(data.series || []))
    .catch(err => {
      console.error('Fotos gallery failed to load:', err);
    });

  function render(series) {
    const frag = document.createDocumentFragment();
    let idx = 0;

    series.forEach(serie => {
      const photos = serie.photos || [];
      if (!photos.length) return;
      idx += 1;

      const name =
        serie['title_' + lang] || serie.title_pt || serie.slug || '';
      const num = String(idx).padStart(2, '0');

      const section = document.createElement('section');
      section.className = 'project-gallery fotos-series';
      section.setAttribute('aria-label', name);

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

      wrap.appendChild(label);
      wrap.appendChild(title);
      wrap.appendChild(inner);
      section.appendChild(wrap);
      frag.appendChild(section);
    });

    mount.appendChild(frag);
    reveal(mount.querySelectorAll('.fi'));
  }

  /* Tap/click a photo to view it full-screen. Delegated on the mount so
     it also covers the images injected after fetch. */
  function setupLightbox() {
    const box = document.createElement('div');
    box.className = 'fotos-lightbox';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-hidden', 'true');
    box.innerHTML =
      '<button class="fotos-lightbox__close" aria-label="Fermer" type="button">&times;</button>' +
      '<img class="fotos-lightbox__img" alt="" />';
    document.body.appendChild(box);

    const boxImg = box.querySelector('.fotos-lightbox__img');

    const open = src => {
      boxImg.src = src;
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

    mount.addEventListener('click', e => {
      const img = e.target.closest('.project-gallery__item img');
      if (img) open(img.currentSrc || img.src);
    });
    box.addEventListener('click', close);          // tap anywhere (or ×) closes
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && box.classList.contains('open')) close();
    });
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
