// Preloader + hero de Koisei, transposés.
// Koisei : plaque WebGL plein écran (ondulation d'eau sur le bas, onde au passage
// de la souris), pétales de sakura instanciés, preloader qui attend la texture.
// Ici : ma photo, de la poussière rose poussière à la place des pétales, et le nom
// LUCAS MACHUT en Special Elite. Durées, courbes et seuils sont ceux de Koisei.
import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

function dustTexture(THREE) {
  // Un grain de poussière : point doux, cœur rose poussière, bord qui s'efface
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 30);
  g.addColorStop(0, 'rgba(240,214,200,1)');
  g.addColorStop(.35, 'rgba(201,142,122,.85)');
  g.addColorStop(1, 'rgba(201,142,122,0)');
  x.fillStyle = g;
  x.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

export default function HomeStage({ hero }) {
  const root = useRef(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    // Koisei coupe le lissage de latence de GSAP : sans ça, dans un onglet ouvert
    // en arrière-plan, chaque image n'avance que de 33 ms et le preloader traîne.
    gsap.ticker.lagSmoothing(0);
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isMobile = matchMedia('(max-width: 767px)').matches;
    const el = root.current;
    const q = (s) => el.querySelector(s);
    const loaderEl = q('#loader'), pctEl = q('#loaderPct'), barEl = q('#loaderBar');
    const glCan = q('#gl'), fallback = q('.hero-fallback');
    let alive = true, tick = null, onMove = null, onResize = null, renderer = null;
    const triggers = [];

    const prog = { v: 0 };
    const paint = () => { pctEl.textContent = Math.round(prog.v) + '%'; barEl.style.transform = `scaleX(${prog.v / 100})`; };
    gsap.to(prog, { v: 88, duration: 1.4, ease: 'power2.out', onUpdate: paint });
    gsap.fromTo('#loaderWord', { letterSpacing: '.5em' }, { letterSpacing: '.02em', duration: 1.2, ease: 'power3.out' });
    let realDone = false, minDone = false, finished = false;
    const minTimer = setTimeout(() => { minDone = true; tryFinish(); }, 1600);

    let heroPlane = null, heroUniforms = null, dustMat = null, W = innerWidth, H = innerHeight;

    function tryFinish() {
      if (!realDone || !minDone || finished || !alive) return;
      finished = true;
      gsap.to(prog, { v: 100, duration: .3, onUpdate: paint, onComplete: () => {
        barEl.style.background = 'var(--terracotta)';
        gsap.to(loaderEl, { clipPath: 'inset(0 0 100% 0)', duration: .9, ease: 'power4.inOut', delay: .15,
          onComplete: () => { loaderEl.style.display = 'none'; } });
        heroEntrance();
      } });
    }

    function heroEntrance() {
      if (heroPlane) gsap.fromTo(heroPlane.scale, { x: W * 1.12, y: H * 1.12 }, { x: W, y: H, duration: 2.4, ease: 'power2.out' });
      gsap.fromTo(el.querySelectorAll('.heroLine'), { yPercent: 110, rotate: 2 }, { yPercent: 0, rotate: 0, duration: 1.1, ease: 'power4.out', stagger: .12, delay: .35 });
      gsap.fromTo(el.querySelectorAll('.heroFade'), { opacity: 0 }, { opacity: 1, duration: 1, delay: 1, stagger: .1 });
      if (dustMat) gsap.to(dustMat, { opacity: .8, duration: 1.6, delay: .8 });
    }

    import('./three-lite.js').then((THREE) => {
      if (!alive) return;
      try {
        renderer = new THREE.WebGLRenderer({ canvas: glCan, alpha: true, antialias: false });
      } catch (e) {
        realDone = true; tryFinish(); return;   // pas de WebGL : la photo fixe reste
      }
      renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
      const scene = new THREE.Scene();
      const cam = new THREE.OrthographicCamera(-W / 2, W / 2, H / 2, -H / 2, -100, 100);
      renderer.setSize(W, H);

      heroUniforms = {
        uTex: { value: null }, uTime: { value: 0 }, uDarken: { value: 0 }, uWaveT: { value: 10 },
        uMouse: { value: new THREE.Vector2(.5, .5) }, uScale: { value: new THREE.Vector2(1, 1) }, uOffset: { value: new THREE.Vector2(0, 0) },
      };
      const heroMat = new THREE.ShaderMaterial({
        uniforms: heroUniforms,
        vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
        fragmentShader: `
          uniform sampler2D uTex;uniform float uTime,uDarken,uWaveT;uniform vec2 uMouse,uScale,uOffset;varying vec2 vUv;
          void main(){
            vec2 uv=vUv*uScale+uOffset;
            float wm=smoothstep(.38,.05,vUv.y);
            uv.x+=sin(vUv.y*40.+uTime*1.2)*.0015*wm;
            float d=distance(vUv,uMouse);
            uv+=sin(d*46.-uWaveT*7.)*exp(-d*9.)*exp(-uWaveT*1.2)*.008;
            vec3 col=texture2D(uTex,uv).rgb*(1.-uDarken);
            gl_FragColor=vec4(col,1.);
          }`,
      });
      heroPlane = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), heroMat);
      heroPlane.position.z = -5;
      heroPlane.visible = false;
      scene.add(heroPlane);
      let imgAspect = 1;
      const fitHero = () => {
        heroPlane.scale.set(W * 1.001, H * 1.001, 1);
        const pa = W / H;
        if (pa > imgAspect) { heroUniforms.uScale.value.set(1, imgAspect / pa); heroUniforms.uOffset.value.set(0, (1 - imgAspect / pa) / 2); }
        else { heroUniforms.uScale.value.set(pa / imgAspect, 1); heroUniforms.uOffset.value.set((1 - pa / imgAspect) / 2, 0); }
      };

      // Poussière : même mécanique que les pétales Koisei, plus petite et plus lente
      const COUNT = isMobile ? 70 : 200;
      dustMat = new THREE.MeshBasicMaterial({ map: dustTexture(THREE), transparent: true, depthWrite: false, opacity: 0 });
      const dustMesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(7, 7), dustMat, COUNT);
      scene.add(dustMesh);
      const dummy = new THREE.Object3D();
      const dust = Array.from({ length: COUNT }, () => ({
        x: (Math.random() - .5) * W * 1.2, y: (Math.random() - .5) * H * 1.2, z: Math.random() * 4 - 2,
        s: .35 + Math.random() * .9, ph: Math.random() * Math.PI * 2,
        vy: .12 + Math.random() * .3, vx: 0, vyImp: 0,
      }));
      const mouse = { x: -9999, y: -9999 };
      onMove = (e) => {
        mouse.x = e.clientX - W / 2; mouse.y = H / 2 - e.clientY;
        const nx = e.clientX / W, ny = 1 - e.clientY / H;
        if (Math.hypot(nx - heroUniforms.uMouse.value.x, ny - heroUniforms.uMouse.value.y) > .06) {
          heroUniforms.uMouse.value.set(nx, ny); heroUniforms.uWaveT.value = 0;
        }
      };
      addEventListener('pointermove', onMove);
      const updateDust = (t, dt) => {
        for (const p of dust) {
          const sway = (Math.sin(t * .5 + p.ph) * .2 + Math.sin(t * .23 + p.ph * 2.1) * .14);
          const dx = p.x - mouse.x, dy = p.y - mouse.y, dist = Math.hypot(dx, dy);
          if (dist < 180 && dist > 1) { const f = 1 - dist / 180; const k = f * f * 9; p.vx += dx / dist * k; p.vyImp += dy / dist * k; }
          p.vx *= .9; p.vyImp *= .9;
          p.y -= p.vy * (dt * 60) * .45;
          p.x += sway + p.vx * dt * 6; p.y += p.vyImp * dt * 6;
          if (p.y < -H / 2 - 30) { p.y = H / 2 + 30; p.x = (Math.random() - .5) * W * 1.2; }
          if (p.x > W / 2 + 40) p.x = -W / 2 - 40; if (p.x < -W / 2 - 40) p.x = W / 2 + 40;
        }
        dust.forEach((p, i) => {
          dummy.position.set(p.x, p.y, p.z);
          dummy.scale.setScalar(p.s);
          dummy.updateMatrix();
          dustMesh.setMatrixAt(i, dummy.matrix);
        });
        dustMesh.instanceMatrix.needsUpdate = true;
      };

      let heroVisible = true, last = 0;
      const io = new IntersectionObserver((e) => { heroVisible = e[0].isIntersecting; }, { rootMargin: '20%' });
      io.observe(q('#hero'));
      tick = (t) => {
        const dt = Math.min(.05, t - last); last = t;
        // Rien à peindre derrière le preloader : sur un appareil lent, le rendu
        // retenait les images et la barre restait bloquée vers 90 %.
        if (!finished) return;
        heroUniforms.uTime.value = t; heroUniforms.uWaveT.value += dt;
        if (!reduced) updateDust(t, dt);
        if (heroVisible || dustMat.opacity > 0) renderer.render(scene, cam);
      };
      gsap.ticker.add(tick);

      onResize = () => {
        W = innerWidth; H = innerHeight;
        cam.left = -W / 2; cam.right = W / 2; cam.top = H / 2; cam.bottom = -H / 2; cam.updateProjectionMatrix();
        renderer.setSize(W, H); fitHero();
      };
      addEventListener('resize', onResize);

      new THREE.TextureLoader().load(hero.photo, (tex) => {
        if (!alive) return;
        tex.colorSpace = THREE.SRGBColorSpace;
        heroUniforms.uTex.value = tex;
        imgAspect = tex.image.width / tex.image.height;
        fitHero();
        heroPlane.visible = true;
        fallback.style.opacity = 0;
        realDone = true; tryFinish();
      }, undefined, () => { realDone = true; tryFinish(); });

      if (!reduced) {
        triggers.push(ScrollTrigger.create({
          trigger: '#hero', start: 'top top', end: '+=120%', pin: true, pinSpacing: true, scrub: 1,
          onUpdate: (s) => {
            heroUniforms.uDarken.value = s.progress * .25;
            const sc = 1 + s.progress * .18; heroPlane.scale.set(W * sc, H * sc, 1);
            gsap.set('#heroContent', { y: -s.progress * H * .4, opacity: 1 - s.progress * 1.3 });
          },
        }));
        // la poussière s'éteint quand la section lin recouvre la photo (Koisei : pétales sur #journey)
        const cover = document.querySelector('[data-covers-hero]');
        if (cover) {
          triggers.push(gsap.to(dustMat, { opacity: 0, ease: 'none',
            scrollTrigger: { trigger: cover, start: 'top 60%', end: 'top top', scrub: true } }).scrollTrigger);
          triggers.push(gsap.fromTo(cover, { borderTopLeftRadius: 32, borderTopRightRadius: 32 }, { borderTopLeftRadius: 0, borderTopRightRadius: 0, ease: 'none',
            scrollTrigger: { trigger: cover, start: 'top 60%', end: 'top top', scrub: true } }).scrollTrigger);
        }
        ScrollTrigger.refresh();
      }
      dispatchEvent(new Event('lm:layout'));
    });

    return () => {
      alive = false;
      clearTimeout(minTimer);
      if (tick) gsap.ticker.remove(tick);
      if (onMove) removeEventListener('pointermove', onMove);
      if (onResize) removeEventListener('resize', onResize);
      triggers.forEach((t) => t && t.kill());
      if (renderer) renderer.dispose();
    };
  }, []);

  return (
    <div ref={root}>
      <div id="loader" className="loader">
        <div id="loaderWord" className="loader-word">LUCAS MACHUT</div>
        <div className="loader-track">
          <div className="loader-line" />
          <div id="loaderBar" className="loader-bar" />
        </div>
        <div id="loaderPct" className="loader-pct">0%</div>
      </div>

      <canvas id="gl" className="gl" aria-hidden="true" />

      <section id="hero" className="hero">
        <img className="hero-fallback" src={hero.photo} alt="" />
        <div id="heroContent" className="hero-content">
          <div className="clip"><p className="heroLine eyebrow-hero">{hero.eyebrow}</p></div>
          <h1 className="hero-name">
            {hero.name.map((w) => (
              <span className="clip" key={w}><span className="heroLine">{w}</span></span>
            ))}
          </h1>
          <div className="heroFade hero-rule" />
          <p className="heroFade hero-sub">{hero.subline}</p>
        </div>
        <div className="heroFade hero-scroll">
          <span>{hero.scroll}</span>
          <div className="hero-scroll-line"><div /></div>
        </div>
        <div className="heroFade hero-vertical">{hero.vertical}</div>
      </section>
    </div>
  );
}
