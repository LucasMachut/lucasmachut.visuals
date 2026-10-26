/* ============================================================
   ADMIN — lucasmachut.com

   #/                 la liste des pages et des contenus
   #/page/<chemin>    une page : aperçu cliquable ou formulaire
   #/data/<id>        un fichier de données (accueil, séries)

   Rien ici ne dépend du design du site : les pages sont lues telles
   qu'elles sont dans le dépôt (voir source.js).
   ============================================================ */

import * as store from './store.js';
import * as S from './source.js';
import * as images from './images.js';
import { DATA, byId, forPage } from './schemas.js';
import { h, form } from './forms.js';
import { richText } from './richtext.js';

const app = document.getElementById('app');
const isPhone = () => window.matchMedia('(max-width: 760px)').matches;

/* ─── petits outils ─── */

function toast(msg, ms = 3500) {
  const t = h('div', { class: 'toast' }, msg);
  document.body.append(t);
  setTimeout(() => t.classList.add('out'), ms);
  setTimeout(() => t.remove(), ms + 400);
}

function debounce(fn, ms) {
  let t;
  const d = (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
  d.now = (...a) => { clearTimeout(t); fn(...a); };
  return d;
}

const NAMES = { index: 'Accueil', portfolio: 'Portfólio', contato: 'Contato', contact: 'Contact',
  regard: 'Regard', hoteis: 'Hotéis', 'portfolio-hoteis': 'Portfólio hotéis', fotos: 'Fotos' };

function pageName(path) {
  const base = path.split('/').pop().replace(/\.html$/, '');
  const name = NAMES[base] || base.replace(/-/g, ' ').replace(/^./, c => c.toUpperCase());
  if (path.startsWith('lugares/')) return base === 'index' ? 'Lugares — início' : name;
  return name;
}

function fileName(path) {
  if (/\.html$/.test(path)) return pageName(path) + (/^(en|fr)\//.test(path) ? ' (' + path.slice(0, 2).toUpperCase() + ')' : '');
  const d = DATA.find(x => x.file === path);
  if (d) return d.label;
  if (path.startsWith('partials/')) return 'Menu / pied de page « ' + path.slice(9, -5) + ' »';
  return path.split('/').pop();
}

/* ─── la barre du haut ─── */

function topbar(title, back) {
  const pub = h('button', { type: 'button', class: 'btn btn--pub', onclick: publishDialog });
  const draw = () => {
    const n = store.draftList().filter(d => d.text !== undefined).length;
    const p = store.draftList().length - n;
    pub.textContent = n + p ? 'Publier (' + (n + p) + ')' : 'À jour';
    pub.disabled = !(n + p);
  };
  draw();
  nextOff.push(store.onChange(draw));
  const bar = h('header', { class: 'top' },
    back ? h('a', { class: 'top__back', href: back }, '←') : h('span', { class: 'top__logo' }, 'LM'),
    h('h1', { class: 'top__title' }, title),
    store.essai ? h('span', { class: 'top__essai' }, 'essai') : null,
    pub);
  return bar;
}

// Ce qu'il faut débrancher quand l'écran change (observateurs, écoutes).
let cleanup = [];
let nextOff = [];
function screen(...kids) {
  cleanup.forEach(f => f());
  cleanup = nextOff;
  nextOff = [];
  app.replaceChildren(...kids);
}

/* ─── connexion ─── */

function login(err) {
  const old = store.oldToken();
  const input = h('input', { type: 'password', class: 'f-input', placeholder: 'github_pat_…', value: old,
    autocomplete: 'off' });
  const go = async () => {
    const t = input.value.trim();
    if (!t) return;
    btn.disabled = true; btn.textContent = 'Vérification…';
    if (await store.checkToken(t)) { store.setToken(t); boot(); }
    else login('Cette clé ne marche pas, ou elle n’a pas le droit d’écrire dans le dépôt.');
  };
  const btn = h('button', { type: 'button', class: 'btn btn--pub', onclick: go }, 'Entrer');
  screen(h('main', { class: 'login' },
    h('h1', null, 'Admin du site'),
    h('p', null, 'Colle ta clé GitHub. Elle reste dans ce navigateur.'),
    old ? h('p', { class: 'f-hint' }, 'J’ai retrouvé la clé de l’ancien admin, tu n’as qu’à entrer.') : null,
    err ? h('p', { class: 'err' }, err) : null,
    input, btn,
    h('details', { class: 'f-adv' }, h('summary', null, 'Créer une clé'),
      h('ol', null,
        h('li', null, 'Ouvre ', h('a', { href: 'https://github.com/settings/personal-access-tokens/new', target: '_blank' },
          'github.com → nouvelle clé'), '.'),
        h('li', null, 'Dépôt : seulement « lucasmachut.visuals ».'),
        h('li', null, 'Permissions → Contents : Read and write.'),
        h('li', null, 'Génère, copie, colle ici.')))));
  input.addEventListener('keydown', e => e.key === 'Enter' && go());
}

/* ─── accueil de l'admin : la liste ─── */

const HIDE = /(^|\/)(admin|partials|tools|Projets|Projets-web|Fotos site|page regard|photos|videos|css|js|node_modules)\/|proto|era-|test/i;

function home() {
  const pages = store.files().filter(p => /\.html$/.test(p) && !HIDE.test(p) && p.split('/').length <= 3);
  const group = (title, list, open = true) => {
    if (!list.length) return null;
    const items = h('ul', { class: 'list' }, ...list.map(p => {
      const d = store.draft(p);
      return h('li', null, h('a', { href: '#/page/' + p },
        h('span', null, pageName(p)), d ? h('em', { class: 'dot' }, 'modifié') : null, h('small', null, p)));
    }));
    return open ? h('section', { class: 'group' }, h('h2', null, title), items)
      : h('details', { class: 'group' }, h('summary', null, title), items);
  };
  const root = pages.filter(p => !p.includes('/'));
  const lug = pages.filter(p => p.startsWith('lugares/'));
  const trad = pages.filter(p => /^(en|fr)\//.test(p));
  const other = pages.filter(p => p.includes('/') && !p.startsWith('lugares/') && !/^(en|fr)\//.test(p));
  root.sort((a, b) => (a === 'index.html' ? -1 : b === 'index.html' ? 1 : a.localeCompare(b)));
  lug.sort((a, b) => (a.endsWith('/index.html') ? -1 : b.endsWith('/index.html') ? 1 : a.localeCompare(b)));

  screen(topbar('Admin'),
    h('main', { class: 'home' },
      h('section', { class: 'group' }, h('h2', null, 'Contenus'),
        h('ul', { class: 'list' }, ...DATA.map(d => h('li', null, h('a', { href: '#/data/' + d.id },
          h('span', null, d.label), store.draft(d.file) ? h('em', { class: 'dot' }, 'modifié') : null,
          h('small', null, d.file)))))),
      group('Pages — pessoas', root),
      group('Pages — lugares', lug),
      group('Autres pages', other),
      group('Traductions (EN, FR)', trad, false),
      h('footer', { class: 'home__foot' },
        h('a', { href: '/', target: '_blank' }, 'Voir le site'),
        store.essai ? null : h('button', { type: 'button', class: 'btn btn--ghost', onclick: () => {
          if (confirm('Se déconnecter ? Il faudra recoller la clé.')) { store.setToken(''); login(); }
        } }, 'Se déconnecter'))));
}

/* ─── les fichiers de données (accueil.json, fotos.json) ─── */

const dataCache = new Map(); // id -> { obj, save }

async function getData(id) {
  if (dataCache.has(id)) return dataCache.get(id);
  const schema = byId(id);
  const text = await store.readText(schema.file);
  const crlf = text.includes('\r\n');
  const entry = { schema, obj: JSON.parse(text) };
  entry.save = debounce(() => {
    let out = JSON.stringify(entry.obj, null, 2) + '\n';
    if (crlf) out = out.replace(/\n/g, '\r\n');
    store.putText(schema.file, out);
  }, 400);
  dataCache.set(id, entry);
  return entry;
}

async function dataView(id) {
  const schema = byId(id);
  screen(topbar(schema.label, '#/'), h('main', { class: 'loading' }, 'Chargement…'));
  const entry = await getData(id);
  const ctx = { schema, data: entry.obj, path: [], changed: entry.save };
  screen(topbar(schema.label, '#/'),
    h('main', { class: 'data' },
      schema.note ? h('p', { class: 'note' }, schema.note) : null,
      schema.page ? h('p', null, h('a', { href: '#/page/' + schema.page, class: 'btn btn--ghost' }, 'Voir sur la page')) : null,
      form(schema.fields, entry.obj, ctx)));
}

/* ─── une page ─── */

const P = {
  path: null, doc: null, eds: [], byNode: new Map(), history: [],
  mode: 'page', device: null, sel: null, frame: null, panel: null, scroll: 0,
};

function setDoc(src) {
  P.doc = S.parse(src);
  P.eds = S.editables(P.doc);
  P.byNode = new Map(P.eds.map((e, i) => [e.node.index, Object.assign(e, { eid: i })]));
}

const save = debounce(() => store.putText(P.path, P.doc.src), 300);

let lastPush = 0;
function remember(force) {
  const now = Date.now();
  if (force || now - lastPush > 1500) {
    P.history.push(P.doc.src);
    if (P.history.length > 60) P.history.shift();
  }
  lastPush = now;
}

async function pageView(path) {
  P.path = path;
  P.sel = null;
  P.history = [];
  P.device = P.device || (isPhone() ? 'phone' : 'desktop');
  screen(topbar(pageName(path), '#/'), h('main', { class: 'loading' }, 'Chargement…'));
  try { setDoc(await store.readText(path)); }
  catch (e) { screen(topbar(pageName(path), '#/'), h('main', { class: 'loading' }, 'Page introuvable : ' + e.message)); return; }
  drawPage();
}

function drawPage() {
  const seg = (name, items, cur, set) => h('div', { class: 'seg', role: 'group', 'aria-label': name },
    ...items.map(([v, label]) => h('button', { type: 'button', class: v === cur ? 'on' : '', onclick: () => set(v) }, label)));

  const undo = h('button', { type: 'button', class: 'btn btn--ghost', disabled: !P.history.length, onclick: () => {
    const prev = P.history.pop();
    if (prev === undefined) return;
    setDoc(prev); save.now(); P.sel = null; drawPage();
  }, title: 'Annuler la dernière modification' }, '↶', h('span', { class: 'hide-phone' }, ' Annuler'));

  const tools = h('div', { class: 'tools' },
    seg('Vue', [['page', 'Aperçu'], ['form', 'Formulaire']], P.mode, v => { P.mode = v; P.sel = null; drawPage(); }),
    P.mode === 'page' ? seg('Écran', [['phone', 'Téléphone'], ['desktop', 'Ordinateur']], P.device,
      v => { P.device = v; drawPage(); }) : null,
    undo);

  P.panel = h('aside', { class: 'panel', hidden: true });
  P.frame = null;
  const body = P.mode === 'page' ? stage() : formView();
  screen(topbar(pageName(P.path), '#/'), tools, h('div', { class: 'work work--' + P.mode }, body, P.panel));
  if (P.frame) writeFrame(P.frame);
  if (P.sel) select(P.sel.index, true);
}

/* La page est écrite dans l'aperçu (document.write) plutôt que chargée
   par son adresse : on montre ainsi le brouillon, pas la version en
   ligne. Le premier script redonne à l'aperçu l'adresse de la vraie
   page, dont les scripts du site ont besoin (location.pathname…). */
function writeFrame(frame) {
  const doc = frame.contentDocument;
  const real = '/' + P.path;
  const head = '<script>try{history.replaceState(null,"",' + JSON.stringify(real) + ')}catch(e){}<\/script>';
  doc.open();
  doc.write(S.stamped(P.doc, real.replace(/[^/]*$/, ''), head));
  doc.close();
  const ready = () => wire(frame);
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', ready, { once: true });
  else ready();
  frame.contentWindow.addEventListener('load', () => { if (P.scroll) frame.contentWindow.scrollTo(0, P.scroll); }, { once: true });
}

/* ─── l'aperçu ─── */

function stage() {
  const box = h('div', { class: 'stage stage--' + P.device });
  const frame = h('iframe', { class: 'frame', title: 'Aperçu de la page' });
  P.frame = frame;
  box.append(frame);
  const fit = () => {
    const W = P.device === 'phone' ? Math.min(390, box.clientWidth) : 1280;
    const k = Math.min(1, box.clientWidth / W);
    frame.style.width = W + 'px';
    frame.style.height = (box.clientHeight / k) + 'px';
    frame.style.transform = k < 1 ? 'scale(' + k + ')' : '';
    frame.style.left = Math.max(0, (box.clientWidth - W * k) / 2) + 'px';
  };
  const ro = new ResizeObserver(fit);
  ro.observe(box);
  nextOff.push(() => ro.disconnect());
  requestAnimationFrame(fit);
  return box;
}

const ADMIN_CSS = `
[data-adm].adm-hov{outline:2px dashed #B5623C!important;outline-offset:3px;cursor:pointer!important}
[data-adm].adm-sel{outline:3px solid #B5623C!important;outline-offset:3px}
[data-adm].adm-blk{outline:3px dotted #33474B!important;outline-offset:4px}
html{scroll-behavior:auto!important}`;

function wire(frame) {
  const win = frame.contentWindow;
  const doc = frame.contentDocument;
  if (!doc) return;
  doc.head.append(Object.assign(doc.createElement('style'), { textContent: ADMIN_CSS }));
  patchImages(doc);
  if (P.scroll) win.scrollTo(0, P.scroll);
  win.addEventListener('scroll', () => { P.scroll = win.scrollY; }, { passive: true });

  let hov = [];
  const clearHov = () => { hov.forEach(e => e.classList.remove('adm-hov')); hov = []; };
  let raf = 0;
  doc.addEventListener('mousemove', e => {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      clearHov();
      const hit = pick(doc, e.clientX, e.clientY);
      if (hit) { hit.el.classList.add('adm-hov'); hov = [hit.el]; }
    });
  });
  doc.addEventListener('mouseleave', clearHov);
  doc.addEventListener('click', e => {
    e.preventDefault();
    e.stopPropagation();
    const hit = pick(doc, e.clientX, e.clientY);
    if (hit) return select(+hit.el.dataset.adm);
    const t = e.target.closest && e.target.closest('[data-adm]');
    if (!t) return;
    for (const d of DATA) {
      if (d.mounts && d.mounts.some(m => e.target.closest(m))) return openData(d.id);
    }
    select(+t.dataset.adm);
  }, true);
  doc.addEventListener('submit', e => e.preventDefault(), true);
  if (P.sel) mark();
}

function visible(el) {
  for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
    const cs = n.ownerDocument.defaultView.getComputedStyle(n);
    if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity < 0.05) return false;
  }
  return true;
}

