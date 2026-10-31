// Plein écran des plaques d'une série. Les plaques restent du HTML Astro
// (bouton [data-lb]) ; ce composant écoute leurs clics et ouvre la photo en grand.
// Gestes : glisser gauche/droite (pointer events, marche au doigt), flèches,
// clavier ← → ; fermer par ✕, Échap ou un glissement vers le bas.
import { useEffect, useRef, useState } from 'react';

export default function SerieLightbox({ photos, labels }) {
  const [i, setI] = useState(-1);
  const start = useRef(null);
  const open = i >= 0;
  const n = photos.length;
  const go = (d) => setI((v) => (v + d + n) % n);

  useEffect(() => {
    const onClick = (e) => {
      const b = e.target.closest('[data-lb]');
      if (b) setI(Number(b.dataset.lb));
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') setI(-1);
      if (e.key === 'ArrowRight') go(1);
      if (e.key === 'ArrowLeft') go(-1);
    };
    document.addEventListener('keydown', onKey);
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.documentElement.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;
  const p = photos[i];

  const down = (e) => { start.current = { x: e.clientX, y: e.clientY }; };
  const up = (e) => {
    if (!start.current) return;
    const dx = e.clientX - start.current.x, dy = e.clientY - start.current.y;
    start.current = null;
    if (dy > 80 && Math.abs(dy) > Math.abs(dx)) setI(-1);
    else if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
  };

  return (
    <div className="lb" role="dialog" aria-modal="true" aria-label={labels.dialog}>
      <div className="lb-stage" onPointerDown={down} onPointerUp={up} onPointerCancel={() => (start.current = null)}>
        <img key={p.src} className="lb-img" src={p.src} alt={p.alt} draggable="false" />
      </div>
      <button className="lb-close" onClick={() => setI(-1)} aria-label={labels.close}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M5 5l14 14M19 5L5 19" /></svg>
      </button>
      <button className="lb-arrow lb-prev" onClick={() => go(-1)} aria-label={labels.prev}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M15 5l-7 7 7 7" /></svg>
      </button>
      <button className="lb-arrow lb-next" onClick={() => go(1)} aria-label={labels.next}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M9 5l7 7-7 7" /></svg>
      </button>
      <p className="lb-count">{String(i + 1).padStart(2, '0')} / {String(n).padStart(2, '0')}</p>
    </div>
  );
}
