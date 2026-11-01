// Une traduction (data/pessoas/fr/…, en/…) n'a que des textes, avec la même
// forme que le fichier portugais. Ces deux fonctions servent au site (i18n.js)
// et à l'admin, pour lire et écrire une traduction de la même façon.

// Liste qu'on fusionne case par case (cartes, champs, liens), par opposition
// aux listes de textes ou de segments ({ t, em }), remplacées en entier parce
// qu'une phrase traduite n'a pas le même découpage.
const byCell = (list) => list.every((x) => x && typeof x === 'object' && !Array.isArray(x) && !('t' in x));

// Portugais + traduction → ce que montre la page dans cette langue
export function merge(pt, over) {
  if (Array.isArray(pt) && Array.isArray(over)) {
    if (!byCell(pt)) return over;
    return pt.map((x, i) => (i in over && over[i] != null ? merge(x, over[i]) : x));
  }
  if (pt && over && typeof pt === 'object' && typeof over === 'object' && !Array.isArray(pt) && !Array.isArray(over)) {
    const out = { ...pt };
    for (const k of Object.keys(over)) out[k] = k in pt ? merge(pt[k], over[k]) : over[k];
    return out;
  }
  return over;
}

const at = (o, keys) => keys.reduce((x, k) => (x == null ? x : x[k]), o);

// Écrire un texte dans la traduction, au chemin qu'il a dans le portugais
// (« oferta.cards.2.title »). Les cases créées en chemin prennent la forme
// du portugais (liste ou objet). Si le chemin passe par une liste remplacée
// en entier (les lignes du manifeste), la traduction reçoit toute la liste.
export function setIn(tr, pt, path, value) {
  const keys = path.split('.');
  for (let i = 1; i < keys.length; i++) {
    const node = at(pt, keys.slice(0, i));
    if (Array.isArray(node) && !byCell(node)) {
      const whole = structuredClone(at(merge(pt, tr || {}), keys.slice(0, i)));
      put(whole, keys.slice(i), value);
      return write(tr, pt, keys.slice(0, i), whole);
    }
  }
  return write(tr, pt, keys, value);
}

function write(tr, pt, keys, value) {
  const out = Array.isArray(tr) ? tr.slice() : { ...(tr || {}) };
  if (keys.length === 1) { out[keys[0]] = value; return out; }
  const [k, ...rest] = keys;
  const child = out[k] ?? (Array.isArray(pt && pt[k]) ? [] : {});
  out[k] = write(child, pt && pt[k], rest, value);
  if (Array.isArray(out[k])) for (let i = 0; i < out[k].length; i++) if (!(i in out[k])) out[k][i] = null;
  return out;
}

function put(o, keys, value) {
  const last = keys.pop();
  at(o, keys)[last] = value;
}
