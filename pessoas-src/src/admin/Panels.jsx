// Panneaux propres à Trabalhos, aux séries et à Contato : liste des séries,
// nouvelle série, hero d'une série, photos, vidéos YouTube, WhatsApp.
// Chaque panneau reçoit le document qu'il modifie et renvoie la nouvelle version.
// shared : en FR et EN, le bloc « communs aux trois langues » ; le panneau ne
// montre alors que ses textes, le reste se change en PT.
import { useRef, useState } from 'react';
import Sortable from './Sortable.jsx';

function Panel({ title, onClose, children }) {
  return (
    <aside className="adm-panel" role="dialog" aria-label={title}>
      <header className="adm-panel-head">
        <strong>{title}</strong>
        <button type="button" className="adm-btn adm-btn--ghost" onClick={onClose}>Fermer</button>
      </header>
      <div className="adm-panel-body">{children}</div>
    </aside>
  );
}

// En FR et EN : photos, ordre, cadrages et sections se changent en PT, pour les trois langues
export function Shared({ onPt }) {
  return (
    <div className="adm-shared">
      <p className="adm-help">Photos, ordre, cadrages et sections sont communs aux trois langues : ils se changent en PT.</p>
      <button type="button" className="adm-btn adm-btn--ghost" onClick={onPt}>Passer en PT</button>
    </div>
  );
}

// Un panneau sans texte à traduire (sections, photos d'une série)
export function SharedPanel({ title, onPt, onClose }) {
  return <Panel title={title} onClose={onClose}><Shared onPt={onPt} /></Panel>;
}

function Field({ label, value, onChange, rows }) {
  return (
    <label className="adm-field">
      <span>{label}</span>
      {rows
        ? <textarea className="adm-input" rows={rows} value={value || ''} onChange={(e) => onChange(e.target.value)} />
        : <input className="adm-input" value={value || ''} onChange={(e) => onChange(e.target.value)} />}
    </label>
  );
}

function FilePick({ multiple, label, busy, onFiles }) {
  const ref = useRef(null);
  return (
    <>
      <input ref={ref} type="file" accept="image/*" multiple={multiple} hidden
        onChange={(e) => { const f = [...(e.target.files || [])]; e.target.value = ''; if (f.length) onFiles(f); }} />
      <button type="button" className="adm-btn" disabled={!!busy} onClick={() => ref.current.click()}>{busy || label}</button>
    </>
  );
}

function Remove({ name, onYes }) {
  const [ask, setAsk] = useState(false);
  return ask ? (
    <span className="adm-ask">Retirer « {name} » ? <button type="button" onClick={onYes}>Oui</button>
      <button type="button" onClick={() => setAsk(false)}>Non</button></span>
  ) : <button type="button" className="adm-x" aria-label={`Retirer ${name}`} onClick={() => setAsk(true)}>×</button>;
}

// Liste des séries de Trabalhos : ordre, visible ou masquée, ouvrir, nouvelle
export function SeriesPanel({ t, series, current, onT, onOpen, onNew, onTitle, onClose, shared }) {
  const hidden = new Set(t.hidden || []);
  const move = (from, to) => {
    const next = t.series.slice();
    const [it] = next.splice(from, 1);
    next.splice(to, 0, it);
    onT({ ...t, series: next });
  };
  const toggle = (slug) => onT({ ...t, hidden: hidden.has(slug) ? t.hidden.filter((x) => x !== slug) : [...(t.hidden || []), slug] });
  const cur = current && series[current];
  return (
    <Panel title={cur ? `Série : ${cur.title}` : 'Séries'} onClose={onClose}>
      {cur && (
        <>
          <Field label="Titre de la série" value={cur.title} onChange={(v) => onTitle(current, v)} />
          <button type="button" className="adm-btn adm-btn--ghost" onClick={() => onOpen(current)}>Ouvrir la série →</button>
        </>
      )}
      {shared ? (
        <div className="adm-group">
          <p className="adm-group-title">Séries de Trabalhos</p>
          {t.series.map((slug) => (
            <button key={slug} type="button" className={`adm-sort-text${slug === current ? ' is-current' : ''}${hidden.has(slug) ? ' is-off' : ''}`}
              onClick={() => onOpen(slug)}>{(series[slug] && series[slug].title) || slug}</button>
          ))}
          {shared}
        </div>
      ) : (
      <div className="adm-group">
        <p className="adm-group-title">Séries de Trabalhos</p>
        <Sortable items={t.series} onMove={move} render={(slug) => (
          <>
            <button type="button" className={`adm-sort-text${slug === current ? ' is-current' : ''}${hidden.has(slug) ? ' is-off' : ''}`}
              onClick={() => onOpen(slug)}>{(series[slug] && series[slug].title) || slug}</button>
            <button type="button" className="adm-eye" aria-pressed={!hidden.has(slug)} onClick={() => toggle(slug)}>
              {hidden.has(slug) ? 'Masquée' : 'Visible'}
            </button>
          </>
        )} />
        <button type="button" className="adm-btn adm-btn--ghost" onClick={onNew}>+ Nouvelle série</button>
        <p className="adm-help">Une série masquée garde ses photos et ses textes ; elle n'apparaît plus sur le site une fois publié.</p>
      </div>
      )}
    </Panel>
  );
}

