// Prépare les vidéos envoyées depuis l'admin, avant la construction du site.
//
//   node tools/preparer_videos.mjs
//
// L'admin dépose le fichier tel quel (videos/source/…) et l'inscrit dans le
// film : film_dia.video_source. Ici, pour chaque film qui en a une :
//   - version ordinateur qui défile sans à-coups : 1600 px, une image complète
//     tous les 5 photogrammes, sans son (videos/scroll/<nom>.mp4) ;
//   - suite d'images pour le téléphone : 12 par seconde, 720 px carré
//     (videos/scroll/<nom>-frames/f-001.jpg…), recadrée au centre qu'elle soit
//     horizontale ou verticale ;
//   - photo d'attente tirée de la première image (videos/scroll/<nom>-poster.jpg) ;
// puis le film pointe vers ces fichiers et le fichier d'origine est retiré du
// dépôt (trop lourd pour être servi). Sans video_source, rien ne se passe.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { basename, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RACINE = fileURLToPath(new URL('..', import.meta.url));
const DATA = join(RACINE, 'data', 'pessoas', 'accueil.json');
const FILMS = ['film_dia', 'film_noite'];

const ffmpeg = (args) => execFileSync('ffmpeg', ['-v', 'error', '-y', ...args], { stdio: 'inherit' });
const duree = (file) => Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]).toString().trim());

const data = JSON.parse(readFileSync(DATA, 'utf8'));
let change = false;

for (const key of FILMS) {
  const film = data[key];
  if (!film || !film.video_source) continue;
  const source = join(RACINE, film.video_source.replace(/^\//, ''));
  if (!existsSync(source)) { console.error(`${key} : ${film.video_source} introuvable`); process.exit(1); }
  const nom = basename(source, extname(source)).replace(/[^a-z0-9-]+/gi, '-').toLowerCase();
  const dossier = join(RACINE, 'videos', 'scroll');
  const images = join(dossier, `${nom}-frames`);
  mkdirSync(images, { recursive: true });
  for (const f of readdirSync(images)) rmSync(join(images, f));

  console.log(`${key} : préparation de ${film.video_source}`);
  ffmpeg(['-i', source, '-an', '-vf', "scale='min(1600,iw)':-2", '-c:v', 'libx264', '-preset', 'slow', '-crf', '23',
    '-g', '5', '-keyint_min', '5', '-sc_threshold', '0', '-bf', '0', '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
    join(dossier, `${nom}.mp4`)]);
  ffmpeg(['-i', source, '-vf', "fps=12,scale='if(gt(a,1),-2,720)':'if(gt(a,1),720,-2)',crop=720:720", '-q:v', '6', join(images, 'f-%03d.jpg')]);
  ffmpeg(['-i', source, '-frames:v', '1', '-vf', "scale='min(1600,iw)':-2", '-q:v', '3', join(dossier, `${nom}-poster.jpg`)]);

  const count = readdirSync(images).filter((f) => f.endsWith('.jpg')).length;
  film.video = `/videos/scroll/${nom}.mp4`;
  film.poster = `/videos/scroll/${nom}-poster.jpg`;
  film.frames = { path: `/videos/scroll/${nom}-frames/f-{n}.jpg`, count, duration: Math.round(duree(join(dossier, `${nom}.mp4`)) * 10) / 10 };
  delete film.video_source;
  rmSync(source);
  change = true;
  console.log(`${key} : prête (${count} images téléphone, ${film.frames.duration} s)`);
}

if (change) writeFileSync(DATA, JSON.stringify(data, null, 2) + '\n');
else console.log('Aucune nouvelle vidéo.');
