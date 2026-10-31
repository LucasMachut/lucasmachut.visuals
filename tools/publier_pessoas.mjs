// Dépose le site pessoas construit par Astro (pessoas-src/dist/) à la racine
// du dépôt, là où Hostinger sert le site.
//
//   node tools/publier_pessoas.mjs --essai   liste ce qui changerait, ne touche à rien
//   node tools/publier_pessoas.mjs           copie pour de vrai
//   --dist <dossier>                         lit un autre build que pessoas-src/dist/
//
// Règles de sécurité : lugares, les anciennes pages EN/FR, l'admin, les
// photos, les vidéos et les sources ne sont jamais touchés. Un fichier
// existant n'est remplacé que s'il s'agit d'une page .html à la racine.
// Rien d'autre que ces pages et _astro/ n'est copié.
// Le dossier _astro/ (scripts et styles du build, noms à empreinte)
// appartient au build : il est vidé puis recopié à chaque fois.
// À la moindre entorse, rien n'est copié et le script sort en erreur.
// Une seule exception à « la racine » : la page admin.html d'Astro devient
// admin/index.html (servie à /admin) ; l'ancien admin reste dans admin/lugares/.
import { cpSync, existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const RACINE = fileURLToPath(new URL('..', import.meta.url));
const i = process.argv.indexOf('--dist');
const DIST = i > 0 ? resolve(process.argv[i + 1]) : join(RACINE, 'pessoas-src', 'dist');
const ESSAI = process.argv.includes('--essai');

const DEPLACES = { 'admin.html': 'admin/index.html' };

const PROTEGES = [
  'lugares/', 'en/', 'fr/', 'admin/', 'photos/', 'videos/', 'data/', 'partials/', 'tools/',
  'css/', 'js/', 'pessoas-src/', 'Projets-web/', 'page regard/', '.github/', '.htaccess',
];

function fichiers(dossier) {
  return readdirSync(dossier, { withFileTypes: true }).flatMap(e => {
    const chemin = join(dossier, e.name);
    return e.isDirectory() ? fichiers(chemin) : [chemin];
  });
}

if (!existsSync(join(DIST, 'index.html'))) {
  console.error(DIST + ' : index.html introuvable, lancer npm run build dans pessoas-src d\'abord.');
  process.exit(1);
}

// Seules les pages .html de la racine et _astro/ partent. Le reste (fichiers
// internes d'Astro, par exemple) est listé et laissé de côté.
const remplaces = [], nouveaux = [], identiques = [], ignores = [], refus = [], pages = [];
for (const f of fichiers(DIST)) {
  const rel = relative(DIST, f).split(sep).join('/');
  if (DEPLACES[rel]) {
    const dest = DEPLACES[rel];
    pages.push(rel);
    if (!existsSync(join(RACINE, dest))) nouveaux.push(dest);
    else (readFileSync(join(RACINE, dest)).equals(readFileSync(f)) ? identiques : remplaces).push(dest);
    continue;
  }
  const cible = join(RACINE, rel);
  if (PROTEGES.some(p => rel === p || rel.startsWith(p))) { refus.push(rel + '  (dossier protégé)'); continue; }
  if (rel.startsWith('_astro/')) { nouveaux.push(rel); continue; }
  if (rel.includes('/') || !rel.endsWith('.html')) { ignores.push(rel); continue; }
  pages.push(rel);
  if (!existsSync(cible)) nouveaux.push(rel);
  else (readFileSync(cible).equals(readFileSync(f)) ? identiques : remplaces).push(rel);
}

// Les pages déposées la fois précédente (liste gardée dans _astro/) : une page
// qui n'est plus dans le build (série masquée dans l'admin) est retirée. Seules
// des pages de cette liste peuvent l'être, jamais une page d'avant pessoas.
// Hostinger copie le dépôt sans supprimer ce qui en sort : la page n'est donc
// pas effacée mais remplacée par un renvoi vers Trabalhos, non indexé.
const RENVOI = '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="robots" content="noindex">'
  + '<meta http-equiv="refresh" content="0; url=/portfolio"><link rel="canonical" href="/portfolio">'
  + '<title>Lucas Machut</title></head><body><a href="/portfolio">Trabalhos</a></body></html>\n';
const MANIFESTE = join(RACINE, '_astro', 'pessoas-pages.json');
const cibles = pages.map((p) => DEPLACES[p] || p);
const avant = existsSync(MANIFESTE) ? JSON.parse(readFileSync(MANIFESTE, 'utf8')) : [];
const retires = avant.filter((p) => !cibles.includes(p) && p.endsWith('.html') && !p.includes('/'));

const anciensAstro = existsSync(join(RACINE, '_astro'))
  ? fichiers(join(RACINE, '_astro')).map(f => relative(RACINE, f).split(sep).join('/'))
  : [];

const liste = (titre, l) => console.log(`\n${titre} (${l.length})` + (l.length ? '\n  ' + l.join('\n  ') : ''));
liste('Pages de la racine remplacées', remplaces);
liste('Fichiers ajoutés', nouveaux);
liste('Pages déjà identiques', identiques);
liste('Anciens fichiers _astro/ retirés', anciensAstro.filter(a => !nouveaux.includes(a)));
liste('Ignorés, ni page de la racine ni _astro/', ignores);
liste('Pages pessoas retirées, remplacées par un renvoi vers Trabalhos', retires);

if (refus.length) {
  liste('REFUSÉ, rien n\'a été copié', refus);
  process.exit(1);
}
if (ESSAI) {
  console.log('\nEssai : aucun fichier touché.');
  process.exit(0);
}

rmSync(join(RACINE, '_astro'), { recursive: true, force: true });
if (existsSync(join(DIST, '_astro'))) cpSync(join(DIST, '_astro'), join(RACINE, '_astro'), { recursive: true });
for (const p of pages) cpSync(join(DIST, p), join(RACINE, DEPLACES[p] || p));
for (const p of retires) writeFileSync(join(RACINE, p), RENVOI);
writeFileSync(MANIFESTE, JSON.stringify(cibles, null, 2) + '\n');
console.log('\nSite pessoas déposé à la racine.');