// L'élément modifiable sous le doigt, même sous un voile ou un calque
// qui ne réagit pas aux clics : un texte passe avant une photo.
function pick(doc, x, y) {
  let best = null;
  for (const el of doc.querySelectorAll('[data-adm]')) {
    const ed = P.byNode.get(+el.dataset.adm);
    if (!ed) continue;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height || x < r.left || x > r.right || y < r.top || y > r.bottom) continue;
    const score = (ed.kind === 'image' ? 1e12 : 0) + r.width * r.height;
    if (best && score >= best.score) continue;
    if (!visible(el)) continue;
    best = { el, ed, score };
  }
  return best;
}

function liveEls(index) {
  const doc = P.frame && P.frame.contentDocument;
  return doc ? [...doc.querySelectorAll('[data-adm="' + index + '"]')] : [];
}

function mark() {
  const doc = P.frame && P.frame.contentDocument;
  if (!doc) return;
  doc.querySelectorAll('.adm-sel,.adm-blk').forEach(e => e.classList.remove('adm-sel', 'adm-blk'));
  if (!P.sel) return;
  const cls = P.byNode.has(P.sel.index) ? 'adm-sel' : 'adm-blk';
  liveEls(P.sel.index).forEach(e => e.classList.add(cls));
}

// Les photos envoyées mais pas encore en ligne : la copie locale.
function patchImages(doc) {
  doc.querySelectorAll('img').forEach(img => {
    const u = store.previewUrl(img.getAttribute('src'));
    if (u) { img.removeAttribute('srcset'); img.src = u; }
  });
}

