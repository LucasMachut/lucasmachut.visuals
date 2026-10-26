/* ============================================================
   LES FORMULAIRES DES FICHIERS DE DONNÉES (accueil, séries)

   form(schema, data, ctx) rend les champs ; chaque modification
   change `data` sur place puis appelle ctx.changed().
   ============================================================ */

import * as images from './images.js';

export function h(tag, props, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k === 'value') el.value = v;
    else if (k in el && typeof v !== 'string') el[k] = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const k of kids.flat()) if (k !== null && k !== undefined && k !== false) el.append(k);
  return el;
}

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

function blank(field) {
  if (field.default !== undefined) return field.default;
  if (field.widget === 'list') return [];
  if (field.widget === 'object') return Object.fromEntries(field.fields.map(f => [f.name, blank(f)]));
  if (field.widget === 'photo_cadree') return { foto: '', alt: '', cadrage: '50% 50%' };
  return '';
}

// ctx : { schema, data, changed, path }
export function form(fields, obj, ctx) {
  const wrap = h('div', { class: 'f-fields' });
  const normal = fields.filter(f => !f.advanced);
  const adv = fields.filter(f => f.advanced);
  for (const f of normal) wrap.append(fieldEl(f, obj, ctx));
  if (adv.length) {
    wrap.append(h('details', { class: 'f-adv' }, h('summary', null, 'Réglages avancés'),
      ...adv.map(f => fieldEl(f, obj, ctx))));
  }
  return wrap;
}

function fieldEl(f, obj, ctx) {
  const sub = Object.assign({}, ctx, { path: ctx.path.concat(f.name) });
  const set = v => {
    if (f.optional && (v === '' || (Array.isArray(v) && !v.length))) delete obj[f.name];
    else obj[f.name] = v;
    ctx.changed();
  };
  if (obj[f.name] === undefined && !f.optional) obj[f.name] = blank(f);
  const get = () => obj[f.name];

  if (f.widget === 'object') {
    const box = h('details', { class: 'f-obj', open: !!ctx.open },
      h('summary', null, f.label), form(f.fields, obj[f.name], sub));
    return box;
  }
  const body = W[f.widget] ? W[f.widget](f, get, set, sub) : W.string(f, get, set, sub);
  return h('div', { class: 'f-field f-' + f.widget },
    f.label ? h('label', { class: 'f-label' }, f.label) : null,
    body,
    f.hint ? h('p', { class: 'f-hint' }, f.hint) : null);
}

function autosize(t) {
  const fit = () => { t.style.height = 'auto'; t.style.height = (t.scrollHeight + 2) + 'px'; };
  t.addEventListener('input', fit);
  requestAnimationFrame(fit);
  return t;
}

const W = {
  string(f, get, set) {
    return h('input', { type: 'text', class: 'f-input', value: get() || '', oninput: e => set(e.target.value) });
  },
  text(f, get, set) {
    return autosize(h('textarea', { class: 'f-input', rows: 3, value: get() || '', oninput: e => set(e.target.value) }));
  },
  select(f, get, set) {
    const s = h('select', { class: 'f-input', onchange: e => set(e.target.value) },
      ...f.options.map(o => h('option', { value: o.value }, o.label)));
    s.value = get() || f.default || f.options[0].value;
    return s;
  },
  image(f, get, set, ctx) {
    const box = h('div', { class: 'f-image' });
    const draw = () => {
      box.replaceChildren(
        get() ? h('img', { src: images.url(get()), alt: '', loading: 'lazy' }) : h('div', { class: 'f-empty' }, 'Pas de photo'),
        h('button', { type: 'button', class: 'btn', onclick: async () => {
          const [file] = await images.pick();
          if (!file) return;
          box.classList.add('is-busy');
          const up = await images.upload(file, ctx.schema.folder(ctx.path, ctx.data));
          box.classList.remove('is-busy');
          set(up.path); draw();
        } }, get() ? 'Changer' : 'Choisir une photo'));
    };
    draw();
    return box;
  },
  photo_cadree: cadree,
  list,
};

/* ─── listes ─── */

