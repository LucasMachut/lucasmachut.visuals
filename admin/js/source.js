/* ============================================================
   LE HTML D'UNE PAGE, LU COMME UN TEXTE

   L'admin ne connaît aucune page à l'avance : il lit le fichier tel
   qu'il est dans le dépôt et trouve tout seul ce qui se modifie
   (les blocs de texte, les photos). Un changement de design ne le
   casse donc pas : une nouvelle page, de nouvelles classes, un autre
   CSS, il relit et retrouve.

   Les modifications sont faites dans le texte du fichier, à
   l'endroit exact de l'élément, sans réécrire le reste : le fichier
   publié ne diffère de l'original que là où on a touché.
   ============================================================ */

const VOID = new Set('area base br col embed hr img input link meta source track wbr'.split(' '));
const RAW = new Set(['script', 'style', 'textarea', 'title']);

// Ce qui peut vivre à l'intérieur d'un bloc de texte.
const INLINE = new Set(('a abbr b bdi bdo br cite code data del dfn em i ins kbd mark q s samp ' +
  'small span strong sub sup time u var wbr').split(' '));
// Ce qu'on ne fouille jamais.
const SKIP = new Set('script style noscript template svg head iframe video audio canvas select textarea option'.split(' '));
// Un <p> se ferme tout seul devant ces balises (HTML le permet).
// Les balises faites pour porter une phrase entière.
const PHRASE = new Set(('p h1 h2 h3 h4 h5 h6 li dt dd a button label legend caption figcaption ' +
  'blockquote summary td th span small em strong cite q b i').split(' '));
const NOSTAMP = new Set(['script', 'style', 'noscript', 'template']);
const CLOSES_P = new Set(('address article aside blockquote details div dl fieldset figcaption figure ' +
  'footer form h1 h2 h3 h4 h5 h6 header hr main nav ol p pre section table ul').split(' '));

const TAG = /<!--[\s\S]*?-->|<![^>]*>|<\/([a-zA-Z][\w:-]*)\s*>|<([a-zA-Z][\w:-]*)((?:[^>"']|"[^"]*"|'[^']*')*?)(\/?)>/g;
const ATTR = /([^\s=\/>"']+)(?:\s*=\s*("[^"]*"|'[^']*'|[^\s>"']+))?/g;

function parseAttrs(s, offset) {
  const out = [];
  ATTR.lastIndex = 0;
  let m;
  while ((m = ATTR.exec(s))) {
    const a = { name: m[1].toLowerCase(), start: offset + m.index, end: offset + m.index + m[0].length, value: null };
    if (m[2] !== undefined) {
      const raw = m[2];
      const q = raw[0] === '"' || raw[0] === "'";
      a.value = decode(q ? raw.slice(1, -1) : raw);
      a.vStart = offset + m.index + m[0].length - raw.length;
      a.vEnd = a.vStart + raw.length;
    }
    out.push(a);
  }
  return out;
}

const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
let decoder = null;
export function decode(s) {
  if (s.indexOf('&') < 0) return s;
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]*);/gi, (all, e) => {
    if (e[0] === '#') {
      const n = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return String.fromCodePoint(n);
    }
    if (ENT[e] !== undefined) return ENT[e];
    if (typeof document !== 'undefined') {
      decoder = decoder || document.createElement('textarea');
      decoder.innerHTML = all;
      return decoder.value;
    }
    return all;
  });
}