/* ─── la sélection et le panneau ─── */

function select(index, quiet) {
  const node = P.doc.nodes[index];
  if (!node) return;
  P.sel = node;
  mark();
  if (P.mode === 'page') drawPanel();
  if (!quiet && P.mode === 'page') {
    const el = liveEls(index)[0];
    // sur téléphone, le panneau couvre le bas : l'élément remonte au-dessus
    if (el && isPhone()) {
      const win = el.ownerDocument.defaultView;
      win.scrollTo({ top: win.scrollY + el.getBoundingClientRect().top - 90, behavior: 'smooth' });
    }
  }
}

const TAGS = { section: 'Section', header: 'En-tête', footer: 'Pied de page', nav: 'Menu', main: 'Contenu',
  article: 'Article', aside: 'Encadré', figure: 'Figure', ul: 'Liste', ol: 'Liste', li: 'Élément',
  a: 'Lien', p: 'Paragraphe', h1: 'Titre', h2: 'Titre', h3: 'Sous-titre', h4: 'Sous-titre', h5: 'Sous-titre', h6: 'Sous-titre',
  img: 'Photo', picture: 'Photo', button: 'Bouton', form: 'Formulaire', label: 'Étiquette', blockquote: 'Citation',
  figcaption: 'Légende', span: 'Texte', div: 'Bloc', details: 'Dépliant', summary: 'Titre du dépliant', input: 'Champ' };