function list(f, get, set, ctx) {
  const box = h('div', { class: 'f-list' });
  // Une liste facultative absente du fichier n'y entre qu'au premier ajout.
  const local = Array.isArray(get()) ? get() : [];
  const arr = () => local;
  const isPhotos = f.field && f.field.widget === 'image';

  function swap(i, j) { const a = arr(); [a[i], a[j]] = [a[j], a[i]]; ctx.changed(); draw(); }
  function del(i) { arr().splice(i, 1); set(arr()); draw(); }

  function draw() {
    const a = arr();
    box.replaceChildren();
    if (isPhotos) {
      const grid = h('div', { class: 'f-grid' });
      a.forEach((p, i) => grid.append(h('figure', { class: 'f-thumb' },
        h('img', { src: images.url(p), alt: '', loading: 'lazy' }),
        h('figcaption', null,
          h('button', { type: 'button', title: 'Avant', disabled: i === 0, onclick: () => swap(i, i - 1) }, '←'),
          h('span', null, String(i + 1)),
          h('button', { type: 'button', title: 'Après', disabled: i === a.length - 1, onclick: () => swap(i, i + 1) }, '→'),
          h('button', { type: 'button', title: 'Retirer', class: 'del', onclick: () => del(i) }, '✕')))));
      box.append(grid);
      const row = h('div', { class: 'f-row' });
      row.append(h('button', { type: 'button', class: 'btn', onclick: async () => {
        const files = await images.pick(true);
        if (!files.length) return;
        row.classList.add('is-busy');
        for (const file of files) {
          const up = await images.upload(file, ctx.schema.folder(ctx.path, ctx.data));
          arr().push(up.path);
          set(arr()); draw();
        }
      } }, 'Ajouter des photos'));
      if (f.pickFrom) {
        row.append(h('button', { type: 'button', class: 'btn', onclick: () => {
          const parent = ctx.path.slice(0, -1).reduce((o, k) => o[k], ctx.data);
          choose(parent[f.pickFrom] || [], p => { arr().push(p); set(arr()); draw(); });
        } }, 'Choisir dans la série'));
      }
      box.append(row);
      return;
    }
    a.forEach((item, i) => {
      const sub = Object.assign({}, ctx, { path: ctx.path.concat(i) });
      const title = () => (f.summary ? f.summary(item) : '') || (f.label_singular || 'Élément') + ' ' + (i + 1);
      const sum = h('span', { class: 'f-sum' }, title());
      const inner = f.fields
        ? form(f.fields, item, Object.assign({}, sub, { changed: () => { sum.textContent = title(); ctx.changed(); } }))
        : W[f.field.widget](f.field, () => a[i], v => { a[i] = v; ctx.changed(); }, sub);
      const tools = f.fixed ? null : h('span', { class: 'f-tools' },
        h('button', { type: 'button', title: 'Monter', disabled: i === 0, onclick: e => { e.preventDefault(); swap(i, i - 1); } }, '↑'),
        h('button', { type: 'button', title: 'Descendre', disabled: i === a.length - 1, onclick: e => { e.preventDefault(); swap(i, i + 1); } }, '↓'),
        h('button', { type: 'button', title: 'Supprimer', class: 'del', onclick: e => {
          e.preventDefault();
          if (confirm('Supprimer « ' + title() + ' » ?')) del(i);
        } }, '✕'));
      if (f.fixed && f.field) {
        // liste de taille fixe (les photos grand écran) : à plat
        box.append(h('div', { class: 'f-item f-item--flat' },
          a.length > 1 ? h('p', { class: 'f-sub' }, 'Photo ' + (i + 1)) : null,
          W[f.field.widget](f.field, () => a[i], v => { a[i] = v; ctx.changed(); }, sub)));
        return;
      }
      box.append(h('details', { class: 'f-item' }, h('summary', null, sum, tools), inner));
    });
    if (!f.fixed) {
      box.append(h('button', { type: 'button', class: 'btn btn--add', onclick: () => {
        const v = f.fields ? Object.fromEntries(f.fields.filter(x => !x.optional).map(x => [x.name, blank(x)])) : blank(f.field);
        arr().push(v); set(arr()); draw();
        const last = box.querySelectorAll('.f-item');
        if (last.length) last[last.length - 1].open = true;
      } }, '+ Ajouter' + (f.label_singular ? ' : ' + f.label_singular.toLowerCase() : '')));
    }
  }
  draw();
  return box;
}

function choose(paths, onPick) {
  const dlg = h('dialog', { class: 'sheet' });
  dlg.append(h('header', null, h('h2', null, 'Choisir une photo'),
    h('button', { type: 'button', class: 'btn', onclick: () => dlg.close() }, 'Fermer')),
  h('div', { class: 'f-grid' }, ...paths.map(p => h('button', { type: 'button', class: 'f-thumb f-thumb--pick',
    onclick: () => { onPick(p); dlg.close(); } }, h('img', { src: images.url(p), alt: '', loading: 'lazy' })))));
  dlg.addEventListener('close', () => dlg.remove());
  document.body.append(dlg);
  dlg.showModal();
}