export function escapeText(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/ /g, '&nbsp;');
}
export function escapeAttr(s) {
  return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

/* L'arbre de la page, avec la position de chaque élément dans le texte :
   start/end = l'élément entier, innerStart/innerEnd = son contenu. */
export function parse(src) {
  const root = { tag: '#root', start: 0, end: src.length, innerStart: 0, innerEnd: src.length,
    children: [], attrs: [], parent: null };
  const nodes = [];
  const comments = [];
  const stack = [root];
  const top = () => stack[stack.length - 1];

  function close(node, at, end) {
    node.innerEnd = at;
    node.end = end;
  }

  TAG.lastIndex = 0;
  let m;
  while ((m = TAG.exec(src))) {
    const s = m[0];
    if (s[1] === '!') {
      if (s.startsWith('<!--')) comments.push({ text: s.slice(4, -3).trim(), start: m.index, end: TAG.lastIndex });
      continue;
    }
    if (m[1]) {
      const tag = m[1].toLowerCase();
      let i = stack.length - 1;
      while (i > 0 && stack[i].tag !== tag) i--;
      if (i === 0) continue; // fermeture orpheline : on l'ignore
      while (stack.length - 1 > i) { const n = stack.pop(); close(n, m.index, m.index); }
      close(stack.pop(), m.index, TAG.lastIndex);
      continue;
    }
    const tag = m[2].toLowerCase();
    if (top().tag === 'p' && CLOSES_P.has(tag)) { const n = stack.pop(); close(n, m.index, m.index); }
    if ((tag === 'li' && top().tag === 'li') || ((tag === 'dt' || tag === 'dd') && /^d[td]$/.test(top().tag))) {
      const n = stack.pop(); close(n, m.index, m.index);
    }
    const parent = top();
    const node = {
      tag, start: m.index, openEnd: TAG.lastIndex, innerStart: TAG.lastIndex,
      attrs: parseAttrs(m[3], m.index + 1 + m[2].length), children: [], parent, index: nodes.length,
    };
    nodes.push(node);
    parent.children.push(node);
    if (VOID.has(tag) || m[4]) { node.innerEnd = node.end = TAG.lastIndex; continue; }
    if (RAW.has(tag)) {
      const re = new RegExp('</' + tag + '\\s*>', 'ig');
      re.lastIndex = TAG.lastIndex;
      const c = re.exec(src);
      const at = c ? c.index : src.length;
      close(node, at, c ? re.lastIndex : src.length);
      TAG.lastIndex = node.end;
      continue;
    }
    stack.push(node);
  }
  while (stack.length > 1) { const n = stack.pop(); close(n, src.length, src.length); }

  return { src, root, nodes, regions: regions(comments), body: nodes.find(n => n.tag === 'body') || root };
}

/* Les zones écrites par un script : <!-- cms:nom --> (accueil, depuis
   data/accueil.json) et <!-- partial:nom --> (menus et pieds de page,
   depuis partials/). On ne les modifie pas comme le reste. */
function regions(comments) {
  const out = [];
  const open = {};
  for (const c of comments) {
    const o = /^(cms|partial):([a-z0-9/-]+)/.exec(c.text);
    const f = /^\/(cms|partial):([a-z0-9/-]+)/.exec(c.text);
    if (o) open[o[1] + ':' + o[2]] = c;
    else if (f && open[f[1] + ':' + f[2]]) {
      const s = open[f[1] + ':' + f[2]];
      out.push({ kind: f[1], name: f[2], start: s.end, end: c.start });
    }
  }
  return out;
}

export function regionAt(doc, pos) {
  return doc.regions.find(r => pos >= r.start && pos < r.end) || null;
}

export function attr(node, name) {
  const a = node.attrs.find(x => x.name === name);
  return a ? a.value : null;
}

export function inner(doc, node) { return doc.src.slice(node.innerStart, node.innerEnd); }
export function outer(doc, node) { return doc.src.slice(node.start, node.end); }

export function textOf(doc, node) {
  return decode(inner(doc, node).replace(/<!--[\s\S]*?-->/g, '').replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();
}

function allInline(node) {
  return node.children.every(c => INLINE.has(c.tag) && allInline(c));
}

/* Ce qui se modifie dans la page.
   - texte : le plus grand élément qui ne contient que du texte et des
     balises de mise en forme (un titre, un paragraphe, un bouton…) ;
   - photo : chaque <img> ;
   - champ : le texte d'aide d'un champ de formulaire (placeholder). */
export function editables(doc) {
  const out = [];
  function walk(node) {
    for (const c of node.children) {
      if (SKIP.has(c.tag)) continue;
      if (c.tag === 'img') { out.push({ kind: 'image', node: c }); continue; }
      if ((c.tag === 'input' || c.tag === 'textarea') && attr(c, 'placeholder') !== null) {
        out.push({ kind: 'placeholder', node: c }); continue;
      }
      // Une boîte (div, nav…) qui aligne plusieurs liens ou mots
      // balisés : chacun se modifie à part.
      const boite = !PHRASE.has(c.tag) && c.children.filter(x => x.tag !== 'br').length > 1;
      if (c.tag !== 'br' && !VOID.has(c.tag) && !boite && allInline(c) && textOf(doc, c)) {
        out.push({ kind: 'text', node: c });
        continue;
      }
      walk(c);
    }
  }
  walk(doc.body);
  return out;
}

/* La page envoyée à l'aperçu : chaque élément du corps porte son
   numéro (data-adm), pour qu'un clic dans l'aperçu retrouve sa place
   exacte dans le fichier, même si le JavaScript de la page déplace
   ou recopie des éléments. Le fichier publié, lui, n'en a aucun. */
export function stamped(doc, base, headExtra = '') {
  const ins = [];
  for (const n of doc.nodes) {
    if (n.start < doc.body.start || NOSTAMP.has(n.tag)) continue;
    ins.push({ at: n.start + 1 + n.tag.length, text: ' data-adm="' + n.index + '"' });
  }
  const head = doc.nodes.find(n => n.tag === 'head');
  if (head) {
    const b = base && !doc.nodes.some(n => n.tag === 'base') ? '<base href="' + escapeAttr(base) + '">' : '';
    ins.push({ at: head.openEnd, text: b + headExtra });
  }
  ins.sort((a, b) => b.at - a.at);
  let s = doc.src;
  for (const i of ins) s = s.slice(0, i.at) + i.text + s.slice(i.at);
  return s;
}

// Le contenu d'un élément, numéroté comme dans stamped().
export function stampedInner(doc, node) {
  let s = doc.src.slice(node.innerStart, node.innerEnd);
  const inside = doc.nodes.filter(n => n.start >= node.innerStart && n.end <= node.innerEnd && !NOSTAMP.has(n.tag));
  for (let i = inside.length - 1; i >= 0; i--) {
    const n = inside[i];
    const at = n.start + 1 + n.tag.length - node.innerStart;
    s = s.slice(0, at) + ' data-adm="' + n.index + '"' + s.slice(at);
  }
  return s;
}

/* ─── modifications : chacune rend le nouveau texte du fichier ─── */

function splice(src, a, b, text) { return src.slice(0, a) + text + src.slice(b); }

export function setInner(doc, node, html) {
  return splice(doc.src, node.innerStart, node.innerEnd, html);
}

export function setAttr(doc, node, name, value) {
  const a = node.attrs.find(x => x.name === name);
  const src = doc.src;
  if (value === null || value === undefined) {
    if (!a) return src;
    let s = a.start;
    while (s > node.start && /\s/.test(src[s - 1])) s--;
    return splice(src, s, a.end, '');
  }
  const v = '"' + escapeAttr(value) + '"';
  if (a) return a.vStart !== undefined ? splice(src, a.vStart, a.vEnd, v) : splice(src, a.end, a.end, '=' + v);
  let at = node.openEnd - 1;
  if (src[at - 1] === '/') at--;
  while (at > node.start && /\s/.test(src[at - 1])) at--;
  return splice(src, at, at, ' ' + name + '=' + v);
}

export function setStyleProp(doc, node, prop, value) {
  const style = attr(node, 'style') || '';
  const parts = style.split(';').map(s => s.trim()).filter(s => s && !s.toLowerCase().startsWith(prop + ':'));
  if (value) parts.push(prop + ':' + value);
  return setAttr(doc, node, 'style', parts.length ? parts.join(';') : null);
}

function nl(src) { return src.indexOf('\r\n') >= 0 ? '\r\n' : '\n'; }

// L'indentation de l'élément s'il est seul en début de ligne, sinon null.
function indentOf(src, node) {
  let i = node.start;
  while (i > 0 && (src[i - 1] === ' ' || src[i - 1] === '\t')) i--;
  return i === 0 || src[i - 1] === '\n' ? src.slice(i, node.start) : null;
}

export function siblings(node) {
  return node.parent ? node.parent.children : [];
}

export function canMove(node, dir) {
  const sib = siblings(node);
  const i = sib.indexOf(node);
  return dir < 0 ? i > 0 : i >= 0 && i < sib.length - 1;
}

// Échange l'élément avec son voisin. Rend aussi la position où il
// se trouve après coup, pour le garder sélectionné.
export function move(doc, node, dir) {
  const sib = siblings(node);
  const i = sib.indexOf(node);
  const other = sib[i + dir];
  if (!other) return null;
  const [a, b] = dir < 0 ? [other, node] : [node, other];
  const src = doc.src;
  const A = src.slice(a.start, a.end);
  const B = src.slice(b.start, b.end);
  const out = src.slice(0, a.start) + B + src.slice(a.end, b.start) + A + src.slice(b.end);
  const at = dir < 0 ? a.start : a.start + B.length + (b.start - a.end);
  return { src: out, at };
}

export function duplicate(doc, node) {
  const src = doc.src;
  const ind = indentOf(src, node);
  const sep = ind === null ? ' ' : nl(src) + ind;
  return { src: splice(src, node.end, node.end, sep + src.slice(node.start, node.end)), at: node.end + sep.length };
}

export function remove(doc, node) {
  const src = doc.src;
  const ind = indentOf(src, node);
  if (ind !== null) {
    // l'élément est seul sur sa ligne : la ligne part avec lui
    let e = node.end;
    while (src[e] === ' ' || src[e] === '\t') e++;
    if (src[e] === '\r') e++;
    if (src[e] === '\n') return { src: splice(src, node.start - ind.length, e + 1, ''), at: null };
  }
  return { src: splice(src, node.start, node.end, ''), at: null };
}

export function nodeAt(doc, start) {
  return doc.nodes.find(n => n.start === start) || null;
}

/* Les infos pour Google, en tête de page. */
export function meta(doc) {
  const out = [];
  const title = doc.nodes.find(n => n.tag === 'title');
  if (title) out.push({ label: 'Titre (onglet et Google)', node: title, kind: 'title' });
  for (const n of doc.nodes) {
    if (n.tag !== 'meta') continue;
    const key = attr(n, 'name') || attr(n, 'property');
    if (attr(n, 'content') === null) continue;
    if (key === 'description') out.push({ label: 'Description (sous le titre dans Google)', node: n, kind: 'content' });
    if (key === 'og:title') out.push({ label: 'Titre quand on partage le lien', node: n, kind: 'content' });
    if (key === 'og:description') out.push({ label: 'Description quand on partage le lien', node: n, kind: 'content' });
  }
  return out;
}
