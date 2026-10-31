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

// Le type d'éditeur selon ce qu'il y a dans le champ
export function kind(value) {
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
};

// « manifesto.lines.1 » → « Manifeste, ligne 2 »
export function label(path) {
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
  const a = leaves(base, '', {}), b = leaves(data, '', {});
  const fields = new Set();
  for (const p of new Set([...Object.keys(a), ...Object.keys(b)])) {
    if (a[p] === b[p]) continue;
    let f = p;
    while (/\.\d+\.(t|em)$/.test(f)) f = f.replace(/\.\d+\.(t|em)$/, '');
    f = f.replace(/^(hero\.name)\.\d+$/, '$1');
    fields.add(f);
  }
  return [...fields];
}
