/* ============================================================
   CHAMP « PHOTO CADRÉE » POUR /admin

   Remplace les chiffres de cadrage : on voit la photo, on touche
   le visage, et un aperçu montre le cadre tel qu'il sera sur le site.

   Valeur enregistrée (même forme qu'avant dans accueil.json) :
     grand écran : { foto, alt, cadrage }           cadrage = "x% y%"
     téléphone   : { foto, alt, cadrage, viseur }   viseur  = "haut droite bas gauche"

   Options dans config.yml :
     widget: photo_cadree
     ratio: 1.7          largeur / hauteur du cadre sur le site
     mode: telephone     ajoute le viseur de mise au point

   Sur téléphone, le point touché sert deux fois : il garde le visage
   dans le cadre (object-position) et centre le viseur dessus.
   ============================================================ */

(function () {
  'use strict';

  const CMS = window.CMS;
  const React = CMS.React;
  const h = React.createElement;
  const { useState, useEffect } = React;

  // Taille du viseur sur l'écran du téléphone, en % du cadre : la
  // moyenne des viseurs posés à la main sur l'accueil validé.
  const AF_W = 56;
  const AF_H = 34;
  const PHONE_RATIO = 0.46; // 375 × 812

  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const round = x => Math.round(x);

  function plain(v) {
    if (v && typeof v.toJS === 'function') v = v.toJS();
    return v && typeof v === 'object' ? v : {};
  }

  function parsePoint(s) {
    const m = /(-?[\d.]+)%\s+(-?[\d.]+)%/.exec(s || '');
    return m ? { x: +m[1], y: +m[2] } : null;
  }

  function viseurFrom(p) {
    const top = clamp(round(p.y - AF_H / 2), 4, 96 - AF_H);
    const left = clamp(round(p.x - AF_W / 2), 4, 96 - AF_W);
    return top + '% ' + (100 - left - AF_W) + '% ' + (100 - top - AF_H) + '% ' + left + '%';
  }

  function parseViseur(s) {
    const n = (s || '').match(/-?[\d.]+/g);
    if (!n || n.length !== 4) return null;
    const [t, r, b, l] = n.map(Number);
    return { top: t, right: r, bottom: b, left: l };
  }

  // L'image du champ : une photo déjà publiée vit à la racine du site,
  // une photo qu'on vient de choisir est une adresse blob: temporaire.
  function useUrl(path, getAsset) {
    const [url, setUrl] = useState('');
    useEffect(() => {
      let alive = true;
      if (!path) { setUrl(''); return; }
      if (/^(blob:|https?:|data:)/.test(path)) { setUrl(path); return; }
      const fallback = '/' + String(path).replace(/^\/+/, '');
      setUrl(fallback);
      try {
        const a = getAsset && getAsset(path);
        Promise.resolve(a).then(asset => {
          const u = asset && (asset.url || asset.blobURL || (asset.toString && asset.toString()));
          if (alive && u && u !== '[object Object]') setUrl(String(u));
        }).catch(() => {});
      } catch (e) { /* on garde l'adresse du site */ }
      return () => { alive = false; };
    }, [path]);
    return url;
  }

  const S = {
    wrap: { display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' },
    hint: { fontSize: '13px', opacity: 0.75, lineHeight: 1.4, margin: 0 },
    stage: { position: 'relative', width: '100%', cursor: 'crosshair', touchAction: 'manipulation',
      borderRadius: '6px', overflow: 'hidden', background: '#111', lineHeight: 0 },
    img: { width: '100%', height: 'auto', display: 'block', maxHeight: '70vh', objectFit: 'contain',
      userSelect: 'none', WebkitUserDrag: 'none', pointerEvents: 'none' },
    dot: { position: 'absolute', width: '34px', height: '34px', margin: '-17px 0 0 -17px',
      border: '2px solid #F0E8DC', borderRadius: '50%', boxShadow: '0 0 0 2px rgba(0,0,0,.45)',
      pointerEvents: 'none' },
    dotIn: { position: 'absolute', left: '50%', top: '50%', width: '6px', height: '6px',
      margin: '-3px 0 0 -3px', borderRadius: '50%', background: '#C98E7A' },
    label: { fontSize: '13px', fontWeight: 600, margin: '4px 0 0' },
    frame: { position: 'relative', overflow: 'hidden', borderRadius: '4px', background: '#14100C',
      border: '1px solid rgba(240,232,220,.25)' },
    frameImg: { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' },
    af: { position: 'absolute', pointerEvents: 'none' },
    row: { display: 'flex', gap: '8px', flexWrap: 'wrap' },
    btn: { padding: '10px 14px', borderRadius: '6px', border: '1px solid rgba(240,232,220,.35)',
      background: 'transparent', color: 'inherit', font: 'inherit', fontSize: '14px', cursor: 'pointer' },
    input: { width: '100%', boxSizing: 'border-box', padding: '10px', borderRadius: '6px',
      border: '1px solid rgba(240,232,220,.25)', background: 'rgba(0,0,0,.25)', color: 'inherit',
      font: 'inherit', fontSize: '15px' },
    empty: { padding: '40px 12px', textAlign: 'center', fontSize: '14px', opacity: 0.7, lineHeight: 1.4 },
  };

  function corners(color) {
    const c = { position: 'absolute', width: '12px', height: '12px', borderColor: color, borderStyle: 'solid', borderWidth: 0 };
    return [
      h('i', { key: 1, style: Object.assign({}, c, { top: 0, left: 0, borderTopWidth: '2px', borderLeftWidth: '2px' }) }),
      h('i', { key: 2, style: Object.assign({}, c, { top: 0, right: 0, borderTopWidth: '2px', borderRightWidth: '2px' }) }),
      h('i', { key: 3, style: Object.assign({}, c, { bottom: 0, left: 0, borderBottomWidth: '2px', borderLeftWidth: '2px' }) }),
      h('i', { key: 4, style: Object.assign({}, c, { bottom: 0, right: 0, borderBottomWidth: '2px', borderRightWidth: '2px' }) }),
    ];
  }

  function Control(props) {
    const { field, onChange, getAsset, pickFile, forID } = props;
    const v = plain(props.value);
    const phone = field.get('mode') === 'telephone';
    const ratio = phone ? PHONE_RATIO : (Number(field.get('ratio')) || 1.6);
    const url = useUrl(v.foto, getAsset);
    const point = parsePoint(v.cadrage);
    const shown = point || { x: 50, y: 50 };

    function set(patch) { onChange(Object.assign({}, v, patch)); }

    function onTap(e) {
      const r = e.currentTarget.getBoundingClientRect();
      const p = {
        x: clamp(round(((e.clientX - r.left) / r.width) * 100), 0, 100),
        y: clamp(round(((e.clientY - r.top) / r.height) * 100), 0, 100),
      };
      const patch = { cadrage: p.x + '% ' + p.y + '%' };
      if (phone) patch.viseur = viseurFrom(p);
      set(patch);
    }

    async function choose() {
      const picked = await pickFile({ kind: 'image', allowURL: false });
      const one = Array.isArray(picked) ? picked[0] : picked;
      if (!one) return;
      const patch = { foto: one.value, cadrage: '50% 50%' };
      if (phone) patch.viseur = viseurFrom({ x: 50, y: 40 });
      set(patch);
    }

    const af = phone ? parseViseur(v.viseur) : null;

    return h('div', { style: S.wrap, id: forID },
      url
        ? h('div', null,
            h('p', { style: S.hint }, 'Touche la photo là où est le visage (ou ce qui doit rester visible).'),
            h('div', { style: Object.assign({}, S.stage, { marginTop: '8px' }), onClick: onTap, role: 'button',
                'aria-label': 'Toucher pour cadrer' },
              h('img', { src: url, alt: '', style: S.img, draggable: false }),
              point && h('span', { style: Object.assign({}, S.dot, { left: point.x + '%', top: point.y + '%' }) },
                h('span', { style: S.dotIn })))
          )
        : h('div', { style: S.empty }, 'Pas encore de photo.'),

      url && h('p', { style: S.label },
        phone ? 'Aperçu sur un téléphone' : 'Aperçu sur un écran d’ordinateur'),
      url && h('div', { style: Object.assign({}, S.frame, {
          aspectRatio: String(ratio),
          // Un cadre étroit (bande de 4) serait immense en pleine
          // largeur : l'aperçu ne dépasse pas 360 px de haut.
          width: phone ? '46%' : 'min(100%, ' + round(360 * ratio) + 'px)',
          maxWidth: phone ? '220px' : 'none',
        }) },
        h('img', { src: url, alt: '', style: Object.assign({}, S.frameImg, { objectPosition: shown.x + '% ' + shown.y + '%' }) }),
        af && h('div', { style: Object.assign({}, S.af, {
            top: af.top + '%', right: af.right + '%', bottom: af.bottom + '%', left: af.left + '%' }) },
          corners('#F0E8DC'))
      ),

      h('div', { style: S.row },
        h('button', { type: 'button', style: S.btn, onClick: choose }, url ? 'Changer la photo' : 'Choisir une photo'),
        point && h('button', { type: 'button', style: S.btn, onClick: () => {
          const patch = { cadrage: '50% 50%' };
          if (phone) patch.viseur = viseurFrom({ x: 50, y: 40 });
          set(patch);
        } }, 'Recentrer')
      ),

      h('label', { style: S.label }, 'Description (pour Google et les malvoyants)'),
      h('input', { type: 'text', style: S.input, value: v.alt || '',
        onChange: e => set({ alt: e.target.value }) })
    );
  }

  function Preview(props) {
    const v = plain(props.value);
    return h('span', null, v.foto || '');
  }

  CMS.registerFieldType('photo_cadree', Control, Preview);
  CMS.init();
})();
