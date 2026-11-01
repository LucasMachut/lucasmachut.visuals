// Langues du site pessoas : le portugais est la base (data/pessoas/*.json),
// le français et l'anglais ne gardent que leurs textes, dans
// data/pessoas/fr/ et data/pessoas/en/, avec la même forme que le fichier
// portugais. Photos, cadrages, ordre et séries publiées restent ceux du
// portugais ; un texte pas encore traduit s'affiche en portugais.
import { merge } from './translate.js';

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
