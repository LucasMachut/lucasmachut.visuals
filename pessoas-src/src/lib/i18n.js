// Langues du site pessoas : le portugais est la base (data/pessoas/*.json),
// le français et l'anglais ne gardent que leurs textes, dans
// data/pessoas/fr/ et data/pessoas/en/, avec la même forme que le fichier
// portugais. Photos, cadrages, ordre et séries publiées restent ceux du
// portugais ; un texte pas encore traduit s'affiche en portugais.
const files = import.meta.glob('../../../data/pessoas/{fr,en}/**/*.json', { eager: true, import: 'default' });

export const LANGS = ['pt', 'fr', 'en'];
export const HTML_LANG = { pt: 'pt-BR', fr: 'fr', en: 'en' };

// Préfixe d'adresse d'une langue : '' en portugais, '/fr' ou '/en' sinon
export const base = (lang) => (lang === 'pt' ? '' : '/' + lang);

// Adresse d'une page dans une langue, depuis son chemin portugais ('/', '/tango')
export function pathIn(lang, path) {
  if (lang === 'pt') return path;
  return path === '/' ? `/${lang}/` : `/${lang}${path}`;
}

// Petits textes cachés, qui ne sont pas dans les JSON
export const UI = {
  pt: { nav: 'Navegação principal', menu: 'Abrir menu', langs: 'Idioma', close: 'Fechar', prev: 'Foto anterior', next: 'Próxima foto', photo: 'foto' },
  fr: { nav: 'Navigation principale', menu: 'Ouvrir le menu', langs: 'Langue', close: 'Fermer', prev: 'Photo précédente', next: 'Photo suivante', photo: 'photo' },
  en: { nav: 'Main navigation', menu: 'Open menu', langs: 'Language', close: 'Close', prev: 'Previous photo', next: 'Next photo', photo: 'photo' },
};

// Fichier portugais + textes de la langue. name : 'accueil', 'series/tango'…
export function inLang(lang, name, pt) {
  if (lang === 'pt') return pt;
  const over = files[`../../../data/pessoas/${lang}/${name}.json`];
  return localize(over ? merge(pt, over) : pt, lang);
}

// Les objets se fusionnent clé par clé, et les listes d'objets (cartes,
// champs, liens) case par case : la traduction ne remplace que ses textes.
// Une liste de textes ou de segments ({ t, em }) est remplacée en entier,
// parce qu'une phrase traduite n'a pas le même découpage.
function merge(pt, over) {
  if (Array.isArray(pt) && Array.isArray(over)) {
    const byCell = pt.every((x) => x && typeof x === 'object' && !Array.isArray(x) && !('t' in x));
    if (!byCell) return over;
    return pt.map((x, i) => (i in over && over[i] != null ? merge(x, over[i]) : x));
  }
  if (pt && over && typeof pt === 'object' && typeof over === 'object' && !Array.isArray(pt) && !Array.isArray(over)) {
    const out = { ...pt };
    for (const k of Object.keys(over)) out[k] = k in pt ? merge(pt[k], over[k]) : over[k];
    return out;
  }
  return over;
}

// Les liens internes restent dans la langue : /portfolio → /fr/portfolio.
// Lugares, photos et vidéos ne sont pas des pages pessoas ; une adresse déjà
// préfixée (/fr/hoteis) est gardée telle quelle.
function localize(o, lang) {
  if (Array.isArray(o)) return o.map((x) => localize(x, lang));
  if (!o || typeof o !== 'object') return o;
  const out = {};
  for (const [k, v] of Object.entries(o)) {
    out[k] = k === 'href' && typeof v === 'string' ? localHref(v, lang) : localize(v, lang);
  }
  return out;
}
function localHref(href, lang) {
  if (!href.startsWith('/') || /^\/(fr|en)(\/|$)/.test(href)) return href;
  if (/^\/(lugares|photos|videos|Projets-web|admin)(\/|$)/.test(href)) return href;
  return pathIn(lang, href);
}
