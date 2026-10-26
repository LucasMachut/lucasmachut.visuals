/* ============================================================
   LES CONTENUS QUI VIVENT DANS UN FICHIER DE DONNÉES

   La plupart des pages se modifient directement dans leur HTML.
   Deux contenus passent par un fichier JSON, relu par un script :
     - l'accueil (data/accueil.json → tools/build_accueil.py, qui
       écrit les zones <!-- cms:… --> d'index.html, grand écran et
       téléphone depuis un seul texte) ;
     - les séries de photos (data/fotos.json, lu par le portfólio).

   Types de champs : string, text, select, image, photo_cadree,
   object, list. Une liste a soit `fields` (chaque élément est un
   objet), soit `field` (chaque élément est une valeur).
   ============================================================ */

import { FOLDER } from './images.js';

const hintTexte = 'Ligne vide = nouveau paragraphe (sur téléphone, le texte se remplace au défilement). ' +
  'Simple retour à la ligne = sur téléphone, la phrase passe en dessous. ' +
  'Une ligne entière *entre astérisques* = italique rose sur téléphone.';

const grande = (n, ratio) => ({
  label: n > 1 ? 'Photos grand écran (' + n + ')' : 'Photo grand écran', name: 'fotos_grande', widget: 'list',
  fixed: true, field: { label: 'Photo', name: 'foto', widget: 'photo_cadree', ratio },
});
const telefone = { label: 'Photo téléphone', name: 'foto_telefone', widget: 'photo_cadree', mode: 'telephone' };
const serie = {
  label: 'Suite de photos sous le chapitre (téléphone)', name: 'serie_telefone', widget: 'list',
  label_singular: 'Photo', summary: f => f.alt || f.foto, fields: [
    { label: 'Photo', name: 'foto', widget: 'image' },
    { label: 'Description', name: 'alt', widget: 'string' },
  ],
};

const accueil = {
  id: 'accueil',
  label: 'Accueil — textes et photos',
  file: 'data/accueil.json',
  page: 'index.html',
  folder: () => FOLDER,
  note: 'Un seul texte sert au grand écran et au téléphone. Après « Publier », le site se met à jour en 2 à 4 minutes.',
  fields: [
    { label: 'Ouverture (téléphone)', name: 'abertura', widget: 'object', fields: [
      { label: 'Ligne tapée sous le logo', name: 'linha', widget: 'string' }] },
    { label: '1 · O nome', name: 'nome', widget: 'object', fields: [
      { label: 'Titre', name: 'titulo', widget: 'text', hint: 'Retour à la ligne = retour à la ligne dans le titre.' },
      { label: 'Texte', name: 'texto', widget: 'text' },
      { label: 'Ligne des métiers', name: 'metier', widget: 'string' },
      grande(1, 1.6), telefone] },
    { label: '2 · A memória', name: 'memoria', widget: 'object', fields: [
      { label: 'Texte', name: 'texto', widget: 'text', hint: hintTexte }, grande(2, 0.98), telefone, serie] },
    { label: '3 · Cada pessoa', name: 'cada_pessoa', widget: 'object', fields: [
      { label: 'Texte', name: 'texto', widget: 'text', hint: hintTexte }, grande(1, 1.82), telefone, serie] },
    { label: '4 · O olhar', name: 'olhar', widget: 'object', fields: [
      { label: 'Texte', name: 'texto', widget: 'text', hint: hintTexte }, grande(4, 0.43), telefone, serie] },
    { label: '5 · Os laços', name: 'lacos', widget: 'object', fields: [
      { label: 'Texte', name: 'texto', widget: 'text', hint: hintTexte }, grande(3, 0.76), telefone, serie] },
    { label: '6 · Quem a gente é', name: 'quem', widget: 'object', fields: [
      { label: 'Titre', name: 'titulo', widget: 'string', hint: '*mots* = en italique.' }, grande(3, 0.76), telefone, serie] },
    { label: 'Respiration (grand écran)', name: 'respiracao', widget: 'object', fields: [
      Object.assign(grande(1, 1.67), { label: 'Photo seule, sans texte' })] },
    { label: 'Autoportrait (grand écran)', name: 'autorretrato', widget: 'object', fields: [
      Object.assign(grande(2, 0.98), { label: 'Photos (2)' })] },
    { label: 'Album de tirages (téléphone)', name: 'album', widget: 'object', fields: [
      { label: 'Tirages', name: 'tirages', widget: 'list', label_singular: 'Tirage', summary: f => f.alt || f.foto, fields: [
        { label: 'Photo', name: 'foto', widget: 'image' },
        { label: 'Description', name: 'alt', widget: 'string' },
        { label: 'Sens', name: 'sens', widget: 'select', default: 'h',
          options: [{ label: 'Horizontale', value: 'h' }, { label: 'Verticale', value: 'v' }] }] }] },
    { label: '7 · O que eu faço', name: 'prestacoes', widget: 'list', label_singular: 'Prestation',
      summary: f => f.titulo, fields: [
        { label: 'Titre', name: 'titulo', widget: 'string' },
        { label: 'Texte', name: 'texto', widget: 'text' }] },
    { label: '8 · Hotéis', name: 'hoteis', widget: 'object', fields: [
      { label: 'Titre', name: 'titulo', widget: 'string', hint: '*mots* = en italique.' },
      { label: 'Texte', name: 'texto', widget: 'text' }, grande(1, 1.67), telefone] },
    { label: '9 · Contato', name: 'contato', widget: 'object', fields: [
      { label: 'Titre', name: 'titulo', widget: 'string', hint: '*mots* = en italique.' }, grande(1, 1.6), telefone] },
  ],
  // Une zone <!-- cms:dv-memoria-texte --> d'index.html → la section « memoria ».
  region(name) {
    const k = name.replace(/^(dv|mv)-/, '').split('-')[0];
    return { cada: 'cada_pessoa' }[k] || k;
  },
};

