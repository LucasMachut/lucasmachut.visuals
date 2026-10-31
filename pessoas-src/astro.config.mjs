// Site pessoas. Les pages sortent en HTML pré-rendu ; ce qui bouge est en React.
// Photos et vidéos restent à la racine du dépôt (/photos, /videos) : en local,
// le serveur de dev les sert depuis là, en ligne elles y sont déjà.
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import { existsSync, statSync } from 'node:fs';
import { sendFile } from './send-file.mjs';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const SITE = fileURLToPath(new URL('..', import.meta.url));
const TYPES = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.mp4': 'video/mp4' };

const siteMedia = {
  name: 'site-media',
  configureServer(server) { server.middlewares.use(serveMedia); },
};

function serveMedia(req, res, next) {
  const url = decodeURIComponent((req.url || '').split('?')[0]);
  if (!/^\/(photos|videos|Projets-web)\//.test(url)) return next();
  const file = normalize(join(SITE, url));
  if (!file.startsWith(normalize(SITE)) || !existsSync(file) || !statSync(file).isFile()) return next();
  sendFile(req, res, file, TYPES[extname(file).toLowerCase()] || 'application/octet-stream');
}

export default defineConfig({
  integrations: [react()],
  build: { format: 'file' },
  vite: { plugins: [siteMedia] },
});
