// Le panneau qui s'ouvre quand on touche un texte ou une photo de la page.
// Texte simple : un champ. Nom : les mots dans un champ. Ligne avec mot en
// avant : le texte tel qu'il s'affiche, où l'on sélectionne un mot puis
// « Mot en avant ». Photo : la vignette et « Changer la photo ».
// Un élément d'un groupe (ligne, phrase, offre) montre en dessous tout son
// groupe : glisser pour réordonner, × pour retirer, + pour ajouter.
// shared (en FR et EN) : seuls les textes se modifient ; photos et groupes
// montrent à la place le bloc « communs aux trois langues ».
import { useEffect, useRef, useState } from 'react';
import { get, kind, label, groupOf, itemText, GROUPS } from './fields.js';
import Sortable from './Sortable.jsx';

function segmentsToHtml(parts) {
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return parts.map((p) => (p.em ? `<em>${esc(p.t)}</em>` : esc(p.t))).join('');
}

function htmlToSegments(root) {
  const out = [];
  const push = (t, em) => {
    if (!t) return;
    const last = out[out.length - 1];
    if (last && !!last.em === em) last.t += t;
    else out.push(em ? { t, em: true } : { t });
  };
  const walk = (node, em) => {
    node.childNodes.forEach((n) => {
      if (n.nodeType === 3) push(n.nodeValue.replace(/ /g, ' '), em);
      else if (n.nodeName === 'BR') push(' ', em);
      else walk(n, em || n.nodeName === 'EM' || n.nodeName === 'I' || n.nodeName === 'U');
    });
  };
  walk(root, false);
  return out.length ? out : [{ t: '' }];
}

function SegmentsEditor({ value, onChange }) {
  const ref = useRef(null);
  // Initialisé une fois par champ : réécrire pendant la frappe ferait sauter le curseur
  useEffect(() => { ref.current.innerHTML = segmentsToHtml(value); }, []);
  const read = () => onChange(htmlToSegments(ref.current));
  const toggle = () => {
    const sel = window.getSelection();
    if (!sel.rangeCount || sel.isCollapsed || !ref.current.contains(sel.anchorNode)) return;
    const range = sel.getRangeAt(0);
    const inEm = (n) => { for (; n && n !== ref.current; n = n.parentNode) if (n.nodeName === 'EM') return n; return null; };
    const em = inEm(range.commonAncestorContainer);
    if (em) {
      em.replaceWith(...em.childNodes);
    } else {
      const wrap = document.createElement('em');
      wrap.append(range.extractContents());
      ref.current.querySelectorAll('em em').forEach((e) => e.replaceWith(...e.childNodes));
      range.insertNode(wrap);
    }
    ref.current.normalize();
    sel.removeAllRanges();
    read();
  };
  return (
    <>
      <div ref={ref} className="adm-rich t-title" contentEditable suppressContentEditableWarning
        onInput={read} onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }} />
      <button type="button" className="adm-btn adm-btn--ghost" onMouseDown={(e) => e.preventDefault()} onClick={toggle}>
        Mot en avant
      </button>
      <p className="adm-help">Sélectionne un mot puis « Mot en avant » pour le souligner en terracotta. Même geste pour l'enlever.</p>
    </>
  );
}

// Les photos coupées par leur cadre sur le site, et les cadres où l'on choisit
// ce qu'on garde : le hero (un cadrage pour ordinateur, un pour téléphone) et
// les cartes d'offres (carrées).
function cropSpec(path) {
  if (path === 'hero.photo') {
    return { path: 'hero.crop', frames: [
      { key: 'desktop', label: 'Ordinateur', ratio: 16 / 9 },
      { key: 'mobile', label: 'Téléphone', ratio: 375 / 812 },
    ] };
  }
  if (path === 'noite.day' || path === 'noite.night') {
    return { path: `${path}_crop`, frames: [
      { key: 'desktop', label: 'Ordinateur', ratio: 16 / 9 },
      { key: 'mobile', label: 'Téléphone', ratio: 375 / 812 },
    ] };
  }
  const m = path.match(/^oferta\.cards\.(\d+)\.photo$/);
  if (m) return { path: `oferta.cards.${m[1]}.crop`, frames: [{ key: null, label: 'Carte', ratio: 1 }] };
  return null;
}