// Nouvelle série : un titre, puis toutes les photos d'un coup
export function NewSeriePanel({ onCreate, onClose }) {
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState('');
  const go = async (files) => {
    try { await onCreate(title.trim(), files, (i, n) => setBusy(`Préparation ${i}/${n}…`)); }
    finally { setBusy(''); }
  };
  return (
    <Panel title="Nouvelle série" onClose={onClose}>
      <Field label="Titre" value={title} onChange={setTitle} />
      <FilePick multiple label="Choisir les photos" busy={busy || (!title.trim() && 'Écris d\'abord le titre')} onFiles={go} />
      <p className="adm-help">Choisis toutes les photos d'un coup. La première sert de couverture et de hero ; tu pourras changer ça ensuite.</p>
    </Panel>
  );
}

// Hero d'une série : photo, titre, surtitre, lieu, type, année
export function SerieHeroPanel({ s, src, onS, onPhoto, onClose, shared }) {
  const [busy, setBusy] = useState('');
  return (
    <Panel title="Hero de la série" onClose={onClose}>
      <div className="adm-photo">
        <img src={src(s.hero)} alt="" />
        {!shared && <FilePick label="Changer la photo" busy={busy} onFiles={async ([f]) => { setBusy('Préparation…'); try { await onPhoto(f, 'hero'); } finally { setBusy(''); } }} />}
      </div>
      <Field label="Titre" value={s.title} onChange={(v) => onS({ ...s, title: v })} />
      <Field label="Surtitre" value={s.eyebrow} onChange={(v) => onS({ ...s, eyebrow: v })} />
      <Field label="Lieu" value={s.location} onChange={(v) => onS({ ...s, location: v })} />
      <Field label="Type" value={s.type} onChange={(v) => onS({ ...s, type: v })} />
      {!shared && <Field label="Année" value={s.year} onChange={(v) => onS({ ...s, year: v })} />}
      <p className="adm-help">Le texte vertical (lieu · année) se calcule tout seul.</p>
      {shared}
    </Panel>
  );
}

// Photos d'une série : ordre, retirer, ajouter, couverture, hero
export function PhotosPanel({ s, index, src, onS, onAdd, onIndex, onClose }) {
  const [busy, setBusy] = useState('');
  const move = (from, to) => {
    const next = s.photos.slice();
    const [it] = next.splice(from, 1);
    next.splice(to, 0, it);
    onS({ ...s, photos: next });
    if (index === from) onIndex(to);
  };
  const cur = s.photos[index];
  return (
    <Panel title={`Photos de la série · ${s.photos.length}`} onClose={onClose}>
      {cur && (
        <div className="adm-photo">
          <img src={src(cur.src)} alt="" />
          <div className="adm-row">
            <button type="button" className="adm-btn adm-btn--ghost" disabled={s.cover === cur.src} onClick={() => onS({ ...s, cover: cur.src })}>
              {s.cover === cur.src ? 'C\'est la couverture' : 'Prendre comme couverture'}
            </button>
            <button type="button" className="adm-btn adm-btn--ghost" disabled={s.hero === cur.src} onClick={() => onS({ ...s, hero: cur.src })}>
              {s.hero === cur.src ? 'C\'est le hero' : 'Prendre comme hero'}
            </button>
          </div>
        </div>
      )}
      <div className="adm-group">
        <Sortable items={s.photos} onMove={move} render={(ph, i) => (
          <>
            <button type="button" className={`adm-sort-text adm-thumb${i === index ? ' is-current' : ''}`} onClick={() => onIndex(i)}>
              <img src={src(ph.src)} alt="" loading="lazy" /> Photo {i + 1}
            </button>
            <Remove name={`photo ${i + 1}`} onYes={() => { onS({ ...s, photos: s.photos.filter((_, j) => j !== i) }); onIndex(null); }} />
          </>
        )} />
        <FilePick multiple label="+ Ajouter des photos" busy={busy}
          onFiles={async (files) => { try { await onAdd(files, (i, n) => setBusy(`Préparation ${i}/${n}…`)); } finally { setBusy(''); } }} />
      </div>
    </Panel>
  );
}

