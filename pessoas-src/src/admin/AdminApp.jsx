// Admin du site pessoas (/admin). La page s'affiche avec les vrais composants
// du site ; toucher un texte ou une photo ouvre le panneau, la page suit.
// Les changements (photos comprises) attendent dans le navigateur jusqu'à
// « Publier » : un seul commit sur master, que l'Action « Site pessoas »
// reconstruit et met en ligne.
import { useEffect, useMemo, useRef, useState } from 'react';
import * as gh from './github.js';
import * as photos from './photos.js';
import { get, set, changed, label, GROUPS } from './fields.js';
import Editor from './Editor.jsx';
import Sortable from './Sortable.jsx';
import HomeStage from '../components/HomeStage.jsx';
import Manifesto from '../components/Manifesto.jsx';
import Film from '../components/Film.jsx';
import Oferta from '../components/Oferta.jsx';
import Nightfall from '../components/Nightfall.jsx';
import Fim from '../components/Fim.jsx';

const PAGES = [
  { id: 'accueil', name: 'Accueil', path: 'data/pessoas/accueil.json' },
  { id: 'trabalhos', name: 'Trabalhos', soon: true },
  { id: 'series', name: 'Séries', soon: true },
  { id: 'contato', name: 'Contato', soon: true },
];
const SECTION_NAMES = { manifesto: 'Manifeste', film_dia: 'Film du jour', oferta: 'Offres', noite: 'Tombée de la nuit', film_noite: 'Film de nuit' };
const DRAFT_KEY = (path) => 'lm-admin-pessoas.draft:' + path;

// En local avec ?essai : lit les fichiers du dossier, « Publier » montre seulement ce qui partirait
const essai = typeof location !== 'undefined' && /^(localhost|127\.0\.0\.1)$/.test(location.hostname)
  && new URLSearchParams(location.search).has('essai');

function loadDraft(path) {
  try { return JSON.parse(localStorage.getItem(DRAFT_KEY(path)) || 'null'); } catch (e) { return null; }
}
function saveDraft(path, data) {
  try { data ? localStorage.setItem(DRAFT_KEY(path), JSON.stringify(data)) : localStorage.removeItem(DRAFT_KEY(path)); } catch (e) { /* rien */ }
}

// Les chaînes du JSON qui désignent une photo pas encore publiée → leur image locale
function withLocalPhotos(o, urls) {
  if (typeof o === 'string') return urls[o] || o;
  if (Array.isArray(o)) return o.map((v) => withLocalPhotos(v, urls));
  if (o && typeof o === 'object') return Object.fromEntries(Object.entries(o).map(([k, v]) => [k, withLocalPhotos(v, urls)]));
  return o;
}
const usesPath = (o, p) => JSON.stringify(o).includes(JSON.stringify(p));

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
  if (id === 'film_dia') return <Film id="film1" variant="dia" data={data.film_dia} />;
  if (id === 'oferta') return <Oferta data={data.oferta} />;
  if (id === 'noite') return <Nightfall key={data.noite.day + data.noite.night} data={data.noite} />;
  if (id === 'film_noite') return <Film id="film2" variant="noite" data={data.film_noite} />;
  return null;
}