/* ─── photo cadrée : on touche le visage au lieu de taper des chiffres ───
   grand écran : { foto, alt, cadrage }         cadrage = "x% y%"
   téléphone   : { foto, alt, cadrage, viseur } viseur  = "haut droite bas gauche"  */

const AF_W = 56, AF_H = 34, PHONE_RATIO = 0.46;

function parsePoint(s) {
  const m = /(-?[\d.]+)%\s+(-?[\d.]+)%/.exec(s || '');
  return m ? { x: +m[1], y: +m[2] } : null;
}
function viseurFrom(p) {
  const top = clamp(Math.round(p.y - AF_H / 2), 4, 96 - AF_H);
  const left = clamp(Math.round(p.x - AF_W / 2), 4, 96 - AF_W);
  return top + '% ' + (100 - left - AF_W) + '% ' + (100 - top - AF_H) + '% ' + left + '%';
}
function parseViseur(s) {
  const n = (s || '').match(/-?[\d.]+/g);
  return n && n.length === 4 ? n.map(Number) : null;
}

export function cadree(f, get, set, ctx) {
  const phone = f.mode === 'telephone';
  const ratio = phone ? PHONE_RATIO : (f.ratio || 1.6);
  const box = h('div', { class: 'f-cadre' });
  const v = () => { if (!get() || typeof get() !== 'object') set({ foto: '', alt: '' }); return get(); };
  const patch = p => { Object.assign(v(), p); ctx.changed(); draw(); };

  function draw() {
    const val = v();
    const pt = parsePoint(val.cadrage);
    const shown = pt || { x: 50, y: 50 };
    const src = images.url(val.foto);
    const af = phone ? parseViseur(val.viseur) : null;
    box.replaceChildren(
      src ? h('p', { class: 'f-hint' }, 'Touche la photo là où est le visage (ou ce qui doit rester visible).') : null,
      src ? h('div', { class: 'f-stage', onclick: e => {
        const r = e.currentTarget.getBoundingClientRect();
        const p = { x: clamp(Math.round((e.clientX - r.left) / r.width * 100), 0, 100),
          y: clamp(Math.round((e.clientY - r.top) / r.height * 100), 0, 100) };
        const q = { cadrage: p.x + '% ' + p.y + '%' };
        if (phone) q.viseur = viseurFrom(p);
        patch(q);
      } }, h('img', { src, alt: '', draggable: false }),
      pt ? h('span', { class: 'f-dot', style: { left: pt.x + '%', top: pt.y + '%' } }) : null)
        : h('div', { class: 'f-empty' }, 'Pas encore de photo.'),
      src ? h('p', { class: 'f-sub' }, phone ? 'Aperçu sur un téléphone' : 'Aperçu sur un écran d’ordinateur') : null,
      src ? h('div', { class: 'f-frame', style: {
        aspectRatio: String(ratio),
        width: phone ? '46%' : 'min(100%, ' + Math.round(360 * ratio) + 'px)', maxWidth: phone ? '220px' : 'none' } },
      h('img', { src, alt: '', style: { objectPosition: shown.x + '% ' + shown.y + '%' } }),
      af ? h('div', { class: 'f-af', style: { top: af[0] + '%', right: af[1] + '%', bottom: af[2] + '%', left: af[3] + '%' } },
        h('i'), h('i'), h('i'), h('i')) : null) : null,
      h('div', { class: 'f-row' },
        h('button', { type: 'button', class: 'btn', onclick: async () => {
          const [file] = await images.pick();
          if (!file) return;
          box.classList.add('is-busy');
          const up = await images.upload(file, ctx.schema.folder(ctx.path, ctx.data));
          box.classList.remove('is-busy');
          const q = { foto: up.path, cadrage: '50% 50%' };
          if (phone) q.viseur = viseurFrom({ x: 50, y: 40 });
          patch(q);
        } }, src ? 'Changer la photo' : 'Choisir une photo'),
        pt ? h('button', { type: 'button', class: 'btn', onclick: () => {
          const q = { cadrage: '50% 50%' };
          if (phone) q.viseur = viseurFrom({ x: 50, y: 40 });
          patch(q);
        } }, 'Recentrer') : null),
      h('label', { class: 'f-label' }, 'Description (pour Google et les malvoyants)'),
      h('input', { type: 'text', class: 'f-input', value: val.alt || '', oninput: e => { v().alt = e.target.value; ctx.changed(); } }));
  }
  draw();
  return box;
}
