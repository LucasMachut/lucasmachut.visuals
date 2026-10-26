/* ============================================================
   LE DÉPÔT GITHUB ET LES BROUILLONS

   Lire : l'arbre du dépôt (la liste des fichiers) puis chaque
   fichier à la demande.
   Écrire : rien ne part tant qu'on n'a pas cliqué « Publier ». Les
   modifications attendent dans le navigateur (IndexedDB), photos
   comprises : un onglet fermé sur le téléphone ne perd rien.
   Publier : un seul commit sur master avec tous les fichiers ;
   le cron d'Hostinger le met en ligne ensuite.
   ============================================================ */

export const REPO = 'LucasMachut/lucasmachut.visuals';
export const BRANCH = 'master';
const API = 'https://api.github.com/repos/' + REPO;
const TOKEN_KEY = 'lm-admin.token';

/* ─── la clé GitHub ─── */

export function token() {
  try { return localStorage.getItem(TOKEN_KEY) || ''; } catch (e) { return ''; }
}
export function setToken(t) {
  try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); } catch (e) { /* rien */ }
}

// La clé déjà collée dans l'ancien admin (Sveltia) sur ce même site.
export function oldToken() {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!/sveltia|decap|netlify-cms/i.test(k)) continue;
      const v = JSON.parse(localStorage.getItem(k) || 'null');
      const t = v && (v.token || (v.user && v.user.token));
      if (typeof t === 'string' && t.length > 20) return t;
    }
  } catch (e) { /* rien */ }
  return '';
}

/* Mode essai : en local (localhost), on lit les fichiers sur le
   serveur local et « Publier » ne fait que montrer ce qui partirait. */
export const essai = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname) &&
  new URLSearchParams(location.search).has('essai');

async function gh(path, opts = {}) {
  const headers = Object.assign({
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  }, opts.headers || {});
  const t = token();
  if (t) headers.Authorization = 'Bearer ' + t;
  const r = await fetch(API + path, Object.assign({}, opts, { headers, cache: 'no-store' }));
  if (!r.ok) {
    let msg = r.status + '';
    try { msg = (await r.json()).message || msg; } catch (e) { /* rien */ }
    const err = new Error(msg);
    err.status = r.status;
    throw err;
  }
  return opts.raw ? r : r.json();
}

export async function checkToken(t) {
  const r = await fetch(API, { headers: { Authorization: 'Bearer ' + t, Accept: 'application/vnd.github+json' } });
  if (!r.ok) return false;
  const j = await r.json();
  return !!(j.permissions && j.permissions.push);
}

/* ─── l'arbre du dépôt ─── */

let tree = null;   // chemin -> sha
let headSha = null;

export async function loadTree() {
  const ref = await gh('/git/ref/heads/' + BRANCH);
  headSha = ref.object.sha;
  const commit = await gh('/git/commits/' + headSha);
  const t = await gh('/git/trees/' + commit.tree.sha + '?recursive=1');
  tree = new Map();
  for (const e of t.tree) if (e.type === 'blob') tree.set(e.path, e.sha);
  return tree;
}

export function files() { return tree ? [...tree.keys()] : []; }
export function exists(path) { return (tree && tree.has(path)) || drafts.has(path); }
export function shaOf(path) { return tree ? tree.get(path) || null : null; }

/* ─── lire un fichier ─── */

const cache = new Map(); // sha -> texte

export async function readText(path) {
  const d = drafts.get(path);
  if (d && d.text !== undefined) return d.text;
  return readPublished(path);
}

export async function readPublished(path) {
  if (essai) {
    const r = await fetch('/' + path.split('/').map(encodeURIComponent).join('/'), { cache: 'no-store' });
    if (!r.ok) throw new Error('introuvable : ' + path);
    return (await r.text()).replace(/\r\n/g, '\n');
  }
  const sha = shaOf(path);
  if (!sha) throw new Error('introuvable : ' + path);
  if (cache.has(sha)) return cache.get(sha);
  const r = await gh('/git/blobs/' + sha, { headers: { Accept: 'application/vnd.github.raw' }, raw: true });
  const text = await r.text();
  cache.set(sha, text);
  return text;
}

// Une version précise d'un fichier (par son sha).
export async function readBlob(sha) {
  if (cache.has(sha)) return cache.get(sha);
  const r = await gh('/git/blobs/' + sha, { headers: { Accept: 'application/vnd.github.raw' }, raw: true });
  const text = await r.text();
  cache.set(sha, text);
  return text;
}

// Après une fusion : le brouillon repart de la version actuelle.
export function rebase(path, text) {
  const d = drafts.get(path);
  if (!d) return;
  d.text = text;
  d.base = shaOf(path);
  idbDo('readwrite', s => s.put({ text: d.text, base: d.base, at: d.at }, path));
  emit();
}

/* ─── les brouillons ─── */

// chemin -> { text } ou { blob, url } ; base = sha du fichier quand on l'a ouvert
const drafts = new Map();
const listeners = new Set();
export function onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }
function emit() { listeners.forEach(fn => fn()); }

