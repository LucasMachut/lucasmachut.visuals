// Manifeste Koisei (#journey .manifesto) : chaque ligne monte de sous son masque
// quand le titre arrive à 70 % de l'écran, les capsules photo s'ouvrent à 65 %.
import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Lines, Arrow } from './Segments.jsx';

export default function Manifesto({ data }) {
  const root = useRef(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const el = root.current;
    const title = el.querySelector('.manifesto');
    const tweens = [];
    el.querySelectorAll('.mLine > span').forEach((line, i) => {
      tweens.push(gsap.fromTo(line, { yPercent: 110, rotate: 1.5 }, {
        yPercent: 0, rotate: 0, duration: 1.1, ease: 'power4.out', delay: i * .09,
        scrollTrigger: { trigger: title, start: 'top 70%', toggleActions: 'play none none reverse' },
      }));
    });
    const capsule = matchMedia('(max-width: 767px)').matches ? 84 : 140;
    el.querySelectorAll('.mImg').forEach((img) => {
      tweens.push(gsap.to(img, {
        width: capsule, duration: 1.2, ease: 'power4.inOut',
        scrollTrigger: { trigger: title, start: 'top 65%', toggleActions: 'play none none reverse' },
      }));
    });
    return () => tweens.forEach((t) => { t.scrollTrigger && t.scrollTrigger.kill(); t.kill(); });
  }, []);

  return (
    <div ref={root} className="journey-inner">
      <p className="eyebrow journey-eyebrow"><i />{data.eyebrow}</p>
      <h2 className="manifesto t-title">
        <Lines lines={data.lines} />
      </h2>
      <div className="journey-text">
        <div>
          <p>{data.text}</p>
          <a href={data.link.href} className="u-link journey-link">
            {data.link.label}
            <Arrow size={16} />
          </a>
        </div>
      </div>
    </div>
  );
}
