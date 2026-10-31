// Vignette YouTube : rien ne se charge de YouTube avant le toucher.
import { useState } from 'react';

export default function VideoFacade({ id, title, format }) {
  const [on, setOn] = useState(false);
  return (
    <div className={`vf vf--${format}`}>
      {on
        ? <iframe src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`} title={title}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen />
        : <button className="vf-btn" onClick={() => setOn(true)} aria-label={title}>
            <img src={`https://i.ytimg.com/vi/${id}/maxresdefault.jpg`} alt="" loading="lazy"
              onError={(e) => { if (!e.currentTarget.src.includes('hqdefault')) e.currentTarget.src = `https://i.ytimg.com/vi/${id}/hqdefault.jpg`; }} />
            <span className="vf-play"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg></span>
          </button>}
    </div>
  );
}
