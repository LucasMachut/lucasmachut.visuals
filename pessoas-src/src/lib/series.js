// Séries pessoas : un fichier par série dans data/pessoas/series/, l'ordre et
// le choix de ce qui est publié dans data/pessoas/trabalhos.json (clé series).
// Ajouter une série = poser son JSON + ajouter son slug à la liste.
import trabalhos from '../../../data/pessoas/trabalhos.json';
import { openSync, readSync, closeSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const files = import.meta.glob('../../../data/pessoas/series/*.json', { eager: true, import: 'default' });
const bySlug = Object.fromEntries(Object.values(files).map((s) => [s.slug, s]));

export { trabalhos };

export function publishedSeries() {
  return trabalhos.series.map((slug) => bySlug[slug]).filter(Boolean).map(withSizes);
}

// Largeur et hauteur de chaque photo, lues dans le fichier au build : le HTML
// réserve la place de l'image avant son chargement et la page ne saute plus.
const SITE = fileURLToPath(new URL('../../../', import.meta.url));
function withSizes(s) {
  return { ...s, photos: s.photos.map((p) => ({ ...p, ...jpegSize(p.src) })) };
}
function jpegSize(src) {
  const file = SITE + decodeURIComponent(src).replace(/^\//, '');
  if (!/\.jpe?g$/i.test(file) || !existsSync(file)) return {};
  const fd = openSync(file, 'r');
  try {
    const b = Buffer.alloc(256 * 1024);
    const n = readSync(fd, b, 0, b.length, 0);
    for (let i = 2; i + 9 < n; ) {
      if (b[i] !== 0xFF) return {};
      const m = b[i + 1], len = b.readUInt16BE(i + 2);
      if (m >= 0xC0 && m <= 0xCF && m !== 0xC4 && m !== 0xC8 && m !== 0xCC) {
        return { h: b.readUInt16BE(i + 5), w: b.readUInt16BE(i + 7) };
      }
      i += 2 + len;
    }
    return {};
  } finally { closeSync(fd); }
}

// « Rio de Janeiro, RJ » + 2026 → « Rio de Janeiro · 2026 » (texte vertical Koisei)
export function placeDate(s) {
  return [s.location.split(',')[0].trim(), s.year].filter(Boolean).join(' · ');
}

export function metaLine(s) {
  return [s.location.split(',')[0].trim(), s.type, s.year].filter(Boolean).join(' · ');
}