function nodeLabel(n) {
  const cls = (S.attr(n, 'class') || '').split(/\s+/)[0];
  const id = S.attr(n, 'id');
  return (TAGS[n.tag] || n.tag) + (id ? ' #' + id : cls ? ' · ' + cls.replace(/__|--/g, ' ') : '');
}

function closePanel() {
  P.sel = null;
  mark();
  if (P.panel) { P.panel.hidden = true; P.panel.replaceChildren(); }
}

function drawPanel() {
  const node = P.sel;
  const ed = P.byNode.get(node.index);
  const region = S.regionAt(P.doc, node.start);
  const panel = P.panel;
  panel.hidden = false;
  panel.replaceChildren();

  // le fil : du corps de la page jusqu'à l'élément
  const chain = [];
  for (let n = node; n && n.tag !== 'body' && n.tag !== '#root'; n = n.parent) chain.unshift(n);
  const crumbs = h('div', { class: 'crumbs' }, ...chain.slice(-4).map(n => h('button', { type: 'button',
    class: n === node ? 'on' : '', onclick: () => select(n.index) }, nodeLabel(n))));

  panel.append(h('header', { class: 'panel__head' },
    h('strong', null, ed ? (ed.kind === 'image' ? 'Photo' : ed.kind === 'placeholder' ? 'Champ' : nodeLabel(node).split(' ')[0]) : 'Bloc'),
    h('button', { type: 'button', class: 'btn btn--ghost', onclick: closePanel }, 'Fermer')), crumbs);

  if (region && region.kind === 'cms') {
    const d = DATA.find(x => x.page === P.path && x.region);
    if (d) return regionPanel(d, d.region(region.name));
  }
  if (region && region.kind === 'partial') {
    panel.append(h('p', { class: 'note' }, 'Menu ou pied de page commun : la modification s’appliquera à toutes les pages qui l’utilisent.'));
  }

  if (ed && ed.kind === 'text') panel.append(textEditor(ed, region));
  else if (ed && ed.kind === 'image') panel.append(imageEditor(ed, region));
  else if (ed && ed.kind === 'placeholder') panel.append(placeholderEditor(ed, region));
  else panel.append(h('p', { class: 'f-hint' }, 'Un bloc de la page. Touche un texte ou une photo pour les modifier, ou déplace le bloc entier.'));

  if (!region) panel.append(blockTools(node));
}

