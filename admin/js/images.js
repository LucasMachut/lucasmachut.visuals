/* Une photo choisie sur le téléphone (souvent 5 à 15 Mo) part réduite :
   2000 px au plus, en WebP (en JPEG si le navigateur ne sait pas
   écrire le WebP, comme Safari), avec un nom sans espaces ni accents. */

import * as store from './store.js';

export const FOLDER = 'Projets-web/Fotos';
const MAX = 2000;

export function slug(s) {
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'photo';
}

async function encode(file) {
  let bmp;
  try { bmp = await createImageBitmap(file, { imageOrientation: 'from-image' }); }
  catch (e) { bmp = await createImageBitmap(file); }
  const k = Math.min(1, MAX / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * k);
  const h = Math.round(bmp.height * k);
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  c.getContext('2d').drawImage(bmp, 0, 0, w, h);
  const blob = await new Promise(r => c.toBlob(r, 'image/webp', 0.82));
  if (blob && blob.type === 'image/webp') return { blob, ext: 'webp', w, h };
  const jpg = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.85));
  return { blob: jpg, ext: 'jpg', w, h };
}

// Range la photo dans `folder` et rend son chemin dans le dépôt.
export async function upload(file, folder = FOLDER) {
  const { blob, ext, w, h } = await encode(file);
  const base = slug(file.name.replace(/\.[^.]+$/, ''));
  let path = folder + '/' + base + '.' + ext;
  for (let i = 2; store.exists(path); i++) path = folder + '/' + base + '-' + i + '.' + ext;
  store.putBlob(path, blob);
  return { path, w, h };
}

export function pick(multiple = false) {
  return new Promise(resolve => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = multiple;
    input.onchange = () => resolve([...input.files]);
    input.click();
  });
}

// L'adresse à afficher pour un chemin du dépôt (photo publiée ou pas).
export function url(path) {
  if (!path) return '';
  if (/^(blob:|data:|https?:)/.test(path)) return path;
  return store.previewUrl(path) || '/' + String(path).replace(/^\/+/, '');
}
