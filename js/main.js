/* ============================================================
   LUCAS MACHUT VISUALS — MAIN JS
   ============================================================ */

(function () {
  'use strict';

  /* --- YouTube facade: swap poster for iframe on click --- */
  /* Heavy YT iframe (~500 KB JS + assets) loads only when the
     user clicks the cleaned-up thumbnail. */
  /* L'écoute est posée sur le document, pas sur chaque vignette : le
     portfólio construit ses façades après coup, une fois les séries
     chargées, et des écouteurs posés au chargement les auraient
     manquées — la vignette restait muette au clic. */
  const activateFacade = el => {
    const id = el.dataset.video;
    if (!id) return;
    const title = el.dataset.title || '';
    const iframe = document.createElement('iframe');
    iframe.src = 'https://www.youtube-nocookie.com/embed/' + id +
                 '?autoplay=1&rel=0&vq=hd1080&modestbranding=1&playsinline=1';
    iframe.title = title;
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
    iframe.setAttribute('allowfullscreen', '');
    iframe.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;border:none;';
    el.replaceWith(iframe);
  };

  document.addEventListener('click', e => {
    const el = e.target.closest && e.target.closest('.video-facade');
    if (el) activateFacade(el);
  });
  document.addEventListener('keydown', e => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const el = e.target.closest && e.target.closest('.video-facade');
    if (el) { e.preventDefault(); activateFacade(el); }
  });

  /* --- Hero video autoplay safety net -------------------- */
  /* autoplay+muted is honored by most browsers, but some block it
     until the user interacts (Safari/iOS, brave with strict
     settings, Chromium when tabs run in background, etc.).
     Forcing .play() after metadata is loaded recovers from those
     cases; the promise rejection is swallowed silently. */
  document.querySelectorAll('video[autoplay]').forEach(v => {
    const tryPlay = () => { v.play().catch(() => {}); };
    if (v.readyState >= 2) {
      tryPlay();
    } else {
      v.addEventListener('loadedmetadata', tryPlay, { once: true });
      v.addEventListener('canplay', tryPlay, { once: true });
    }
  });

  /* --- Header scroll behavior ---------------------------- */
  const header = document.querySelector('.header');
  if (header) {
    const onScroll = () => {
      header.classList.toggle('scrolled', window.scrollY > 50);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* --- Mobile nav toggle --------------------------------- */
  const toggle = document.querySelector('.nav__toggle');
  const mobileNav = document.querySelector('.nav__mobile');

  if (toggle && mobileNav) {
    toggle.addEventListener('click', () => {
      const isOpen = mobileNav.classList.toggle('open');
      toggle.classList.toggle('open', isOpen);
      document.body.style.overflow = isOpen ? 'hidden' : '';
      toggle.setAttribute('aria-expanded', String(isOpen));
    });

    mobileNav.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        mobileNav.classList.remove('open');
        toggle.classList.remove('open');
        document.body.style.overflow = '';
      });
    });
  }

  /* --- Intersection Observer: fade-in -------------------- */
  const fiEls = document.querySelectorAll('.fi');
  if (fiEls.length && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            e.target.classList.add('on');
            observer.unobserve(e.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );
    fiEls.forEach(el => observer.observe(el));
  } else {
    fiEls.forEach(el => el.classList.add('on'));
  }

  /* --- Active nav link ----------------------------------- */
  const page = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav__link').forEach(link => {
    const href = (link.getAttribute('href') || '').split('#')[0].split('/').pop();
    if (href === page || (page === '' && href === 'index.html')) {
      link.classList.add('active');
    }
  });

  /* --- Contact form -------------------------------------- */
  const form = document.querySelector('.contact-form');
  if (form) {
    form.addEventListener('submit', e => {
      e.preventDefault();
      const btn = form.querySelector('.form-submit-btn');
      if (btn) {
        btn.textContent = 'Mensagem enviada.';
        btn.disabled = true;
        btn.style.opacity = '0.6';
      }
      /* TODO: Integrate with Formspree, Netlify Forms or similar service */
    });
  }

})();