async function regionPanel(d, key) {
  const panel = P.panel;
  const field = d.fields.find(f => f.name === key);
  const entry = await getData(d.id);
  panel.append(h('p', { class: 'note' }, 'Ce passage vient des textes de l’accueil (un seul texte pour le grand écran et le téléphone). ' +
    'L’aperçu le montrera après publication.'));
  if (field) {
    const ctx = { schema: d, data: entry.obj, path: [key], changed: entry.save, open: true };
    panel.append(h('h3', { class: 'panel__sub' }, field.label),
      field.widget === 'object' ? form(field.fields, entry.obj[key], ctx) : form([field], entry.obj, Object.assign({}, ctx, { path: [] })));
  }
  panel.append(h('p', null, h('a', { href: '#/data/' + d.id, class: 'btn btn--ghost' }, 'Tous les textes de l’accueil')));
}

function openData(id) {
  location.hash = '#/data/' + id;
}

/* Une modification du texte de la page, avec mise à jour de l'aperçu
   sans le recharger (on garde la position et les animations). */
function commit(newSrc, opts = {}) {
  if (newSrc === P.doc.src) return;
  remember(opts.force);
  const oldDoc = P.doc;
  setDoc(newSrc);
  save();
  if (opts.partial) syncPartial(opts.partial, oldDoc, opts.node);
  if (opts.reload) {
    if (opts.at !== undefined) P.sel = opts.at === null ? null : S.nodeAt(P.doc, opts.at);
    drawPage();
    return;
  }
  if (P.sel) P.sel = P.doc.nodes[P.sel.index];
}

// Après un changement à l'intérieur d'un élément : l'aperçu reçoit le
// nouveau contenu et les numéros des éléments qui suivent glissent.
function liveInner(oldDoc, node) {
  const doc = P.frame && P.frame.contentDocument;
  if (!doc) return;
  const delta = P.doc.nodes.length - oldDoc.nodes.length;
  let last = node.index;
  (function deep(n) { for (const c of n.children) { last = Math.max(last, c.index); deep(c); } })(oldDoc.nodes[node.index]);
  const html = S.stampedInner(P.doc, P.doc.nodes[node.index]);
  liveEls(node.index).forEach(el => { el.innerHTML = html; });
  if (delta) {
    doc.querySelectorAll('[data-adm]').forEach(el => {
      const i = +el.dataset.adm;
      if (i > last) el.dataset.adm = i + delta;
    });
  }
  patchImages(doc);
}

// Une modification dans un menu commun : le fichier de partials/ suit.
async function syncPartial(region, oldDoc, node) {
  const file = 'partials/' + region.name + '.html';
  let text;
  try { text = await store.readText(file); } catch (e) { return; }
  const before = S.outer(oldDoc, oldDoc.nodes[node.index]);
  const after = S.outer(P.doc, P.doc.nodes[node.index]);
  const at = text.indexOf(before);
  if (at < 0 || text.indexOf(before, at + 1) >= 0) {
    toast('Ce menu n’a pas pu être mis à jour sur les autres pages : seule cette page change.');
    return;
  }
  store.putText(file, text.slice(0, at) + after + text.slice(at + before.length));
}

// Un élément modifiable garde son rang (eid) tant que la page n'est
// pas restructurée : on le retrouve par là après chaque frappe.
const cur = ed => P.eds[ed.eid].node;
const partialOf = region => (region && region.kind === 'partial' ? region : null);

function textEditor(ed, region) {
  const wrap = h('div', { class: 'ed' });
  const onChange = html => {
    const n = cur(ed);
    const oldDoc = P.doc;
    commit(S.setInner(P.doc, n, html), { partial: partialOf(region), node: n });
    liveInner(oldDoc, n);
  };
  wrap.append(richText(S.inner(P.doc, ed.node), onChange));
  wrap.append(linkFields(ed, region));
  return wrap;
}

// Le lien de l'élément lui-même ou du lien qui l'entoure.
function linkFields(ed, region) {
  let k = 0;
  let n0 = ed.node;
  while (n0 && n0.tag !== 'a' && n0.tag !== 'body') { n0 = n0.parent; k++; }
  if (!n0 || n0.tag !== 'a') return '';
  const link = () => { let n = cur(ed); for (let i = 0; i < k; i++) n = n.parent; return n; };
  return h('label', { class: 'f-field' }, h('span', { class: 'f-label' }, 'Adresse du lien'),
    h('input', { type: 'text', class: 'f-input', value: S.attr(n0, 'href') || '', oninput: e => {
      const n = link();
      commit(S.setAttr(P.doc, n, 'href', e.target.value), { partial: partialOf(region), node: n });
    } }),
    h('span', { class: 'f-hint' }, 'Ex. /contato.html, https://wa.me/55…, mailto:…'));
}

