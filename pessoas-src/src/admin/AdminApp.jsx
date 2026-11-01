// Admin du site pessoas (/admin). Chaque page (accueil, Trabalhos, une série,
// Contato) s'affiche avec les vrais composants du site ; toucher un texte ou une
// photo ouvre le panneau, la page suit. Tout ce qui change (textes, nouvelles
// séries, photos) attend dans le navigateur jusqu'à « Publier » : un seul commit
// sur master, que l'Action « Site pessoas » reconstruit et met en ligne.
import { Component, useEffect, useMemo, useRef, useState } from 'react';
import * as gh from './github.js';
import * as photos from './photos.js';
import { get, set, changed, label, GROUPS } from './fields.js';
import { merge, setIn } from '../lib/translate.js';
import Editor from './Editor.jsx';
import Sortable from './Sortable.jsx';
import { SeriesPanel, NewSeriePanel, SerieHeroPanel, PhotosPanel, VideosPanel, WhatsappPanel, Shared, SharedPanel } from './Panels.jsx';
import HomeStage from '../components/HomeStage.jsx';
import Manifesto from '../components/Manifesto.jsx';
import Film from '../components/Film.jsx';
import Oferta from '../components/Oferta.jsx';
import Nightfall from '../components/Nightfall.jsx';
import Fim from '../components/Fim.jsx';
import TrabalhosBody from '../components/TrabalhosBody.jsx';
import SerieBody from '../components/SerieBody.jsx';
import ContatoBody from '../components/ContatoBody.jsx';

const A = 'data/pessoas/accueil.json';
const T = 'data/pessoas/trabalhos.json';
const C = 'data/pessoas/contato.json';
const S = (slug) => `data/pessoas/series/${slug}.json`;
const SECTION_NAMES = { manifesto: 'Manifeste', film_dia: 'Film du jour', oferta: 'Offres', noite: 'Tombée de la nuit', film_noite: 'Film de nuit' };
// Adresses déjà prises sur le site : une nouvelle série ne peut pas s'appeler ainsi
const RESERVED = ['index', 'portfolio', 'contato', 'contact', 'admin', 'lugares', 'en', 'fr', 'photos', 'videos', 'data', 'regard', 'fotos', 'hoteis'];
const DRAFT_KEY = (path) => 'lm-admin-pessoas.draft:' + path;

