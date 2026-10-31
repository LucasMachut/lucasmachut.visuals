// Admin du site pessoas (/admin). La page s'affiche avec les vrais composants
// du site ; toucher un texte ouvre le panneau, la page suit la frappe.
// Les changements attendent dans le navigateur jusqu'à « Publier » : un commit
// sur master, que l'Action « Site pessoas » reconstruit et met en ligne.
import { useEffect, useMemo, useRef, useState } from 'react';
import * as gh from './github.js';
import { get, set, changed, label } from './fields.js';
import Editor from './Editor.jsx';
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

function Accueil({ data }) {
  return (
    <>
      <HomeStage hero={data.hero} edit />
      <section id="journey" className="journey" data-covers-hero>
        <Manifesto data={data.manifesto} />
      </section>
      <Film id="film1" variant="dia" data={data.film_dia} />
      <Oferta data={data.oferta} />
      <Nightfall data={data.noite} />
      <Film id="film2" variant="noite" data={data.film_noite} />
      <Fim data={data.fim} />
    </>
  );
}

export default function AdminApp() {
  const [logged, setLogged] = useState(essai || !!gh.token());
  const page = PAGES[0];
  const [base, setBase] = useState(null);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null);
  const [menu, setMenu] = useState(false);
  const [confirm, setConfirm] = useState(null);   // 'publish' | 'reset'
  const [status, setStatus] = useState('');
  const saveTimer = useRef(0);

  useEffect(() => {
    if (!logged) return;
    const read = essai ? fetch('/' + page.path, { cache: 'no-store' }).then((r) => r.text()) : gh.readText(page.path);
    read.then((text) => {
      const online = JSON.parse(text);
      setBase(online);
      setData(loadDraft(page.path) || online);
    }).catch((e) => {
      if (e.status === 401) { gh.setToken(''); setLogged(false); return; }
      setError('Impossible de lire la page (' + e.message + ').');
    });
  }, [logged]);

  const diff = useMemo(() => (base && data ? changed(base, data) : []), [base, data]);

  const update = (path, value) => {
    setData((d) => {
      const next = set(d, path, value);
      clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => saveDraft(page.path, next), 300);
      return next;
    });
  };

  // Toucher un texte de la page : ouvrir son panneau ; aucun lien ne quitte l'admin
  const onPreviewClick = (e) => {
    const el = e.target.closest('[data-edit]');
    if (el || e.target.closest('a')) e.preventDefault();
    if (el) { e.stopPropagation(); setEditing(el.getAttribute('data-edit')); }
  };

  const publish = async () => {
    setStatus('publishing');
    const content = JSON.stringify(data, null, 2) + '\n';
    const message = 'Admin : ' + diff.map(label).join(' ; ');
    try {
      if (essai) {
        console.info('[essai] partirait :', page.path, message);
      } else {
        await gh.publish([{ path: page.path, content }], message);
      }
      setBase(data);
      saveDraft(page.path, null);
      setStatus('done');
    } catch (e) {
      setStatus('error:' + e.message);
    }
    setConfirm(null);
  };

  const reset = () => { setData(base); saveDraft(page.path, null); setEditing(null); setConfirm(null); };

  if (!logged) return <Login onDone={() => setLogged(true)} />;
  if (error) return <main className="adm-login"><p className="adm-err">{error}</p></main>;
  if (!data) return <main className="adm-login"><p>Chargement de la page…</p></main>;

  return (
    <div className={`adm${editing ? ' adm--editing' : ''}`}>
      <style>{editing ? `[data-edit="${editing}"]{outline:2px solid var(--terracotta)!important;outline-offset:6px}` : ''}</style>
      <header className="adm-bar">
        <button type="button" className="adm-burger" aria-label="Menu" aria-expanded={menu} onClick={() => setMenu(!menu)}>☰</button>
        <strong className="adm-title">{page.name}</strong>
        <div className="adm-actions">
          {diff.length > 0 && <span className="adm-count">{diff.length} changement{diff.length > 1 ? 's' : ''}</span>}
          {diff.length > 0 && <button type="button" className="adm-btn adm-btn--ghost" onClick={() => setConfirm('reset')}>Annuler</button>}
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

      {status === 'done' && <div className="adm-toast">Publié. En ligne dans 3 à 4 minutes.{essai && ' (essai : rien n\'est parti)'}</div>}
      {status.startsWith('error:') && <div className="adm-toast adm-toast--err">La publication a échoué : {status.slice(6)}. Tes changements sont gardés.</div>}

      <div className="adm-preview" onClickCapture={onPreviewClick}>
        <Accueil data={data} />
      </div>

      {editing && (
        <Editor path={editing} value={get(data, editing)} onChange={(v) => update(editing, v)} onClose={() => setEditing(null)} />
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