function placeholderEditor(ed, region) {
  return h('label', { class: 'f-field' }, h('span', { class: 'f-label' }, 'Texte d’exemple dans le champ'),
    h('input', { type: 'text', class: 'f-input', value: S.attr(ed.node, 'placeholder') || '', oninput: e => {
      const n = cur(ed);
      commit(S.setAttr(P.doc, n, 'placeholder', e.target.value), { partial: partialOf(region), node: n });
      liveEls(n.index).forEach(el => el.setAttribute('placeholder', e.target.value));
    } }));
}

function imageEditor(ed, region) {
  const node = () => cur(ed);
  const src = S.attr(ed.node, 'src') || '';
  const box = h('div', { class: 'ed' });
  const partial = partialOf(region);

  const thumb = h('img', { class: 'ed__thumb', src: images.url(src.replace(/^(\.\.\/)+/, '/')), alt: '' });
  const el = liveEls(ed.node.index)[0];
  const cover = el && getComputedStyle(el).objectFit === 'cover';

  box.append(thumb, h('div', { class: 'f-row' }, h('button', { type: 'button', class: 'btn', onclick: async () => {
    const [file] = await images.pick();
    if (!file) return;
    box.classList.add('is-busy');
    const up = await images.upload(file);
    box.classList.remove('is-busy');
    const web = '/' + up.path;
    const index = node().index;
    let doc = P.doc;
    const step = fn => { doc = S.parse(fn(doc, doc.nodes[index])); };
    step((d, n) => S.setAttr(d, n, 'src', web));
    step((d, n) => S.setAttr(d, n, 'srcset', null));
    step((d, n) => S.setAttr(d, n, 'sizes', null));
    if (S.attr(doc.nodes[index], 'width') && S.attr(doc.nodes[index], 'height')) {
      step((d, n) => S.setAttr(d, n, 'width', String(up.w)));
      step((d, n) => S.setAttr(d, n, 'height', String(up.h)));
    }
    // dans un <picture>, les autres versions de l'ancienne photo s'en vont
    const pic = doc.nodes[index].parent;
    const sources = pic && pic.tag === 'picture'
      ? pic.children.filter(c => c.tag === 'source' && !/^data:/.test(S.attr(c, 'srcset') || '')) : [];
    for (let i = sources.length - 1; i >= 0; i--) doc = S.parse(S.remove(doc, doc.nodes[sources[i].index]).src);
    if (sources.length) {
      commit(doc.src, { force: true });
      P.sel = P.doc.nodes.find(n => n.tag === 'img' && S.attr(n, 'src') === web) || null;
      drawPage();
      return;
    }
    commit(doc.src, { force: true, partial, node: node() });
    liveEls(index).forEach(e => { e.removeAttribute('srcset'); e.src = images.url(up.path); });
    thumb.src = images.url(up.path);
  } }, 'Changer la photo')));

  box.append(h('label', { class: 'f-field' }, h('span', { class: 'f-label' }, 'Description (pour Google et les malvoyants)'),
    h('input', { type: 'text', class: 'f-input', value: S.attr(ed.node, 'alt') || '', oninput: e => {
      commit(S.setAttr(P.doc, node(), 'alt', e.target.value), { partial, node: node() });
    } })));

  if (cover) {
    const m = /object-position\s*:\s*([^;]+)/.exec(S.attr(ed.node, 'style') || '');
    const dot = h('span', { class: 'f-dot', hidden: !m });
    const pos = m ? m[1].trim().split(/\s+/) : ['50%', '50%'];
    dot.style.left = pos[0]; dot.style.top = pos[1] || '50%';
    const stageEl = h('div', { class: 'f-stage', onclick: e => {
      const r = e.currentTarget.getBoundingClientRect();
      const x = Math.round((e.clientX - r.left) / r.width * 100);
      const y = Math.round((e.clientY - r.top) / r.height * 100);
      const v = x + '% ' + y + '%';
      dot.hidden = false; dot.style.left = x + '%'; dot.style.top = y + '%';
      commit(S.setStyleProp(P.doc, node(), 'object-position', v), { partial, node: node() });
      liveEls(node().index).forEach(e2 => { e2.style.objectPosition = v; });
    } }, h('img', { src: thumb.src, alt: '', draggable: false }), dot);
    box.append(h('p', { class: 'f-label' }, 'Cadrage'),
      h('p', { class: 'f-hint' }, 'La photo est recadrée sur la page : touche ce qui doit rester visible.'), stageEl);
  }
  box.append(linkFields(ed, region));
  return box;
}