// Un cadre aux proportions de l'écran : on y glisse la photo, au doigt ou à la
// souris, jusqu'à garder ce qu'on veut. x, y = part du débordement à gauche /
// en haut (0,5 = centré), la même valeur que le site applique.
function CropFrame({ src, ratio, label: name, value, onChange, wide }) {
  const box = useRef(null);
  const [nat, setNat] = useState(null);
  const v = { x: value?.x ?? .5, y: value?.y ?? .5 };
  const start = (e) => {
    if (!nat) return;
    e.preventDefault();
    const r = box.current.getBoundingClientRect();
    const sc = Math.max(r.width / nat.w, r.height / nat.h);
    const ox = nat.w * sc - r.width, oy = nat.h * sc - r.height;
    const x0 = e.clientX, y0 = e.clientY, v0 = { ...v };
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);
    const move = (ev) => {
      const clamp = (n) => Math.round(Math.max(0, Math.min(1, n)) * 1000) / 1000;
      onChange({
        x: ox > 0 ? clamp(v0.x - (ev.clientX - x0) / ox) : .5,
        y: oy > 0 ? clamp(v0.y - (ev.clientY - y0) / oy) : .5,
      });
    };
    const end = () => { el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', end); el.removeEventListener('pointercancel', end); };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
  };
  return (
    <figure className={`adm-crop${wide ? ' adm-crop--wide' : ''}`}>
      <div ref={box} className="adm-crop-box" style={{ aspectRatio: String(ratio) }} onPointerDown={start}>
        <img src={src} alt="" draggable="false" style={{ objectPosition: `${v.x * 100}% ${v.y * 100}%` }}
          onLoad={(e) => setNat({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })} />
      </div>
      <figcaption>{name}</figcaption>
    </figure>
  );
}