const fotos = {
  id: 'fotos',
  label: 'Séries de photos (portfólio)',
  file: 'data/fotos.json',
  // Les pages qui montrent les séries : un clic dessus ouvre ce formulaire.
  mounts: ['#portfolio-series', '#fotos-gallery'],
  note: 'Ajoute, supprime ou réordonne les séries et leurs photos.',
  folder: (path, data) => {
    const s = data.series && data.series[path[1]];
    return FOLDER + '/' + ((s && s.slug) || 'serie') + (path[2] === 'destaque' ? '/destaque' : '');
  },
  fields: [
    { label: 'Séries', name: 'series', widget: 'list', label_singular: 'Série',
      summary: s => (s.title_pt || s.slug || 'Nouvelle série') + ' — ' + ((s.photos || []).length) + ' photos',
      fields: [
        { label: 'Titre — Portugais', name: 'title_pt', widget: 'string' },
        { label: 'Titre — Anglais', name: 'title_en', widget: 'string' },
        { label: 'Titre — Français', name: 'title_fr', widget: 'string' },
        { label: 'Type — Portugais', name: 'type_pt', widget: 'string', optional: true, hint: 'Ex. Evento, Ensaio, Casamento' },
        { label: 'Type — Anglais', name: 'type_en', widget: 'string', optional: true },
        { label: 'Type — Français', name: 'type_fr', widget: 'string', optional: true },
        { label: 'Lieu', name: 'location', widget: 'string', optional: true, hint: 'Ex. Rio de Janeiro, RJ' },
        { label: 'Toutes les photos de la série', name: 'photos', widget: 'list', field: { name: 'image', widget: 'image' } },
        { label: 'Vitrine du portfólio', name: 'destaque', widget: 'list', optional: true, pickFrom: 'photos',
          hint: 'Les photos montrées sur la page portfólio, dans l’ordre. Vide = les premières photos de la série.',
          field: { name: 'image', widget: 'image' } },
        { label: 'Identifiant technique', name: 'slug', widget: 'string', advanced: true,
          hint: 'Nom du dossier des photos. Ne pas changer une fois la série publiée.' },
        { label: 'Page du projet', name: 'page', widget: 'string', optional: true, advanced: true,
          hint: 'Ex. arpoador.html — ajoute un bouton vers cette page.' },
        { label: 'Films', name: 'videos', widget: 'list', optional: true, advanced: true, label_singular: 'Film',
          summary: v => v.title || v.id, fields: [
            { label: 'Identifiant YouTube', name: 'id', widget: 'string' },
            { label: 'Titre', name: 'title', widget: 'string', optional: true }] },
      ] },
  ],
};

export const DATA = [accueil, fotos];
export const byId = id => DATA.find(d => d.id === id);
export const forPage = page => DATA.find(d => d.page === page) || null;