function blockTools(node) {
  const index = node.index;
  const run = (fn, msg) => {
    const res = fn(P.doc, P.doc.nodes[index]);
    if (!res) return;
    commit(res.src, { force: true, reload: true, at: res.at });
    if (msg) toast(msg);
  };
  const isBody = !node.parent || node.parent.tag === '#root' || node.tag === 'body';
  if (isBody) return '';
  return h('div', { class: 'blk' },
    h('p', { class: 'f-label' }, 'Ce bloc : ' + nodeLabel(node)),
    h('div', { class: 'blk__row' },
      h('button', { type: 'button', class: 'btn', disabled: !S.canMove(node, -1), onclick: () => run((d, n) => S.move(d, n, -1)) }, '↑ Monter'),
      h('button', { type: 'button', class: 'btn', disabled: !S.canMove(node, 1), onclick: () => run((d, n) => S.move(d, n, 1)) }, '↓ Descendre'),
      h('button', { type: 'button', class: 'btn', onclick: () => run(S.duplicate, 'Bloc dupliqué : la copie est sélectionnée.') }, 'Dupliquer'),
      h('button', { type: 'button', class: 'btn btn--danger', onclick: () => {
        if (confirm('Supprimer ce bloc (' + nodeLabel(node) + ') ? « Annuler » en haut le fait revenir.')) run(S.remove);
      } }, 'Supprimer')),
    node.parent && node.parent.tag !== 'body' && node.parent.tag !== '#root'
      ? h('button', { type: 'button', class: 'btn btn--ghost', onclick: () => select(node.parent.index) },
        '↖ Choisir le bloc qui le contient (' + nodeLabel(node.parent) + ')') : null);
}

/* ─── la vue formulaire d'une page ─── */

const GROUP = new Set(['section', 'header', 'footer', 'nav', 'article', 'aside', 'main', 'form', 'details']);

function groupOf(node) {
  let g = null;
  for (let n = node.parent; n && n.tag !== 'body' && n.tag !== '#root'; n = n.parent) {
    if (GROUP.has(n.tag) && n.tag !== 'main') { g = n; break; }
    if (n.parent && n.parent.tag === 'body') g = g || n;
  }
  return g;
}

function formView() {
  const box = h('div', { class: 'pform' });
  const metaEls = S.meta(P.doc).map(m => {
    const index = m.node.index;
    const val = m.kind === 'title' ? S.decode(S.inner(P.doc, m.node)) : S.attr(m.node, 'content');
    return h('label', { class: 'f-field' }, h('span', { class: 'f-label' }, m.label),
      h('textarea', { class: 'f-input', rows: 2, value: val || '', oninput: e => {
        const n = P.doc.nodes[index];
        commit(m.kind === 'title' ? S.setInner(P.doc, n, S.escapeText(e.target.value)) : S.setAttr(P.doc, n, 'content', e.target.value));
      } }));
  });
  if (metaEls.length) box.append(h('details', { class: 'f-obj' }, h('summary', null, 'Google et partage'), ...metaEls));

  const data = forPage(P.path);
  if (data) {
    box.append(h('div', { class: 'f-obj f-obj--link' }, h('p', null, data.label + ' : un seul texte pour le grand écran et le téléphone.'),
      h('a', { class: 'btn', href: '#/data/' + data.id }, 'Ouvrir')));
  }

  const groups = new Map();
  for (const ed of P.eds) {
    const region = S.regionAt(P.doc, ed.node.start);
    if (region && region.kind === 'cms') continue;
    const g = groupOf(ed.node);
    const key = g ? g.index : -1;
    if (!groups.has(key)) groups.set(key, { node: g, region, eds: [] });
    groups.get(key).eds.push(ed);
  }
  for (const [, g] of groups) {
    const title = g.node ? (firstHeading(g.node) || nodeLabel(g.node)) : 'Page';
    const fields = g.eds.map(ed => formField(ed, g.region));
    const tools = g.node && !g.region ? blockTools(g.node) : null;
    box.append(h('details', { class: 'f-obj' },
      h('summary', null, title, g.region && g.region.kind === 'partial' ? h('small', null, ' · commun à toutes les pages') : null),
      ...fields, tools));
  }
  return box;
}

function firstHeading(node) {
  const hd = P.eds.find(e => e.kind === 'text' && /^h[1-4]$/.test(e.node.tag) && e.node.start >= node.start && e.node.end <= node.end);
  return hd ? S.textOf(P.doc, hd.node).slice(0, 60) : null;
}

function formField(ed, region) {
  const label = ed.kind === 'image' ? 'Photo' : ed.kind === 'placeholder' ? 'Champ' : nodeLabel(ed.node).split(' ')[0];
  const body = ed.kind === 'text' ? textEditor(ed, region) : ed.kind === 'image' ? imageEditor(ed, region) : placeholderEditor(ed, region);
  return h('div', { class: 'pf' }, h('p', { class: 'f-label' }, label), body);
}

/* ─── publier ─── */

const fill = (el, ...kids) => el.replaceChildren(...kids.filter(k => k && k !== ''));