function idb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('lm-admin', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('drafts');
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function idbDo(mode, fn) {
  try {
    const db = await idb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction('drafts', mode);
      const out = fn(tx.objectStore('drafts'));
      tx.oncomplete = () => resolve(out && out.result);
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) { return null; }
}

export async function restoreDrafts() {
  const all = await new Promise(async resolve => {
    try {
      const db = await idb();
      const out = [];
      const req = db.transaction('drafts').objectStore('drafts').openCursor();
      req.onsuccess = () => {
        const c = req.result;
        if (c) { out.push([c.key, c.value]); c.continue(); } else resolve(out);
      };
      req.onerror = () => resolve([]);
    } catch (e) { resolve([]); }
  });
  for (const [path, d] of all) {
    if (d.blob) d.url = URL.createObjectURL(d.blob);
    drafts.set(path, d);
  }
  emit();
  return drafts.size;
}

export function draft(path) { return drafts.get(path) || null; }
export function draftList() { return [...drafts.entries()].map(([path, d]) => Object.assign({ path }, d)); }

export async function putText(path, text) {
  const prev = drafts.get(path);
  let original = null;
  try { original = await readPublished(path); } catch (e) { /* nouveau fichier */ }
  if (original !== null && original === text) {
    // revenu à l'identique : plus rien à publier pour ce fichier
    if (prev) { drafts.delete(path); idbDo('readwrite', s => s.delete(path)); emit(); }
    return;
  }
  const d = { text, base: prev ? prev.base : shaOf(path), at: Date.now() };
  drafts.set(path, d);
  idbDo('readwrite', s => s.put(d, path));
  emit();
}

export function putBlob(path, blob) {
  const d = { blob, url: URL.createObjectURL(blob), base: null, at: Date.now() };
  drafts.set(path, d);
  idbDo('readwrite', s => s.put({ blob, base: null, at: d.at }, path));
  emit();
  return d.url;
}

// Photos publiées dans cette session : le site ne les sert qu'après la
// mise en ligne (2 à 4 min), l'aperçu garde donc la copie locale.
const recent = new Map();

export function drop(path, keepPreview) {
  const d = drafts.get(path);
  if (d && d.url) keepPreview ? recent.set(path, d.url) : URL.revokeObjectURL(d.url);
  drafts.delete(path);
  idbDo('readwrite', s => s.delete(path));
  emit();
}

// Une photo pas encore publiée : son adresse temporaire pour l'aperçu.
export function previewUrl(path) {
  const p = String(path || '').replace(/^\/+/, '').split('?')[0];
  let clean = p;
  try { clean = decodeURIComponent(p); } catch (e) { /* tel quel */ }
  const d = drafts.get(clean);
  return d && d.url ? d.url : recent.get(clean) || null;
}

/* ─── publier ─── */

function b64(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1]);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

// Les fichiers qui ont changé sur GitHub depuis qu'on les a ouverts.
export async function conflicts() {
  if (essai) return [];
  await loadTree();
  return draftList().filter(d => d.text !== undefined && d.base && shaOf(d.path) !== d.base).map(d => d.path);
}

export async function publish(message, onStep = () => {}) {
  const list = draftList();
  if (!list.length) return null;
  if (essai) {
    onStep('Mode essai : rien n’est envoyé.');
    console.table(list.map(d => ({ fichier: d.path, taille: d.text !== undefined ? d.text.length : d.blob.size })));
    return { essai: true, files: list.map(d => d.path) };
  }

  for (let tentative = 0; tentative < 3; tentative++) {
    onStep('Préparation…');
    await loadTree();
    const changed = list.filter(d => d.text !== undefined && d.base && shaOf(d.path) !== d.base);
    if (changed.length) {
      const err = new Error('modifié ailleurs');
      err.conflicts = changed.map(d => d.path);
      throw err;
    }
    const entries = [];
    let n = 0;
    for (const d of list) {
      onStep('Envoi ' + (++n) + ' / ' + list.length + '…');
      const body = d.text !== undefined
        ? { content: d.text, encoding: 'utf-8' }
        : { content: await b64(d.blob), encoding: 'base64' };
      const blob = await gh('/git/blobs', { method: 'POST', body: JSON.stringify(body) });
      entries.push({ path: d.path, mode: '100644', type: 'blob', sha: blob.sha });
    }
    onStep('Publication…');
    const base = await gh('/git/commits/' + headSha);
    const t = await gh('/git/trees', { method: 'POST', body: JSON.stringify({ base_tree: base.tree.sha, tree: entries }) });
    const c = await gh('/git/commits', { method: 'POST',
      body: JSON.stringify({ message, tree: t.sha, parents: [headSha] }) });
    try {
      await gh('/git/refs/heads/' + BRANCH, { method: 'PATCH', body: JSON.stringify({ sha: c.sha, force: false }) });
    } catch (e) {
      // quelqu'un (le robot GitHub) a publié entre-temps : on recommence
      if (e.status === 422) continue;
      throw e;
    }
    for (const e of entries) tree && tree.set(e.path, e.sha);
    headSha = c.sha;
    for (const d of list) {
      if (d.text !== undefined) cache.set(tree.get(d.path), d.text);
      drop(d.path, true);
    }
    return { sha: c.sha, files: list.map(d => d.path) };
  }
  throw new Error('GitHub refuse la publication, réessaie dans une minute.');
}
