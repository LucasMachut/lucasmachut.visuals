// Lire, écrire et nommer un champ du JSON à partir de son chemin
// (« manifesto.lines.1 »), le chemin que portent les data-edit des composants.

export function get(obj, path) {
  return path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);
}

// Copie de obj où seul le champ au chemin donné change
export function set(obj, path, value) {
  const keys = path.split('.');
  const out = Array.isArray(obj) ? obj.slice() : { ...obj };
  let cur = out;
  keys.forEach((k, i) => {
    if (i === keys.length - 1) { cur[k] = value; return; }
    const next = cur[k];
    cur[k] = Array.isArray(next) ? next.slice() : { ...next };
    cur = cur[k];
  });
  return out;
}

// Les groupes qu'on réordonne, allonge ou raccourcit, et le modèle d'un nouvel élément
export const GROUPS = {
  'manifesto.lines': { one: 'ligne', add: 'Ajouter une ligne', make: () => [{ t: 'Nova linha' }] },
  'film_dia.chapters': { one: 'phrase', add: 'Ajouter une phrase', make: () => ({ kicker: 'Novo', title: [{ t: 'Nova frase' }] }) },
  'film_noite.chapters': { one: 'phrase', add: 'Ajouter une phrase', make: () => ({ kicker: 'Novo', title: [{ t: 'Nova frase' }] }) },
  'oferta.cards': {
    one: 'offre', add: 'Ajouter une offre',
    make: (list) => ({ title: 'Nova oferta', text: 'Descrição', photo: (list[0] && list[0].photo) || '', link: { label: 'Ver trabalhos', href: '/portfolio' } }),
  },
};

// « oferta.cards.2.title » → { group: 'oferta.cards', index: 2 }
export function groupOf(path) {
  for (const g of Object.keys(GROUPS)) {
    if (!path.startsWith(g + '.')) continue;
    const m = path.slice(g.length + 1).match(/^(\d+)/);
    if (m) return { group: g, index: Number(m[1]) };
  }
  return null;
}

// Le texte court qui nomme un élément d'un groupe dans la liste du panneau
export function itemText(item) {
  const segs = (p) => (Array.isArray(p) ? p.map((x) => x.t).join('') : '');
  if (Array.isArray(item)) return segs(item);
  if (item && item.title) return typeof item.title === 'string' ? item.title : segs(item.title);
  return '';
}

export const PHOTO = /\.(photo|poster|day|night)$/;

// Le type d'éditeur selon le chemin et ce qu'il y a dans le champ
export function kind(value, path = '') {
  if (PHOTO.test(path)) return 'photo';
  if (typeof value === 'string') return 'text';
  if (Array.isArray(value) && value.every((v) => typeof v === 'string')) return 'words';
  if (Array.isArray(value) && value.every((v) => v && typeof v === 'object' && 't' in v)) return 'segments';
  return 'other';
}

const NAMES = {
  seo: 'Référencement', hero: 'Hero', manifesto: 'Manifeste', film_dia: 'Film du jour', oferta: 'Offres',
  noite: 'Tombée de la nuit', film_noite: 'Film de nuit', fim: 'Pied de page',
  eyebrow: 'surtitre', kicker: 'surtitre', name: 'nom', subline: 'sous-ligne', vertical: 'texte vertical',
  scroll: '« Rolar »', lines: 'ligne', text: 'texte', link: 'lien', label: 'texte', title: 'titre',
  chapters: 'phrase', quote: 'citation', quote_by: 'auteur de la citation', hint: 'indication',
  cards: 'carte', disc: 'disque', columns: 'colonne', links: 'lien', head: 'titre',
  bar_left: 'barre du bas, gauche', bar_right: 'barre du bas, droite', description: 'description',
  photo: 'photo', poster: "photo d'attente", day: 'photo de jour', night: 'photo de nuit', sections: 'Sections',
};
const GROUP_NAMES = { 'manifesto.lines': 'Manifeste, lignes', 'film_dia.chapters': 'Film du jour, phrases',
  'film_noite.chapters': 'Film de nuit, phrases', 'oferta.cards': 'Offres', sections: 'Sections' };

// « manifesto.lines.1 » → « Manifeste, ligne 2 »
export function label(path) {
  if (GROUP_NAMES[path]) return GROUP_NAMES[path];
  const parts = [];
  for (const k of path.split('.')) {
    if (/^\d+$/.test(k)) { if (parts.length) parts[parts.length - 1] += ' ' + (Number(k) + 1); continue; }
    parts.push(NAMES[k] || k);
  }
  const [first, ...rest] = parts;
  return rest.length ? `${first}, ${rest.join(', ')}` : first;
}

// Les champs modifiés entre deux versions, au niveau où on les modifie
// (une ligne entière, pas chacun de ses morceaux)
export function changed(base, data) {
  const leaves = (o, p, out) => {
    if (o && typeof o === 'object') { for (const k of Object.keys(o)) leaves(o[k], p ? `${p}.${k}` : k, out); }
    else out[p] = o;
    return out;
  };
  const fields = new Set();
  // Un groupe allongé, raccourci ou réordonné compte pour un seul changement
  const whole = [];
  for (const g of [...Object.keys(GROUPS), 'sections']) {
    const x = get(base, g) || [], y = get(data, g) || [];
    const sx = x.map((v) => JSON.stringify(v)), sy = y.map((v) => JSON.stringify(v));
    if (sx.length !== sy.length || (sx.join() !== sy.join() && [...sx].sort().join() === [...sy].sort().join()) || g === 'sections' && sx.join() !== sy.join()) {
      fields.add(g); whole.push(g + '.');
    }
  }
  const a = leaves(base, '', {}), b = leaves(data, '', {});
  for (const p of new Set([...Object.keys(a), ...Object.keys(b)])) {
    if (a[p] === b[p]) continue;
    if (whole.some((w) => p.startsWith(w))) continue;
    let f = p;
    while (/\.\d+\.(t|em)$/.test(f)) f = f.replace(/\.\d+\.(t|em)$/, '');
    f = f.replace(/^(hero\.name)\.\d+$/, '$1');
    fields.add(f);
  }
  return [...fields];
}