function Accueil({ data }) {
  const visible = data.sections.filter((s) => !s.hidden);
  return (
    <>
      <HomeStage key={data.hero.photo} hero={data.hero} edit />
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
  const page = PAGES[0];
  const [base, setBase] = useState(null);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null);   // chemin du champ, ou 'sections'
  const [menu, setMenu] = useState(false);
  const [confirm, setConfirm] = useState(null);   // 'publish' | 'reset'
  const [status, setStatus] = useState('');
  const [urls, setUrls] = useState({});           // '/Projets-web/…' → image locale (photos pas encore publiées)
  const blobs = useRef({});
  const saveTimer = useRef(0);

  useEffect(() => {
    if (!logged) return;
    const read = essai ? fetch('/' + page.path, { cache: 'no-store' }).then((r) => r.text()) : gh.readText(page.path);
    Promise.all([read, photos.all().catch(() => ({}))]).then(([text, stored]) => {
      const online = JSON.parse(text);
      const u = {};
      for (const [p, blob] of Object.entries(stored)) { blobs.current['/' + p] = blob; u['/' + p] = URL.createObjectURL(blob); }
      setUrls(u);
      setBase(online);
      const draft = loadDraft(page.path);
      setData(draft && draft.sections ? draft : online);   // brouillon d'avant les sections : ignoré
    }).catch((e) => {
      if (e.status === 401) { gh.setToken(''); setLogged(false); return; }
      setError('Impossible de lire la page (' + e.message + ').');
    });
  }, [logged]);

  const diff = useMemo(() => (base && data ? changed(base, data) : []), [base, data]);
  const shown = useMemo(() => (data ? withLocalPhotos(data, urls) : null), [data, urls]);
  // Une structure qui change (ordre, nombre d'éléments) remonte la page : les
  // animations au défilement se recalculent sur la nouvelle mise en page.
  const shape = data ? JSON.stringify([data.sections, ...Object.keys(GROUPS).map((g) => (get(data, g) || []).length)]) : '';

  const commit = (next) => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveDraft(page.path, next), 300);
    return next;
  };
  const update = (path, value) => setData((d) => commit(set(d, path, value)));

  const openItem = (group, i) => setEditing(group === 'manifesto.lines' ? `${group}.${i}` : `${group}.${i}.title`);
  const onList = (group, list, now) => {
    setData((d) => commit(set(d, group, list)));
    if (now == null) setEditing(null);
    else setEditing((cur) => {
      const rest = cur && cur.startsWith(group + '.') ? cur.slice(group.length + 1).replace(/^\d+/, '') : '';
      return `${group}.${now}${rest || (group === 'manifesto.lines' ? '' : '.title')}`;
    });
  };
  const onPhoto = async (path, file) => {
    const p = await photos.prepare(file);
    await photos.put(p.path, p.blob).catch(() => {});
    const key = '/' + p.path;
    blobs.current[key] = p.blob;
    setUrls((u) => ({ ...u, [key]: URL.createObjectURL(p.blob) }));
    update(path, key);
  };
  const src = (v) => urls[v] || v;

  // Toucher un texte ou une photo de la page : ouvrir son panneau ; aucun lien ne quitte l'admin
  const onPreviewClick = (e) => {
    const el = e.target.closest('[data-edit]');
    if (el || e.target.closest('a')) e.preventDefault();
    if (el) { e.stopPropagation(); setEditing(el.getAttribute('data-edit')); }
  };

  const publish = async () => {
    setStatus('publishing');
    const files = [{ path: page.path, content: JSON.stringify(data, null, 2) + '\n' }];
    for (const [key, blob] of Object.entries(blobs.current)) {
      if (usesPath(data, key)) files.push({ path: key.slice(1), base64: await photos.toBase64(blob) });
    }
    const message = 'Admin : ' + diff.map(label).join(' ; ');
    try {
      if (essai) console.info('[essai] partirait :', files.map((f) => f.path), message);
      else await gh.publish(files, message);
      setBase(data);
      saveDraft(page.path, null);
      blobs.current = {};
      await photos.clear().catch(() => {});
      setStatus('done');
    } catch (e) {
      setStatus('error:' + e.message);
    }
    setConfirm(null);
  };

  const reset = async () => {
    setData(base); saveDraft(page.path, null); setEditing(null); setConfirm(null);
    blobs.current = {};
    await photos.clear().catch(() => {});
  };

  if (!logged) return <Login onDone={() => setLogged(true)} />;
  if (error) return <main className="adm-login"><p className="adm-err">{error}</p></main>;
  if (!data) return <main className="adm-login"><p>Chargement de la page…</p></main>;

  return (
    <div className={`adm${editing ? ' adm--editing' : ''}`}>
      <style>{editing && editing !== 'sections' ? `[data-edit="${editing}"]{outline:2px solid var(--terracotta)!important;outline-offset:6px}` : ''}</style>
      <header className="adm-bar">
        <button type="button" className="adm-burger" aria-label="Menu" aria-expanded={menu} onClick={() => setMenu(!menu)}>☰</button>
        <strong className="adm-title">{page.name}</strong>
        <button type="button" className="adm-btn adm-btn--ghost adm-btn--bar" onClick={() => setEditing('sections')}>Sections</button>
        <div className="adm-actions">
          {diff.length > 0 && <span className="adm-count">{diff.length} changement{diff.length > 1 ? 's' : ''}</span>}
          {diff.length > 0 && <button type="button" className="adm-btn adm-btn--ghost adm-btn--bar" onClick={() => setConfirm('reset')}>Annuler</button>}
          <button type="button" className="adm-btn" disabled={!diff.length} onClick={() => { setStatus(''); setConfirm('publish'); }}>Publier</button>
        </div>
        {menu && (
          <nav className="adm-menu" onClick={() => setMenu(false)}>
            {PAGES.map((p) => (
              <span key={p.id} className={p.soon ? 'is-soon' : p.id === page.id ? 'is-current' : ''}>
                {p.name}{p.soon && <small> bientôt</small>}
              </span>
            ))}
            <hr />
            <a href="/admin/lugares/">Lugares (ancien admin) →</a>
            {!essai && <button type="button" onClick={() => { gh.setToken(''); setLogged(false); }}>Se déconnecter</button>}
          </nav>
        )}
      </header>

      {status === 'done' && <div className="adm-toast">Publié. En ligne dans 3 à 5 minutes.{essai && ' (essai : rien n\'est parti)'}</div>}
      {status.startsWith('error:') && <div className="adm-toast adm-toast--err">La publication a échoué : {status.slice(6)}. Tes changements sont gardés.</div>}

      <div className="adm-preview" onClickCapture={onPreviewClick}>
        <Accueil key={shape} data={shown} />
      </div>

      {editing === 'sections' && (
        <SectionsPanel data={data} onSections={(s) => update('sections', s)} onClose={() => setEditing(null)} />
      )}
      {editing && editing !== 'sections' && get(data, editing) !== undefined && (
        <Editor path={editing} data={data} src={src} onChange={update} onList={onList} onOpen={openItem}
          onPhoto={onPhoto} onClose={() => setEditing(null)} />
      )}

      {confirm && (
        <div className="adm-modal" onClick={(e) => { if (e.target === e.currentTarget) setConfirm(null); }}>
          <div className="adm-modal-box">
            {confirm === 'publish' ? (
              <>
                <h2 className="t-title">Mettre en ligne</h2>
                <ul>{diff.map((p) => <li key={p}>{label(p)}</li>)}</ul>
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
                <p>La page revient à la version en ligne. {diff.length} changement{diff.length > 1 ? 's' : ''} perdu{diff.length > 1 ? 's' : ''}.</p>
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