// Bloc « Photo téléphone » : par défaut le téléphone montre la même photo que
// l'ordinateur ; on peut en choisir une autre (champ « …_mobile ») et revenir.
function MobilePick({ value, src, onFile, onClear, busy }) {
  const input = useRef(null);
  return (
    <div className="adm-mobile-pick">
      <span className="adm-photo-label">Photo téléphone</span>
      {value ? <img src={src(value)} alt="" /> : <p className="adm-help">La même que l'ordinateur.</p>}
      <input ref={input} type="file" accept="image/*" hidden
        onChange={(e) => { const f = e.target.files && e.target.files[0]; e.target.value = ''; if (f) onFile(f); }} />
      <div className="adm-row">
        <button type="button" className="adm-btn adm-btn--ghost" disabled={busy} onClick={() => input.current.click()}>
          {busy ? 'Préparation…' : value ? 'Changer la photo téléphone' : 'Une autre photo pour le téléphone'}
        </button>
        {value && <button type="button" className="adm-btn adm-btn--ghost" onClick={onClear}>Reprendre celle de l'ordinateur</button>}
      </div>
    </div>
  );
}

function PhotoField({ path, value, src, onPhoto, data, onChange }) {
  const input = useRef(null);
  const [busy, setBusy] = useState(false);
  const [busyM, setBusyM] = useState(false);
  const spec = cropSpec(path);
  const crop = spec ? get(data, spec.path) : null;
  const mPath = `${path}_mobile`;
  const mobile = get(data, mPath);
  const pick = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    try {
      await onPhoto(path, file);
      if (spec) onChange(spec.path, undefined);   // nouvelle photo : cadrage remis au centre
    } finally { setBusy(false); }
  };
  const pickMobile = async (file) => {
    setBusyM(true);
    try {
      await onPhoto(mPath, file);
      if (spec && crop && crop.mobile) onChange(spec.path, { ...crop, mobile: undefined });
    } finally { setBusyM(false); }
  };
  // le cadre « Téléphone » montre la photo téléphone quand il y en a une
  const frameSrc = (key) => src(key === 'mobile' && mobile ? mobile : value);
  return (
    <div className="adm-photo">
      <span className="adm-photo-label">{label(path)}</span>
      {!value && <div className="adm-photo-empty">Pas de photo</div>}
      {value && !spec && <img src={src(value)} alt="" />}
      {value && spec && (
        <>
          <div className="adm-crops">
            {spec.frames.map((f) => (
              <CropFrame key={(f.key || 'one') + frameSrc(f.key)} src={frameSrc(f.key)} ratio={f.ratio} label={f.label} wide={f.ratio > 1}
                value={f.key ? crop && crop[f.key] : crop}
                onChange={(c) => onChange(spec.path, f.key ? { ...(crop || {}), [f.key]: c } : c)} />
            ))}
          </div>
          <p className="adm-help">Glisse la photo dans {spec.frames.length > 1 ? 'chaque cadre' : 'le cadre'} : ce qui est dedans est ce que le site montre{spec.frames.length > 1 ? ', sur ordinateur et sur téléphone' : ''}.</p>
        </>
      )}
      <input ref={input} type="file" accept="image/*" hidden onChange={pick} />
      <button type="button" className="adm-btn" disabled={busy} onClick={() => input.current.click()}>
        {busy ? 'Préparation…' : 'Changer la photo'}
      </button>
      {value && <MobilePick value={mobile} src={src} busy={busyM} onFile={pickMobile} onClear={() => onChange(mPath, undefined)} />}
    </div>
  );
}

// Vidéo d'un film : on choisit un fichier (60 Mo au plus : GitHub refuse un envoi de
// plus de 100 Mo, et le fichier grossit d'un tiers à l'envoi) ; il part avec
// « Publier », et GitHub prépare la version qui défile, les images pour
// téléphone et la photo d'attente (tools/preparer_videos.mjs).
const VIDEO_MAX = 60 * 1024 * 1024;
function VideoField({ film, data, src, onVideo, onChange }) {
  const input = useRef(null);
  const [err, setErr] = useState('');
  const pending = get(data, `${film}.video_source`);
  const current = pending || get(data, `${film}.video`);
  const pick = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > VIDEO_MAX) {
      setErr(`Trop lourde (${Math.round(file.size / 1048576)} Mo). Exporte-la en 1080p, moins de 60 Mo.`);
      return;
    }
    setErr('');
    await onVideo(`${film}.video_source`, file);
  };
  return (
    <div className="adm-photo">
      <span className="adm-photo-label">Vidéo du film</span>
      {current && <video key={current} src={src(current)} muted playsInline controls preload="metadata" className="adm-video-preview" />}
      {pending && <p className="adm-help">Nouvelle vidéo : à la publication, elle est préparée (version qui défile, images pour le téléphone, photo d'attente), en ligne environ 5 minutes plus tard. Sur téléphone, l'aperçu la montre telle quelle d'ici là.</p>}
      {err && <p className="adm-err">{err}</p>}
      <input ref={input} type="file" accept="video/*" hidden onChange={pick} />
      <div className="adm-row">
        <button type="button" className="adm-btn" onClick={() => input.current.click()}>Changer la vidéo</button>
        {pending && <button type="button" className="adm-btn adm-btn--ghost" onClick={() => onChange(`${film}.video_source`, undefined)}>Garder la vidéo actuelle</button>}
      </div>
    </div>
  );
}

// Suite de photos (film de nuit) : vignettes à glisser, retirer, ajouter
function SlidesField({ value, src, onChange, onPhotos }) {
  const input = useRef(null);
  const [busy, setBusy] = useState('');
  const [asking, setAsking] = useState(null);
  const [sel, setSel] = useState(null);   // la photo dont on règle le cadrage
  const move = (from, to) => {
    const next = value.slice();
    const [it] = next.splice(from, 1);
    next.splice(to, 0, it);
    onChange(next);
  };
  const add = async (e) => {
    const files = [...(e.target.files || [])];
    e.target.value = '';
    if (!files.length) return;
    try {
      const keys = await onPhotos(files, (i, n) => setBusy(`Préparation ${i}/${n}…`));
      onChange([...value, ...keys.map((k) => ({ src: k }))]);
    } finally { setBusy(''); }
  };
  return (
    <div className="adm-group">
      <p className="adm-help">Les photos passent l'une après l'autre au fil du défilement, dans cet ordre.</p>
      <Sortable items={value} onMove={move} render={(sl, i) => (
        <>
          <button type="button" className={`adm-sort-text adm-thumb${i === sel ? ' is-current' : ''}`} onClick={() => setSel(i === sel ? null : i)}>
            <img src={src(sl.src)} alt="" loading="lazy" /> Photo {i + 1} <small>{i === sel ? '· cadrage ouvert' : '· recadrer'}</small>
          </button>
          {asking === i ? (
            <span className="adm-ask">Retirer « photo {i + 1} » ? <button type="button" onClick={() => { setAsking(null); onChange(value.filter((_, j) => j !== i)); }}>Oui</button>
              <button type="button" onClick={() => setAsking(null)}>Non</button></span>
          ) : <button type="button" className="adm-x" aria-label={`Retirer photo ${i + 1}`} disabled={value.length <= 1} onClick={() => setAsking(i)}>×</button>}
        </>
      )} />
      {sel != null && value[sel] && (
        <div className="adm-photo">
          <span className="adm-photo-label">Photo {sel + 1} : glisse-la dans chaque cadre</span>
          <div className="adm-crops">
            {[['desktop', 'Ordinateur', 16 / 9], ['mobile', 'Téléphone', 375 / 812]].map(([key, name, ratio]) => (
              <CropFrame key={key + (key === 'mobile' ? value[sel].src_mobile || '' : '')}
                src={src(key === 'mobile' && value[sel].src_mobile ? value[sel].src_mobile : value[sel].src)} ratio={ratio} label={name} wide={ratio > 1}
                value={value[sel].crop && value[sel].crop[key]}
                onChange={(c) => onChange(value.map((x, j) => (j === sel ? { ...x, crop: { ...(x.crop || {}), [key]: c } } : x)))} />
            ))}
          </div>
        </div>
      )}
      {sel != null && value[sel] && (
        <MobilePick value={value[sel].src_mobile} src={src} busy={!!busy}
          onFile={async (f) => {
            const [k] = await onPhotos([f]);
            onChange(value.map((x, j) => (j === sel ? { ...x, src_mobile: k, crop: x.crop ? { ...x.crop, mobile: undefined } : x.crop } : x)));
          }}
          onClear={() => onChange(value.map((x, j) => (j === sel ? { ...x, src_mobile: undefined } : x)))} />
      )}
      <input ref={input} type="file" accept="image/*" multiple hidden onChange={add} />
      <button type="button" className="adm-btn" disabled={!!busy} onClick={() => input.current.click()}>{busy || '+ Ajouter des photos'}</button>
    </div>
  );
}

function GroupList({ group, index, data, onList, onOpen }) {
  const list = get(data, group) || [];
  const g = GROUPS[group];
  const [asking, setAsking] = useState(null);
  const move = (from, to) => {
    const next = list.slice();
    const [it] = next.splice(from, 1);
    next.splice(to, 0, it);
    // l'élément ouvert garde son panneau à sa nouvelle place
    const now = index === from ? to : index > from && index <= to ? index - 1 : index < from && index >= to ? index + 1 : index;
    onList(group, next, now);
  };
  const removeAt = (i) => {
    const next = list.filter((_, j) => j !== i);
    setAsking(null);
    onList(group, next, null);
  };
  const add = () => {
    const next = [...list, g.make(list)];
    onList(group, next, next.length - 1);
  };
  return (
    <div className="adm-group">
      <p className="adm-group-title">{label(group)}</p>
      <Sortable items={list} onMove={move} render={(item, i) => (
        <>
          <button type="button" className={`adm-sort-text${i === index ? ' is-current' : ''}`} onClick={() => onOpen(group, i)}>
            {i + 1}. {itemText(item) || '(vide)'}
          </button>
          {asking === i ? (
            <span className="adm-ask">
              Retirer « {itemText(item) || g.one} » ? <button type="button" onClick={() => removeAt(i)}>Oui</button>
              <button type="button" onClick={() => setAsking(null)}>Non</button>
            </span>
          ) : (
            <button type="button" className="adm-x" aria-label={`Retirer ${itemText(item)}`} disabled={list.length <= 1} onClick={() => setAsking(i)}>×</button>
          )}
        </>
      )} />
      <button type="button" className="adm-btn adm-btn--ghost" onClick={add}>+ {g.add}</button>
    </div>
  );
}

export default function Editor({ path, data, onChange, onList, onOpen, onPhoto, onPhotos, onVideo, src, onClose, shared }) {
  const value = get(data, path);
  const k = kind(value, path);
  const grp = groupOf(path);
  // La tombée de la nuit a deux photos : on les montre ensemble
  const photos = path === 'noite.day' || path === 'noite.night' ? ['noite.day', 'noite.night'] : [path];
  return (
    <aside className="adm-panel" role="dialog" aria-label={label(path)}>
      <header className="adm-panel-head">
        <strong>{label(path)}</strong>
        <button type="button" className="adm-btn adm-btn--ghost" onClick={onClose}>Fermer</button>
      </header>
      <div className="adm-panel-body" key={path}>
        {k === 'text' && (
          <textarea className="adm-input" rows={value.length > 80 ? 6 : 2} value={value} autoFocus
            onChange={(e) => onChange(path, e.target.value)} />
        )}
        {k === 'words' && (
          <input className="adm-input" value={value.join(' ')} autoFocus
            onChange={(e) => onChange(path, e.target.value.split(' '))} />
        )}
        {k === 'segments' && <SegmentsEditor value={value} onChange={(v) => onChange(path, v)} />}
        {shared && (k === 'photo' || /\.slides$/.test(path)) && shared}
        {!shared && onVideo && /^film_dia\.poster$/.test(path) && (
          <VideoField film={path.split('.')[0]} data={data} src={src} onVideo={onVideo} onChange={onChange} />
        )}
        {!shared && k === 'photo' && photos.map((p) => (
          <PhotoField key={p} path={p} value={get(data, p)} src={src} onPhoto={onPhoto} data={data} onChange={onChange} />
        ))}
        {!shared && k === 'other' && /\.slides$/.test(path) && <SlidesField value={value} src={src} onChange={(v) => onChange(path, v)} onPhotos={onPhotos} />}
        {k === 'other' && !grp && !/\.slides$/.test(path) && <p className="adm-help">Ce bloc se modifiera à une prochaine étape.</p>}
        {grp && !shared && <GroupList group={grp.group} index={grp.index} data={data} onList={onList} onOpen={onOpen} />}
        {grp && shared && k !== 'photo' && shared}
      </div>
    </aside>
  );
}
