// Le dépôt du site sur GitHub : lire un fichier, publier plusieurs fichiers en
// un seul commit sur master. La clé est la même que celle de l'ancien admin
// (même site, même clé dans le navigateur).

export const REPO = 'LucasMachut/lucasmachut.visuals';
export const BRANCH = 'master';
const API = 'https://api.github.com/repos/' + REPO;
const TOKEN_KEY = 'lm-admin.token';

export function token() {
  try { return localStorage.getItem(TOKEN_KEY) || ''; } catch (e) { return ''; }
}
export function setToken(t) {
  try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); } catch (e) { /* rien */ }
}

async function gh(path, opts = {}) {
  const headers = Object.assign({
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    Authorization: 'Bearer ' + token(),
  }, opts.headers || {});
  const r = await fetch(API + path, Object.assign({}, opts, { headers, cache: 'no-store' }));
  if (!r.ok) {
    let msg = String(r.status);
    try { msg = (await r.json()).message || msg; } catch (e) { /* rien */ }
    const err = new Error(msg);
    err.status = r.status;
    throw err;
  }
  return r;
}

// La clé ouvre-t-elle le dépôt en écriture ?
export async function checkToken() {
  const r = await gh('');
  const repo = await r.json();
  return !!(repo.permissions && repo.permissions.push);
}

// Le fichier tel qu'il est sur master en ce moment (pas une copie en cache)
export async function readText(path) {
  const r = await gh(`/contents/${path}?ref=${BRANCH}`, { headers: { Accept: 'application/vnd.github.raw+json' } });
  return r.text();
}

// files = [{ path, content }] ; un seul commit, au-dessus du dernier état de master
export async function publish(files, message) {
  const ref = await (await gh(`/git/ref/heads/${BRANCH}`)).json();
  const parent = ref.object.sha;
  const commit = await (await gh(`/git/commits/${parent}`)).json();
  const tree = [];
  for (const f of files) {
    const blob = await (await gh('/git/blobs', { method: 'POST', body: JSON.stringify({ content: f.content, encoding: 'utf-8' }) })).json();
    tree.push({ path: f.path, mode: '100644', type: 'blob', sha: blob.sha });
  }
  const newTree = await (await gh('/git/trees', { method: 'POST', body: JSON.stringify({ base_tree: commit.tree.sha, tree }) })).json();
  const newCommit = await (await gh('/git/commits', { method: 'POST', body: JSON.stringify({ message, tree: newTree.sha, parents: [parent] }) })).json();
  await gh(`/git/refs/heads/${BRANCH}`, { method: 'PATCH', body: JSON.stringify({ sha: newCommit.sha }) });
  return newCommit.sha;
}
