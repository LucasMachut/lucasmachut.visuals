// Le panneau qui s'ouvre quand on touche un texte de la page.
// Texte simple : un champ. Nom : les mots dans un champ. Ligne avec mot en
// avant : le texte tel qu'il s'affiche, où l'on sélectionne un mot puis
// « Mot en avant » pour le souligner (ou l'inverse pour l'enlever).
import { useEffect, useRef } from 'react';
import { kind, label } from './fields.js';

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

export default function Editor({ path, value, onChange, onClose }) {
  const k = kind(value);
  return (
    <aside className="adm-panel" role="dialog" aria-label={label(path)}>
      <header className="adm-panel-head">
        <strong>{label(path)}</strong>
        <button type="button" className="adm-btn adm-btn--ghost" onClick={onClose}>Fermer</button>
      </header>
      <div className="adm-panel-body" key={path}>
        {k === 'text' && (
          <textarea className="adm-input" rows={value.length > 80 ? 6 : 2} value={value} autoFocus
            onChange={(e) => onChange(e.target.value)} />
        )}
        {k === 'words' && (
          <input className="adm-input" value={value.join(' ')} autoFocus
            onChange={(e) => onChange(e.target.value.split(' '))} />
        )}
        {k === 'segments' && <SegmentsEditor value={value} onChange={onChange} />}
        {k === 'other' && <p className="adm-help">Ce bloc se modifiera à une prochaine étape.</p>}
      </div>
    </aside>
  );
}
