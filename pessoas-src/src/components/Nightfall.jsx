// Tombée de la nuit Koisei (#nightfall) : une fenêtre (inset 11vh 24vw) s'ouvre
// jusqu'au plein écran pendant que le fond passe du lin au brun terre, puis une
// photo de jour se dissout dans une photo de nuit (bruit fbm, WebGL).
import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Lines } from './Segments.jsx';
import { pinPriority, scheduleRefresh } from './scroll.js';

export default function Nightfall({ data }) {
  const root = useRef(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const sec = root.current;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const can = sec.querySelector('.dissolve');
    const kicker = sec.querySelector('.nf-kicker'), title = sec.querySelector('.nf-title');
    let alive = true, renderer = null, tick = null, onResize = null, tl = null;
    const dUni = { uP: { value: reduced ? 1 : 0 } };

    if (reduced) {
      sec.style.background = 'var(--terra)';
      gsap.set([kicker, title], { opacity: 1, color: 'var(--creme)' });
    } else {
      tl = gsap.timeline({ scrollTrigger: { trigger: sec, start: 'top top', end: '+=200%', pin: true, scrub: 1,
        refreshPriority: pinPriority(sec) } });
      tl.fromTo(sec.querySelector('.dissolveWrap'), { clipPath: 'inset(11vh 24vw)' }, { clipPath: 'inset(0vh 0vw)', ease: 'none', duration: 40 }, 0)
        .fromTo(kicker, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 8 }, 8)
        .fromTo(title, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 10 }, 10)
        .to(sec, { backgroundColor: '#2E2620', duration: 50, ease: 'none' }, 20)
        .to(dUni.uP, { value: 1, duration: 55, ease: 'none' }, 35)
        .to(kicker, { color: '#EDE9DF', duration: 30 }, 30)
        .to(title, { color: '#EDE9DF', duration: 30 }, 30)
        .to({}, { duration: 5 }, 95);
      scheduleRefresh();
    }

    import('./three-lite.js').then((THREE) => {
      if (!alive) return;
      try { renderer = new THREE.WebGLRenderer({ canvas: can, antialias: false }); }
      catch (e) { sec.classList.add('no-gl'); return; }
      renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
      const scene = new THREE.Scene(), cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 10);
      Object.assign(dUni, {
        uA: { value: null }, uB: { value: null },
        uScaleA: { value: new THREE.Vector2(1, 1) }, uOffA: { value: new THREE.Vector2(0, 0) },
        uScaleB: { value: new THREE.Vector2(1, 1) }, uOffB: { value: new THREE.Vector2(0, 0) },
      });
      const mat = new THREE.ShaderMaterial({ uniforms: dUni,
        vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position,1.);}',
        fragmentShader: `
          uniform sampler2D uA,uB;uniform float uP;uniform vec2 uScaleA,uOffA,uScaleB,uOffB;varying vec2 vUv;
          float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
          float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
            return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
          float fbm(vec2 p){float v=0.,a=.55;for(int i=0;i<4;i++){v+=a*noise(p);p*=2.1;a*=.5;}return v;}
          void main(){
            float n=fbm(vUv*4.);
            float p=uP*1.3-.15;
            float m=smoothstep(p-.08,p+.08,n);
            vec3 a=texture2D(uA,vUv*uScaleA+uOffA).rgb;
            vec3 b=texture2D(uB,vUv*uScaleB+uOffB).rgb;
            gl_FragColor=vec4(mix(b,a,m),1.);
          }` });
      scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat));
      let aAsp = 1, bAsp = 1, W = innerWidth, H = innerHeight, ready = 0;
      const cover = (asp, scale, off) => { const pa = W / H;
        if (pa > asp) { scale.set(1, asp / pa); off.set(0, (1 - asp / pa) / 2); } else { scale.set(pa / asp, 1); off.set((1 - pa / asp) / 2, 0); } };
      const fit = () => { renderer.setSize(W, H); cover(aAsp, dUni.uScaleA.value, dUni.uOffA.value); cover(bAsp, dUni.uScaleB.value, dUni.uOffB.value); };
      fit();
      // Photos sans colorSpace, comme au hero : pixels rendus tels quels, sans contraste ajouté.
      const loader = new THREE.TextureLoader();
      loader.load(data.day, (t) => { dUni.uA.value = t; aAsp = t.image.width / t.image.height; fit(); ready++; });
      loader.load(data.night, (t) => { dUni.uB.value = t; bAsp = t.image.width / t.image.height; fit(); ready++; });

      let visible = false;
      const io = new IntersectionObserver((e) => { visible = e[0].isIntersecting; }, { rootMargin: '20%' });
      io.observe(sec);
      tick = () => { if (visible && ready === 2) renderer.render(scene, cam); };
      gsap.ticker.add(tick);
      onResize = () => { W = innerWidth; H = innerHeight; fit(); };
      addEventListener('resize', onResize);
    });

    return () => {
      alive = false;
      if (tick) gsap.ticker.remove(tick);
      if (onResize) removeEventListener('resize', onResize);
      if (tl) { tl.scrollTrigger && tl.scrollTrigger.kill(); tl.kill(); }
      if (renderer) renderer.dispose();
    };
  }, []);

  return (
    <section id="nightfall" ref={root} className="nightfall" data-pin>
      <div className="dissolveWrap">
        <canvas className="dissolve" aria-hidden="true" />
        <img className="dissolve-fallback" src={data.night} alt="" loading="lazy" decoding="async" />
      </div>
      <div className="nf-text">
        <p className="nf-kicker">{data.kicker}</p>
        <h2 className="nf-title t-title"><Lines lines={data.lines} lineClass="nf-line" /></h2>
      </div>
    </section>
  );
}
