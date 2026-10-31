// Les photos envoyées depuis l'admin : réduites, gardées dans le navigateur
// (IndexedDB) jusqu'à « Publier », puis envoyées dans le même commit.
// Réduction seulement : 2000 px au plus, aucun filtre, aucun grain ajouté.

export const FOLDER = 'Projets-web/Fotos/site';
const MAX = 2000;
const DB = 'lm-admin-pessoas';
const STORE = 'photos';

function db() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function tx(mode, fn) {
  const d = await db();
  return new Promise((resolve, reject) => {
    const t = d.transaction(STORE, mode);
    const out = fn(t.objectStore(STORE));
    t.oncomplete = () => resolve(out && out.result !== undefined ? out.result : out);
    t.onerror = () => reject(t.error);
  });
}

export const put = (path, blob) => tx('readwrite', (s) => s.put(blob, path));
export const remove = (path) => tx('readwrite', (s) => s.delete(path));
export const clear = () => tx('readwrite', (s) => s.clear());
export async function all() {
  const d = await db();
  return new Promise((resolve, reject) => {
    const out = {};
    const req = d.transaction(STORE).objectStore(STORE).openCursor();
    req.onsuccess = () => {
      const c = req.result;
      if (!c) return resolve(out);
      out[c.key] = c.value;
      c.continue();
    };
    req.onerror = () => reject(req.error);
  });
}

export function slug(s) {
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/\.[a-z0-9]+$/, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'photo';
}

// Une photo du téléphone (souvent 5 à 15 Mo) → WebP (JPEG si le navigateur ne
// sait pas écrire le WebP), 2000 px au plus sur le grand côté.
// folder / name : rangement choisi (une nouvelle série range ses photos dans
// son propre dossier) ; sinon Projets-web/Fotos/site/<nom du fichier>-<horodatage>.
export async function prepare(file, folder = FOLDER, name = null) {
  let bmp;
  try { bmp = await createImageBitmap(file, { imageOrientation: 'from-image' }); }
  catch (e) { bmp = await createImageBitmap(file); }
  const k = Math.min(1, MAX / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * k), h = Math.round(bmp.height * k);
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  c.getContext('2d').drawImage(bmp, 0, 0, w, h);
  let blob = await new Promise((r) => c.toBlob(r, 'image/webp', 0.9));
  let ext = 'webp';
  if (!blob || blob.type !== 'image/webp') { blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.9)); ext = 'jpg'; }
  const path = `${folder}/${name || slug(file.name) + '-' + Date.now().toString(36)}.${ext}`;
  return { path, blob };
}

export function toBase64(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1]);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}