// « https://youtu.be/ID », « …watch?v=ID », « …/shorts/ID » ou l'identifiant seul
export function youtubeId(link) {
  const s = String(link || '').trim();
  const m = s.match(/(?:youtu\.be\/|v=|\/shorts\/|\/embed\/)([\w-]{11})/);
  if (m) return m[1];
  return /^[\w-]{11}$/.test(s) ? s : '';
}

// Vidéos YouTube d'une série
export function VideosPanel({ s, onS, onClose, shared }) {
  const [link, setLink] = useState('');
  const id = youtubeId(link);
  const set = (i, v) => onS({ ...s, videos: s.videos.map((x, j) => (j === i ? { ...x, ...v } : x)) });
  const move = (from, to) => {
    const next = s.videos.slice();
    const [it] = next.splice(from, 1);
    next.splice(to, 0, it);
    onS({ ...s, videos: next });
  };
  return (
    <Panel title="Vidéos de la série" onClose={onClose}>
      {shared ? (
        <>
          {s.videos.map((v, i) => (
            <input key={i} className="adm-input" value={v.title} onChange={(e) => set(i, { title: e.target.value })} aria-label={`Titre de la vidéo ${i + 1}`} />
          ))}
          {shared}
        </>
      ) : (<>
      <Sortable items={s.videos} onMove={move} render={(v, i) => (
        <>
          <span className="adm-video">
            <input className="adm-input" value={v.title} onChange={(e) => set(i, { title: e.target.value })} aria-label="Titre de la vidéo" />
            <select className="adm-input" value={v.format} onChange={(e) => set(i, { format: e.target.value })} aria-label="Format">
              <option value="wide">Large</option>
              <option value="short">Court (vertical)</option>
            </select>
          </span>
          <Remove name={v.title || 'cette vidéo'} onYes={() => onS({ ...s, videos: s.videos.filter((_, j) => j !== i) })} />
        </>
      )} />
      <div className="adm-group">
        <Field label="Lien YouTube" value={link} onChange={setLink} />
        {link && !id && <p className="adm-err">Ce lien ne ressemble pas à une vidéo YouTube.</p>}
        <button type="button" className="adm-btn" disabled={!id} onClick={() => {
          onS({ ...s, videos: [...s.videos, { id, title: s.title, format: /shorts\//.test(link) ? 'short' : 'wide' }] });
          setLink('');
        }}>+ Ajouter la vidéo</button>
      </div>
      </>)}
    </Panel>
  );
}

// Contato : le numéro qui reçoit les demandes et le message d'intro
export function WhatsappPanel({ c, onC, onClose, shared }) {
  return (
    <Panel title="WhatsApp du formulaire" onClose={onClose}>
      {!shared && <Field label="Numéro (avec l'indicatif, sans + ni espaces)" value={c.form.whatsapp}
        onChange={(v) => onC({ ...c, form: { ...c.form, whatsapp: v.replace(/[^\d]/g, '') } })} />}
      <Field label="Message d'intro" rows={2} value={c.form.intro} onChange={(v) => onC({ ...c, form: { ...c.form, intro: v } })} />
      <p className="adm-help">Le formulaire ouvre WhatsApp vers ce numéro, avec ce message suivi des réponses.</p>
      {shared && <p className="adm-help">Le numéro est le même dans les trois langues : il se change en PT.</p>}
    </Panel>
  );
}