async function publishDialog() {
  const dlg = h('dialog', { class: 'sheet' });
  const close = () => dlg.close();
  dlg.addEventListener('close', () => dlg.remove());
  document.body.append(dlg);

  function draw(msg) {
    const list = store.draftList();
    const texts = list.filter(d => d.text !== undefined);
    const photos = list.filter(d => d.blob);
    fill(dlg, 
      h('header', null, h('h2', null, 'Publier'), h('button', { type: 'button', class: 'btn btn--ghost', onclick: close }, 'Fermer')),
      msg ? h('p', { class: 'note' }, msg) : null,
      texts.length ? h('ul', { class: 'list list--drafts' }, ...texts.map(d => h('li', null,
        h('span', null, fileName(d.path)),
        h('button', { type: 'button', class: 'btn btn--ghost', onclick: () => {
          if (!confirm('Abandonner les modifications de « ' + fileName(d.path) + ' » ?')) return;
          store.drop(d.path);
          dataCache.forEach((v, k) => { if (v.schema.file === d.path) dataCache.delete(k); });
          draw(); route();
        } }, 'Abandonner')))) : null,
      photos.length ? h('p', { class: 'f-hint' }, photos.length + ' photo' + (photos.length > 1 ? 's' : '') + ' envoyée' + (photos.length > 1 ? 's' : '') + ' avec.') : null,
      list.length ? h('button', { type: 'button', class: 'btn btn--pub btn--big', onclick: go }, 'Publier sur le site')
        : h('p', null, 'Rien à publier.'));
  }

  async function go() {
    const list = store.draftList();
    const names = [...new Set(list.filter(d => d.text !== undefined).map(d => fileName(d.path)))];
    const message = 'Admin : ' + (names.join(', ') || 'photos');
    const status = h('p', { class: 'note' }, 'Préparation…');
    fill(dlg, h('header', null, h('h2', null, 'Publication')), status);
    try {
      await mergeConflicts(status);
      const res = await store.publish(message, s => { status.textContent = s; });
      dataCache.clear();
      const robot = res && res.files.some(f => f === 'data/accueil.json' || f.startsWith('partials/'));
      fill(dlg, h('header', null, h('h2', null, res && res.essai ? 'Essai' : 'Publié'),
        h('button', { type: 'button', class: 'btn btn--ghost', onclick: close }, 'Fermer')),
      h('p', null, res && res.essai ? 'Mode essai : rien n’est parti (liste dans la console).'
        : 'C’est en ligne dans 2 à 4 minutes.' + (robot ? ' GitHub reconstruit d’abord les pages concernées (accueil, menus).' : '')));
      if (P.path) { const p = P.path; if (location.hash.startsWith('#/page/')) pageView(p); }
    } catch (e) {
      if (e.conflicts) {
        draw('Ces fichiers ont changé sur GitHub depuis que tu les as ouverts et je n’ai pas pu fusionner : ' +
          e.conflicts.map(fileName).join(', ') + '. Abandonne leurs modifications puis refais-les.');
      } else draw('Échec : ' + e.message);
    }
  }

  draw();
  dlg.showModal();
}

/* Le robot GitHub réécrit les zones cms: et partial: des pages après
   une publication. Si une page a changé seulement là, on reprend ses
   zones neuves dans notre version et on publie quand même. */
async function mergeConflicts(status) {
  const list = await store.conflicts();
  for (const path of list) {
    const d = store.draft(path);
    if (!/\.html$/.test(path) || !d || !d.base) continue;
    status.textContent = 'Fusion de ' + fileName(path) + '…';
    const base = await store.readBlob(d.base);
    const theirs = await store.readPublished(path);
    const blank = src => {
      const doc = S.parse(src);
      let s = src;
      [...doc.regions].sort((a, b) => b.start - a.start).forEach(r => { s = s.slice(0, r.start) + s.slice(r.end); });
      return s;
    };
    if (blank(base) !== blank(theirs)) continue; // vrai conflit : publish() le signalera
    const tDoc = S.parse(theirs);
    const ours = S.parse(d.text);
    let out = d.text;
    [...ours.regions].sort((a, b) => b.start - a.start).forEach(r => {
      const t = tDoc.regions.find(x => x.kind === r.kind && x.name === r.name);
      if (t) out = out.slice(0, r.start) + theirs.slice(t.start, t.end) + out.slice(r.end);
    });
    store.rebase(path, out);
    if (P.path === path) setDoc(out);
  }
}

/* ─── démarrage ─── */

function route() {
  const hash = decodeURIComponent(location.hash.replace(/^#\/?/, ''));
  if (hash.startsWith('page/')) {
    const path = hash.slice(5);
    if (path !== P.path || !app.querySelector('.work')) return pageView(path);
    return;
  }
  P.path = null;
  P.scroll = 0;
  if (hash.startsWith('data/') && byId(hash.slice(5))) return dataView(hash.slice(5));
  home();
}

async function boot() {
  if (!store.essai && !store.token()) return login();
  screen(h('main', { class: 'loading' }, 'Chargement…'));
  try {
    await store.loadTree();
  } catch (e) {
    if (e.status === 401) { store.setToken(''); return login('La clé a expiré ou a été supprimée, colle-en une nouvelle.'); }
    screen(h('main', { class: 'loading' }, 'GitHub ne répond pas (' + e.message + '). Réessaie dans un instant.'));
    return;
  }
  const n = await store.restoreDrafts();
  window.addEventListener('hashchange', () => { P.path = null; route(); });
  route();
  if (n) toast(n + ' modification' + (n > 1 ? 's' : '') + ' pas encore publiée' + (n > 1 ? 's' : '') + ' retrouvée' + (n > 1 ? 's' : '') + '.');
}

window.addEventListener('pagehide', () => { if (P.path && P.doc) save.now(); });
boot();