// Langues : en FR et EN, la page montre le portugais avec la traduction par-dessus
// (data/pessoas/fr/…, en/…, seulement des textes) ; toucher un texte l'écrit dans
// la traduction. Photos, ordre, cadrages et sections restent ceux du portugais.
const LANGS = ['pt', 'fr', 'en'];
const LANG_KEY = 'lm-admin-pessoas.lang';
const TR = (lang, path) => path.replace('data/pessoas/', `data/pessoas/${lang}/`);
const trLang = (path) => (path.match(/^data\/pessoas\/(fr|en)\//) || [])[1];
const ptOf = (path) => path.replace(/^data\/pessoas\/(fr|en)\//, 'data/pessoas/');

// En local avec ?essai : lit les fichiers du dossier, « Publier » montre seulement ce qui partirait
const essai = typeof location !== 'undefined' && /^(localhost|127\.0\.0\.1)$/.test(location.hostname)
  && new URLSearchParams(location.search).has('essai');

// Un brouillon garde aussi la version du site sur laquelle il a été commencé
// ({ v: 2, base, data }). Si le site a changé depuis (une autre publication),
// seuls les changements du brouillon sont réappliqués sur la version en ligne :
// le reste suit le site au lieu de l'écraser à la prochaine publication.
function loadDraft(path) {
  try { return JSON.parse(localStorage.getItem(DRAFT_KEY(path)) || 'null'); } catch (e) { return null; }
}
function saveDraft(path, data, base = null) {
  try {
    if (data) localStorage.setItem(DRAFT_KEY(path), JSON.stringify({ v: 2, base, data }));
    else localStorage.removeItem(DRAFT_KEY(path));
  } catch (e) { /* rien */ }
}
// put : comment réécrire un champ (pour une traduction, setIn garde la forme du portugais)
function fromDraft(draft, online, put = set) {
  if (!draft) return { data: online, stale: false };
  if (draft.v !== 2) return { data: draft, stale: !!online && JSON.stringify(draft) !== JSON.stringify(online) };
  if (!online || !draft.base || JSON.stringify(draft.base) === JSON.stringify(online)) return { data: draft.data, stale: false };
  let data = online;
  for (const f of changed(draft.base, draft.data)) data = put(data, f, get(draft.data, f));
  return { data, stale: false };
}
async function readJson(path) {
  if (!essai) return JSON.parse(await gh.readText(path));
  const r = await fetch('/' + path, { cache: 'no-store' });
  if (!r.ok) { const e = new Error(String(r.status)); e.status = r.status; throw e; }
  return r.json();
}

// Les chaînes du JSON qui désignent une photo pas encore publiée → leur image locale
function withLocalPhotos(o, urls) {
  if (typeof o === 'string') return urls[o] || o;
  if (Array.isArray(o)) return o.map((v) => withLocalPhotos(v, urls));
  if (o && typeof o === 'object') return Object.fromEntries(Object.entries(o).map(([k, v]) => [k, withLocalPhotos(v, urls)]));
  return o;
}
const usesPath = (o, p) => JSON.stringify(o).includes(JSON.stringify(p));
const pad = (n) => String(n).padStart(2, '0');

function route() {
  const h = (typeof location !== 'undefined' ? location.hash : '').replace(/^#\/?/, '').split('/');
  if (h[0] === 'serie' && h[1]) return { page: 'serie', slug: h[1] };
  return { page: ['trabalhos', 'contato'].includes(h[0]) ? h[0] : 'accueil' };
}

// Filet de sécurité : si l'aperçu d'une page plante, l'admin reste debout
// (barre, brouillon, Publier) et propose de réafficher, au lieu d'une page vide.
class Boundary extends Component {
  constructor(props) { super(props); this.state = { err: null, n: 0 }; }
  static getDerivedStateFromError(err) { return { err }; }
  componentDidCatch(err) { console.error('[admin] aperçu', err); }
  render() {
    if (!this.state.err) return <div key={this.state.n}>{this.props.children}</div>;
    return (
      <main className="adm-login">
        <div>
          <p>L'aperçu de la page n'a pas pu s'afficher. Tes changements sont gardés.</p>
          <p className="adm-err">{String(this.state.err.message || this.state.err)}</p>
          <button type="button" className="adm-btn" onClick={() => this.setState((s) => ({ err: null, n: s.n + 1 }))}>Réafficher la page</button>
        </div>
      </main>
    );
  }
}

function Login({ onDone }) {
  const [value, setValue] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const go = async (e) => {
    e.preventDefault();
    setBusy(true); setErr('');
    gh.setToken(value.trim());
    try {
      if (await gh.checkToken()) onDone();
      else { gh.setToken(''); setErr('Cette clé ne peut pas modifier le dépôt du site.'); }
    } catch (x) { gh.setToken(''); setErr('Clé refusée par GitHub (' + x.message + ').'); }
    setBusy(false);
  };
  return (
    <main className="adm-login">
      <form onSubmit={go}>
        <p className="eyebrow"><i />Admin du site</p>
        <h1 className="t-title">Lucas Machut</h1>
        <label htmlFor="tok">Colle ta clé GitHub</label>
        <input id="tok" className="adm-input" type="password" value={value} onChange={(e) => setValue(e.target.value)} autoFocus />
        {err && <p className="adm-err">{err}</p>}
        <button className="adm-btn" disabled={!value.trim() || busy}>{busy ? 'Vérification…' : 'Entrer'}</button>
      </form>
    </main>
  );
}

function Section({ id, data }) {
  if (id === 'manifesto') return <section id="journey" className="journey"><Manifesto data={data.manifesto} /></section>;
  if (id === 'film_dia') return <Film key={data.film_dia.video_source || data.film_dia.video} id="film1" variant="dia" data={data.film_dia} />;
  if (id === 'oferta') return <Oferta data={data.oferta} />;
  if (id === 'noite') return <Nightfall key={JSON.stringify([data.noite.day, data.noite.night, data.noite.day_mobile, data.noite.night_mobile, data.noite.day_crop, data.noite.night_crop])} data={data.noite} />;
  if (id === 'film_noite') return <Film id="film2" variant="noite" data={data.film_noite} />;
  return null;
}

function Accueil({ data }) {
  const visible = data.sections.filter((s) => !s.hidden);
  return (
    <>
      <HomeStage key={data.hero.photo + (data.hero.photo_mobile || "")} hero={data.hero} edit />
      {data.sections.map((s) => (
        <div key={s.id} className={`sec${s.hidden ? ' adm-hidden' : ''}`} data-sec={s.id}
          data-covers-hero={visible[0] && visible[0].id === s.id ? '' : undefined}
          data-hidden-label={s.hidden ? `${SECTION_NAMES[s.id]} : masquée, pas publiée` : undefined}>
          <Section id={s.id} data={data} />
        </div>
      ))}
      <Fim data={data.fim} />
    </>
  );
}

function SectionsPanel({ data, onSections, onClose }) {
  const rows = [{ id: 'hero', fixed: true }, ...data.sections, { id: 'fim', fixed: true }];
  const names = { hero: 'Hero', fim: 'Pied de page', ...SECTION_NAMES };
  const move = (from, to) => {
    const next = data.sections.slice();
    const [it] = next.splice(from - 1, 1);
    next.splice(to - 1, 0, it);
    onSections(next);
  };
  const toggle = (id) => onSections(data.sections.map((s) => (s.id === id ? (s.hidden ? { id: s.id } : { ...s, hidden: true }) : s)));
  return (
    <aside className="adm-panel" role="dialog" aria-label="Sections">
      <header className="adm-panel-head">
        <strong>Sections de la page</strong>
        <button type="button" className="adm-btn adm-btn--ghost" onClick={onClose}>Fermer</button>
      </header>
      <div className="adm-panel-body">
        <Sortable items={rows} fixedTop={1} fixedBottom={1} onMove={move} render={(r) => (
          <>
            <span className={`adm-sort-text${r.hidden ? ' is-off' : ''}`}>{names[r.id]}{r.fixed ? ' (toujours là)' : ''}</span>
            {!r.fixed && (
              <button type="button" className="adm-eye" aria-pressed={!r.hidden} onClick={() => toggle(r.id)}
                aria-label={r.hidden ? `Afficher ${names[r.id]}` : `Masquer ${names[r.id]}`}>
                {r.hidden ? 'Masquée' : 'Visible'}
              </button>
            )}
          </>
        )} />
        <p className="adm-help">Tiens la poignée ⠿ et glisse pour changer l'ordre. Une section masquée garde tous ses textes et photos ; elle n'apparaît plus sur le site une fois publié.</p>
      </div>
    </aside>
  );
}

export default function AdminApp() {
  const [logged, setLogged] = useState(essai || !!gh.token());
  const [docs, setDocs] = useState(null);          // chemin → { base, data } (base null = nouveau fichier)
  const [error, setError] = useState('');
  const [where, setWhere] = useState(route());
  const [editing, setEditing] = useState(null);    // { kind, … }
  const [menu, setMenu] = useState(false);
  const [confirm, setConfirm] = useState(null);    // 'publish' | 'reset'
  const [status, setStatus] = useState('');
  const [urls, setUrls] = useState({});            // '/Projets-web/…' → image locale (photos pas encore publiées)
  const blobs = useRef({});
  const timers = useRef({});
  const staleRef = useRef([]);   // brouillons d'ancien format, commencés avant une mise à jour du site
  const [lang, setLangState] = useState(() => { try { return LANGS.includes(localStorage.getItem(LANG_KEY)) ? localStorage.getItem(LANG_KEY) : 'pt'; } catch (e) { return 'pt'; } });
  const setLang = (l) => { setLangState(l); setEditing(null); try { localStorage.setItem(LANG_KEY, l); } catch (e) { /* rien */ } };

  useEffect(() => {
    const on = () => { setWhere(route()); setEditing(null); scrollTo(0, 0); };
    addEventListener('hashchange', on);
    return () => removeEventListener('hashchange', on);
  }, []);

  // Tout charger : accueil, Trabalhos, Contato et chaque série de la liste
  useEffect(() => {
    if (!logged) return;
    (async () => {
      const out = {};
      const load = async (path) => {
        const draft = loadDraft(path);
        const lang = trLang(path);
        // une traduction se fusionne sur la version en ligne avec la forme du portugais
        const put = lang ? (o, f, v) => setIn(o, out[ptOf(path)] && out[ptOf(path)].data, f, v) : set;
        try {
          const base = await readJson(path);
          const { data, stale } = fromDraft(draft, base, put);
          out[path] = { base, data };
          if (stale) staleRef.current.push(path);
        } catch (e) {
          // pas encore de traduction : un fichier vide, créé à la première publication
          if (e.status === 404 && lang) out[path] = { base: {}, data: draft ? (draft.v === 2 ? draft.data : draft) : {} };
          else if (e.status === 404 && draft) out[path] = { base: null, data: draft.v === 2 ? draft.data : draft };
          else throw e;
        }
      };
      await Promise.all([A, T, C].map(load));
      if (!out[A].data.sections) out[A].data = out[A].base;   // brouillon d'avant les sections
      const slugs = new Set([...out[T].base.series, ...out[T].data.series]);
      await Promise.all([...slugs].map((slug) => load(S(slug)).catch(() => {})));
      const pts = [A, T, C, ...[...slugs].map(S)].filter((p) => out[p]);
      await Promise.all(['fr', 'en'].flatMap((l) => pts.map((p) => load(TR(l, p)).catch(() => {}))));
      const stored = await photos.all().catch(() => ({}));
      const u = {};
      for (const [p, blob] of Object.entries(stored)) { blobs.current['/' + p] = blob; u['/' + p] = URL.createObjectURL(blob); }
      setUrls(u);
      setDocs(out);
    })().catch((e) => {
      if (e.status === 401) { gh.setToken(''); setLogged(false); return; }
      setError('Impossible de lire le site (' + e.message + ').');
    });
  }, [logged]);

  const doc = (path) => docs && docs[path] && docs[path].data;
  // next : la nouvelle version, ou une fonction (version actuelle → nouvelle).
  // Toujours calculé sur la dernière version : deux changements à la suite (la
  // photo, puis son cadrage remis au centre) ne s'effacent plus l'un l'autre.
  const setDoc = (path, next) => {
    setDocs((d) => {
      const cur = d[path];
      const data = typeof next === 'function' ? next(cur ? cur.data : null) : next;
      clearTimeout(timers.current[path]);
      timers.current[path] = setTimeout(() => saveDraft(path, data, cur ? cur.base : null), 300);
      return { ...d, [path]: { base: cur ? cur.base : trLang(path) ? {} : null, data } };
    });
  };
  const setField = (path, field, value) => setDoc(path, (cur) => set(cur, field, value));

  // La page dans la langue choisie, et l'écriture d'un texte dans cette langue
  const view = (path) => (lang === 'pt' ? doc(path) : doc(path) && merge(doc(path), doc(TR(lang, path)) || {}));
  const setText = (path, field, value) => (lang === 'pt' ? setField(path, field, value)
    : setDoc(TR(lang, path), (cur) => setIn(cur || {}, doc(path), field, value)));
  // Un panneau renvoie la page entière : en FR et EN, seuls ses textes changés partent
  const onView = (path) => (next) => {
    if (lang === 'pt') { setDoc(path, next); return; }
    const before = view(path);
    for (const f of changed(before, next)) {
      const v = get(next, f);
      if (typeof v === 'string') setText(path, f, v);
    }
  };

  const seriesTitle = (slug) => { const s = doc(S(slug)); return (s && s.title) || slug; };
  const pageName = (path) => {
    const l = trLang(path), p = ptOf(path);
    const name = p === A ? 'Accueil' : p === T ? 'Trabalhos' : p === C ? 'Contato' : `Série ${seriesTitle(p.replace(/^.*\/|\.json$/g, ''))}`;
    return l ? `${name} (${l.toUpperCase()})` : name;
  };

  // Ce qui partirait : par page, au niveau où on le modifie
  const diff = useMemo(() => {
    if (!docs) return [];
    const out = [];
    for (const [path, { base, data }] of Object.entries(docs)) {
      if (!base) { out.push({ path, text: `Nouvelle série « ${data.title} »` }); continue; }
      for (const f of changed(base, data)) out.push({ path, text: `${pageName(path)} · ${label(f)}` });
    }
    return out;
  }, [docs]);

  if (!logged) return <Login onDone={() => setLogged(true)} />;
  if (error) return <main className="adm-login"><p className="adm-err">{error}</p></main>;
  if (!docs) return <main className="adm-login"><p>Chargement du site…</p></main>;

  const src = (v) => urls[v] || v;
  const show = (o) => withLocalPhotos(o, urls);
  const t = view(T);
  const seriesMap = Object.fromEntries(t.series.map((slug) => [slug, view(S(slug))]).filter(([, s]) => s));
  const pt = lang === 'pt';
  const toPt = () => setLang('pt');
  // PT · FR · EN : dans la barre sur ordinateur, en haut du menu ☰ sur téléphone
  // (la barre du téléphone est déjà pleine), comme sur le site
  const langs = (place) => (
    <span className={`adm-langs ${place}`} role="group" aria-label="Langue de la page">
      {LANGS.map((l) => (
        <button key={l} type="button" className={l === lang ? 'is-on' : ''} aria-pressed={l === lang}
          onClick={() => { setLang(l); setMenu(false); }}>{l.toUpperCase()}</button>
      ))}
    </span>
  );
  const go = (hash) => { setMenu(false); location.hash = hash; };

  const addPhotos = async (files, folder, nameFor, progress) => {
    const keys = [];
    for (let i = 0; i < files.length; i++) {
      if (progress) progress(i + 1, files.length);
      const p = await photos.prepare(files[i], folder, nameFor ? nameFor(i) : null);
      await photos.put(p.path, p.blob).catch(() => {});
      const key = '/' + p.path;
      blobs.current[key] = p.blob;
      keys.push(key);
      const url = URL.createObjectURL(p.blob);
      setUrls((u) => ({ ...u, [key]: url }));
    }
    return keys;
  };

  const createSerie = async (title, files, progress) => {
    let slug = photos.slug(title).replace(/^photo$/, 'serie');
    const taken = new Set([...t.series, ...RESERVED]);
    for (let n = 2; taken.has(slug); n++) slug = `${photos.slug(title)}-${n}`;
    const stamp = Date.now().toString(36);
    const keys = await addPhotos(files, `Projets-web/Fotos/${slug}`, (i) => `${slug}-${pad(i + 1)}-${stamp}`, progress);
    const s = {
      slug, title, eyebrow: '', type: '', location: '', year: String(new Date().getFullYear()),
      cover: keys[0] || '', hero: keys[0] || '', lede: '',
      film: { video: '', poster: '', label: 'Filme em breve' }, videos: [],
      photos: keys.map((k) => ({ src: k, alt: '' })),
    };
    setDocs((d) => ({ ...d, [S(slug)]: { base: null, data: s } }));
    saveDraft(S(slug), s);
    setDoc(T, (cur) => ({ ...cur, series: [...cur.series, slug] }));
    setEditing(null);
    go(`#/serie/${slug}`);
  };

  // Accueil : groupes (lignes, phrases, offres) et photos, comme à l'étape 5b
  const openItem = (group, i) => setEditing({ kind: 'field', path: A, field: group === 'manifesto.lines' ? `${group}.${i}` : `${group}.${i}.title` });
  const onList = (path) => (group, list, now) => {
    setField(path, group, list);
    if (now == null) { setEditing(null); return; }
    setEditing((cur) => {
      const f = cur && cur.field && cur.field.startsWith(group + '.') ? cur.field.slice(group.length + 1).replace(/^\d+/, '') : '';
      return { kind: 'field', path, field: `${group}.${now}${f || (group === 'manifesto.lines' ? '' : '.title')}` };
    });
  };
  // Vidéo choisie : gardée telle quelle (pas de réduction) dans videos/source/,
  // envoyée à la publication ; l'Action la prépare ensuite.
  const onFieldVideo = (path) => async (field, file) => {
    const ext = (file.name.match(/\.([a-z0-9]+)$/i) || [, 'mp4'])[1].toLowerCase();
    const rel = `videos/source/${photos.slug(file.name)}-${Date.now().toString(36)}.${ext}`;
    await photos.put(rel, file).catch(() => {});
    const key = '/' + rel;
    blobs.current[key] = file;
    const url = URL.createObjectURL(file);
    setUrls((u) => ({ ...u, [key]: url }));
    setField(path, field, key);
  };
  const onFieldPhoto = (path) => async (field, file) => {
    const [key] = await addPhotos([file], photos.FOLDER);
    setField(path, field, key);
  };

  // Toucher un texte ou une photo de la page : ouvrir son panneau ; aucun lien ne quitte l'admin
  const onPreviewClick = (e) => {
    const el = e.target.closest('[data-edit]');
    if (el || e.target.closest('a')) e.preventDefault();
    if (!el) return;
    e.stopPropagation();
    const v = el.getAttribute('data-edit');
    if (where.page === 'accueil') setEditing({ kind: 'field', path: A, field: v });
    else if (where.page === 'contato') setEditing({ kind: 'field', path: C, field: v });
    else if (where.page === 'trabalhos') {
      if (v.startsWith('card:')) setEditing({ kind: 'series', slug: v.slice(5) });
      else setEditing({ kind: 'field', path: T, field: v });
    } else if (where.page === 'serie') {
      if (v === 'hero') setEditing({ kind: 'hero' });
      else if (v === 'videos') setEditing({ kind: 'videos' });
      else if (v.startsWith('photos.')) setEditing({ kind: 'photos', index: Number(v.slice(7)) });
      else setEditing({ kind: 'field', path: S(where.slug), field: v });
    }
  };

  const publish = async () => {
    setStatus('publishing');
    const files = [];
    for (const [path, { base, data }] of Object.entries(docs)) {
      if (!base || changed(base, data).length) files.push({ path, content: JSON.stringify(data, null, 2) + '\n' });
    }
    const all = Object.values(docs).map((d) => d.data);
    for (const [key, blob] of Object.entries(blobs.current)) {
      if (all.some((d) => usesPath(d, key))) files.push({ path: key.slice(1), base64: await photos.toBase64(blob) });
    }
    const message = ('Admin : ' + diff.map((d) => d.text).join(' ; ')).slice(0, 500);
    try {
      if (essai) console.info('[essai] partirait :', files.map((f) => f.path), message);
      else await gh.publish(files, message);
      setDocs((d) => Object.fromEntries(Object.entries(d).map(([p, x]) => [p, { base: x.data, data: x.data }])));
      Object.keys(docs).forEach((p) => saveDraft(p, null));
      blobs.current = {};
      staleRef.current = [];
      await photos.clear().catch(() => {});
      setStatus('done');
    } catch (e) {
      setStatus('error:' + e.message);
    }
    setConfirm(null);
  };

  const reset = async () => {
    setDocs((d) => Object.fromEntries(Object.entries(d).filter(([, x]) => x.base).map(([p, x]) => [p, { base: x.base, data: x.base }])));
    Object.keys(docs).forEach((p) => saveDraft(p, null));
    setEditing(null); setConfirm(null); staleRef.current = [];
    blobs.current = {};
    await photos.clear().catch(() => {});
    if (where.page === 'serie' && !docs[S(where.slug)].base) go('#/trabalhos');
  };

  // La page affichée et ses boutons dans la barre
  let page = null, title = '', tools = null;
  const serie = where.page === 'serie' ? view(S(where.slug)) : null;
  if (where.page === 'accueil') {
    const a = view(A);
    const shape = JSON.stringify([a.sections, ...Object.keys(GROUPS).map((g) => (get(a, g) || []).length)]);
    page = <Accueil key={shape} data={show(a)} />;
    title = 'Accueil';
    tools = <button type="button" className="adm-btn adm-btn--ghost adm-btn--bar" onClick={() => setEditing({ kind: 'sections' })}>Sections</button>;
  } else if (where.page === 'trabalhos') {
    const hidden = new Set(t.hidden || []);
    const list = t.series.filter((slug) => seriesMap[slug]).map((slug) => ({ ...show(seriesMap[slug]), slug, hidden: hidden.has(slug) }));
    page = <TrabalhosBody key={t.series.join()} t={show(t)} series={list} />;
    title = 'Trabalhos';
    tools = <button type="button" className="adm-btn adm-btn--ghost adm-btn--bar" onClick={() => setEditing({ kind: 'series' })}>Séries</button>;
  } else if (where.page === 'serie' && serie) {
    const visible = t.series.filter((slug) => !(t.hidden || []).includes(slug) && seriesMap[slug]);
    const nextSlug = visible[(visible.indexOf(where.slug) + 1) % visible.length] || visible[0];
    const next = nextSlug && nextSlug !== where.slug ? { ...show(seriesMap[nextSlug]), slug: nextSlug } : null;
    page = <SerieBody key={where.slug} s={show(serie)} next={next} p={t.serie_page} />;
    title = serie.title + ((t.hidden || []).includes(where.slug) ? ' (masquée)' : '');
    tools = (
      <>
        <button type="button" className="adm-btn adm-btn--ghost adm-btn--bar" onClick={() => setEditing({ kind: 'photos', index: null })}>Photos</button>
        <button type="button" className="adm-btn adm-btn--ghost adm-btn--bar" onClick={() => setEditing({ kind: 'videos' })}>Vidéos</button>
      </>
    );
  } else if (where.page === 'contato') {
    page = <ContatoBody data={show(view(C))} />;
    title = 'Contato';
    tools = <button type="button" className="adm-btn adm-btn--ghost adm-btn--bar" onClick={() => setEditing({ kind: 'whatsapp' })}>WhatsApp</button>;
  } else {
    page = <main className="adm-login"><p>Cette série n'existe pas. <a href="#/trabalhos">Retour à Trabalhos</a></p></main>;
  }

  const e = editing;
  const sPath = where.page === 'serie' ? S(where.slug) : null;
  let panel = null;
  if (e && e.kind === 'field' && get(view(e.path), e.field) !== undefined) {
    panel = <Editor path={e.field} data={view(e.path)} src={src} onChange={(f, v) => setText(e.path, f, v)}
      shared={!pt && <Shared onPt={toPt} />}
      onList={onList(e.path)} onOpen={openItem} onPhoto={onFieldPhoto(e.path)} onClose={() => setEditing(null)}
      onPhotos={(files, progress) => addPhotos(files, photos.FOLDER, null, progress)} onVideo={onFieldVideo(e.path)} />;
  } else if (e && e.kind === 'sections') {
    panel = pt ? <SectionsPanel data={doc(A)} onSections={(s) => setField(A, 'sections', s)} onClose={() => setEditing(null)} />
      : <SharedPanel title="Sections de la page" onPt={toPt} onClose={() => setEditing(null)} />;
  } else if (e && e.kind === 'series') {
    panel = <SeriesPanel t={t} series={seriesMap} current={e.slug} onT={(x) => setDoc(T, x)}
      onOpen={(slug) => go(`#/serie/${slug}`)} onNew={() => setEditing({ kind: 'new' })}
      onTitle={(slug, v) => setText(S(slug), 'title', v)} onClose={() => setEditing(null)}
      shared={!pt && <Shared onPt={toPt} />} />;
  } else if (e && e.kind === 'new') {
    panel = <NewSeriePanel onCreate={createSerie} onClose={() => setEditing(null)} />;
  } else if (e && e.kind === 'hero' && serie) {
    panel = <SerieHeroPanel s={serie} src={src} onS={onView(sPath)} onClose={() => setEditing(null)}
      shared={!pt && <Shared onPt={toPt} />}
      onPhoto={async (f, field = 'hero') => { const [key] = await addPhotos([f], `Projets-web/Fotos/${where.slug}`); setField(sPath, field, key); }} />;
  } else if (e && e.kind === 'photos' && serie && !pt) {
    panel = <SharedPanel title="Photos de la série" onPt={toPt} onClose={() => setEditing(null)} />;
  } else if (e && e.kind === 'photos' && serie) {
    panel = <PhotosPanel s={serie} index={e.index} src={src} onS={(x) => setDoc(sPath, x)}
      onIndex={(i) => setEditing({ kind: 'photos', index: i })} onClose={() => setEditing(null)}
      onAdd={async (files, progress) => {
        const stamp = Date.now().toString(36);
        const keys = await addPhotos(files, `Projets-web/Fotos/${where.slug}`, (i) => `${where.slug}-${stamp}-${pad(i + 1)}`, progress);
        setDocs((d) => {
          const cur = d[sPath].data;
          const data = { ...cur, photos: [...cur.photos, ...keys.map((k) => ({ src: k, alt: '' }))] };
          saveDraft(sPath, data, d[sPath].base);
          return { ...d, [sPath]: { ...d[sPath], data } };
        });
      }} />;
  } else if (e && e.kind === 'videos' && serie) {
    panel = <VideosPanel s={serie} onS={onView(sPath)} onClose={() => setEditing(null)} shared={!pt && <Shared onPt={toPt} />} />;
  } else if (e && e.kind === 'whatsapp') {
    panel = <WhatsappPanel c={view(C)} onC={onView(C)} onClose={() => setEditing(null)} shared={!pt && <Shared onPt={toPt} />} />;
  }
  const outline = e && e.kind === 'field' ? `[data-edit="${e.field}"]`
    : e && e.kind === 'photos' && e.index != null ? `[data-edit="photos.${e.index}"]`
    : e && e.kind === 'series' && e.slug ? `[data-edit="card:${e.slug}"]` : '';

  return (
    <div className={`adm${editing ? ' adm--editing' : ''}`}>
      <style>{outline ? `${outline}{outline:2px solid var(--terracotta)!important;outline-offset:6px}` : ''}</style>
      <header className="adm-bar">
        <button type="button" className="adm-burger" aria-label="Menu" aria-expanded={menu} onClick={() => setMenu(!menu)}>☰</button>
        <strong className="adm-title">{title}</strong>
        {langs('adm-langs--bar')}
        {tools}
        <div className="adm-actions">
          {diff.length > 0 && <span className="adm-count">{diff.length} changement{diff.length > 1 ? 's' : ''}</span>}
          {diff.length > 0 && <button type="button" className="adm-btn adm-btn--ghost adm-btn--bar" onClick={() => setConfirm('reset')}>Annuler</button>}
          <button type="button" className="adm-btn" disabled={!diff.length} onClick={() => { setStatus(''); setConfirm('publish'); }}>Publier</button>
        </div>
        {menu && (
          <nav className="adm-menu">
            {langs('adm-langs--menu')}
            <button type="button" className={where.page === 'accueil' ? 'is-current' : ''} onClick={() => go('#/accueil')}>Accueil</button>
            <button type="button" className={where.page === 'trabalhos' ? 'is-current' : ''} onClick={() => go('#/trabalhos')}>Trabalhos</button>
            <span className="adm-menu-head">Séries</span>
            {t.series.map((slug) => (
              <button key={slug} type="button" className={`adm-menu-sub${where.slug === slug ? ' is-current' : ''}${(t.hidden || []).includes(slug) ? ' is-off' : ''}`}
                onClick={() => go(`#/serie/${slug}`)}>{seriesTitle(slug)}</button>
            ))}
            <button type="button" className="adm-menu-sub" onClick={() => { go('#/trabalhos'); setEditing({ kind: 'new' }); }}>+ Nouvelle série</button>
            <button type="button" className={where.page === 'contato' ? 'is-current' : ''} onClick={() => go('#/contato')}>Contato</button>
            <hr />
            <a href="/admin/lugares/">Lugares (ancien admin) →</a>
            {!essai && <button type="button" onClick={() => { gh.setToken(''); setLogged(false); }}>Se déconnecter</button>}
          </nav>
        )}
      </header>

      {staleRef.current.length > 0 && !status && (
        <div className="adm-toast adm-toast--err">
          Ton brouillon a été commencé avant une mise à jour du site : le publier remettrait l'ancienne version de ce qui a changé entre-temps. Regarde la liste dans « Publier », ou « Annuler » pour repartir de la version en ligne.
          <button type="button" className="adm-btn adm-btn--ghost adm-btn--bar" onClick={() => { staleRef.current = []; setStatus(' '); }}>Compris</button>
        </div>
      )}
      {!pt && !status && !staleRef.current.length && (
        <div className="adm-lang-note">{lang === 'fr' ? 'Version française' : 'Version anglaise'} : touche un texte pour le traduire. Un texte pas encore traduit s'affiche en portugais.</div>
      )}
      {status === 'done' && <div className="adm-toast">Publié. En ligne dans 3 à 5 minutes.{essai && ' (essai : rien n\'est parti)'}</div>}
      {status.startsWith('error:') && <div className="adm-toast adm-toast--err">La publication a échoué : {status.slice(6)}. Tes changements sont gardés.</div>}

      <div className={`adm-preview adm-preview--${where.page}`} onClickCapture={onPreviewClick} onClick={() => setMenu(false)}>
        <Boundary key={where.page + (where.slug || '')}>{page}</Boundary>
      </div>

      {panel}

      {confirm && (
        <div className="adm-modal" onClick={(ev) => { if (ev.target === ev.currentTarget) setConfirm(null); }}>
          <div className="adm-modal-box">
            {confirm === 'publish' ? (
              <>
                <h2 className="t-title">Mettre en ligne</h2>
                <ul>{diff.map((d, i) => <li key={i}>{d.text}</li>)}</ul>
                <div className="adm-modal-actions">
                  <button type="button" className="adm-btn adm-btn--ghost" onClick={() => setConfirm(null)}>Pas encore</button>
                  <button type="button" className="adm-btn" disabled={status === 'publishing'} onClick={publish}>
                    {status === 'publishing' ? 'Envoi…' : 'Mettre en ligne'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2 className="t-title">Annuler les changements ?</h2>
                <p>Tout revient à la version en ligne. {diff.length} changement{diff.length > 1 ? 's' : ''} perdu{diff.length > 1 ? 's' : ''}.</p>
                <div className="adm-modal-actions">
                  <button type="button" className="adm-btn adm-btn--ghost" onClick={() => setConfirm(null)}>Garder</button>
                  <button type="button" className="adm-btn" onClick={reset}>Annuler les changements</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
