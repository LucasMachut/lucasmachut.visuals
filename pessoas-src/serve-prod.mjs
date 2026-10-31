// Aperçu local de la version construite, comme en ligne : les pages de dist/
// d'abord, puis le reste du dépôt (photos, vidéos, lugares) à la racine du site.
import { createServer } from 'node:http';
import { existsSync, statSync } from 'node:fs';
import { sendFile } from './send-file.mjs';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIST = fileURLToPath(new URL('./dist/', import.meta.url));
const SITE = fileURLToPath(new URL('../', import.meta.url));
const PORT = Number(process.env.PORT || 3111);
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4', '.woff2': 'font/woff2', '.ico': 'image/x-icon',
};

function find(root, url) {
  const candidates = [url, url + '.html', join(url, 'index.html')];
  for (const c of candidates) {
    const f = normalize(join(root, c));
    if (f.startsWith(normalize(root)) && existsSync(f) && statSync(f).isFile()) return f;
  }
  return null;
}

createServer((req, res) => {
  const url = decodeURIComponent((req.url || '/').split('?')[0]);
  const file = find(DIST, url) || find(SITE, url);
  if (!file) { res.writeHead(404); res.end('404'); return; }
  sendFile(req, res, file, TYPES[extname(file).toLowerCase()] || 'application/octet-stream');
}).listen(PORT, () => console.log(`pessoas (build) sur http://localhost:${PORT}`));
