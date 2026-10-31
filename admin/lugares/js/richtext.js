/* Le champ de texte d'un bloc : on écrit comme dans une note, avec
   l'italique et le retour à la ligne. Ce qui en sort est du HTML
   propre, qui garde les balises d'origine (classes comprises). */

import { h } from './forms.js';
import { escapeText, escapeAttr } from './source.js';

const KEEP = new Set(('a abbr b bdi bdo cite code data del dfn em i ins kbd mark q s samp small span ' +
  'strong sub sup time u var wbr').split(' '));

const blancs = new WeakMap();

function ser(node) {
  let s = '';
  node.childNodes.forEach(c => {
    if (c.nodeType === 3) { s += blancs.has(c) && c.data === ' ' ? blancs.get(c) : escapeText(c.data); return; }
    if (c.nodeType === 8) { s += '<!--' + c.data + '-->'; return; }
    if (c.nodeType !== 1) return;
    let t = c.tagName.toLowerCase();
    if (t === 'br') { s += '<br>'; return; }
    if (!KEEP.has(t)) {
      // un <div> ou <p> glissé par le navigateur = un retour à la ligne
      if (s && !s.endsWith('<br>')) s += '<br>';
      s += ser(c);
      return;
    }
    const orig = c.hasAttribute('data-o');
    if (!orig && t === 'i') t = 'em';
    if (!orig && t === 'b') t = 'strong';
    const attrs = [...c.attributes]
      .filter(a => a.name !== 'data-o' && (orig || a.name !== 'style'))
      .map(a => ' ' + a.name + (a.value === '' && !orig ? '' : '="' + escapeAttr(a.value) + '"')).join('');
    const kids = ser(c);
    if (!kids && !orig) return; // balise vide laissée par l'éditeur
    s += '<' + t + attrs + '>' + kids + '</' + t + '>';
  });
  return s;
}

// html : le contenu d'origine ; onChange(nouveauHtml) à chaque frappe.
export function richText(html, onChange, opts = {}) {
  const lead = /^\s*/.exec(html)[0];
  const trail = /\s*$/.exec(html)[0];
  const ed = h('div', { class: 'rt', contenteditable: 'true', spellcheck: 'true' });
  ed.innerHTML = html.trim();
  ed.querySelectorAll('*').forEach(e => e.setAttribute('data-o', ''));
  // Les retours à la ligne et l'indentation du fichier ne comptent pas
  // en HTML : on les montre comme un simple espace.
  const walker = document.createTreeWalker(ed, NodeFilter.SHOW_TEXT);
  // Un blanc entre deux balises reprend sa forme d'origine à l'écriture.
  for (let t; (t = walker.nextNode());) {
    if (/^[ \t\r\n]+$/.test(t.data)) blancs.set(t, t.data);
    t.data = t.data.replace(/[ \t\r\n]+/g, ' ');
  }
  const base = ser(ed);

  const out = () => {
    const s = ser(ed).replace(/(<br>)+$/, '');
    return s === base ? html : lead + s + trail;
  };
  const fire = () => { onChange(out()); drawLinks(); };

  ed.addEventListener('input', fire);
  ed.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (opts.single) return;
      if (!document.execCommand('insertLineBreak')) document.execCommand('insertHTML', false, '<br>');
    }
  });
  ed.addEventListener('paste', e => {
    e.preventDefault();
    const t = (e.clipboardData || window.clipboardData).getData('text/plain');
    document.execCommand('insertText', false, opts.single ? t.replace(/\s+/g, ' ') : t);
  });

  const cmd = (name, label, title) => h('button', { type: 'button', class: 'rt-btn', title,
    onmousedown: e => e.preventDefault(),
    onclick: () => { ed.focus(); document.execCommand(name); fire(); } }, label);

  const links = h('div', { class: 'rt-links' });
  function drawLinks() {
    const as = [...ed.querySelectorAll('a')];
    if (links.childElementCount === as.length) return;
    links.replaceChildren(...as.map((a, i) => h('label', { class: 'rt-link' },
      h('span', null, 'Lien ' + (as.length > 1 ? (i + 1) + ' ' : '') + '« ' + (a.textContent.trim().slice(0, 30) || '…') + ' »'),
      h('input', { type: 'url', class: 'f-input', value: a.getAttribute('href') || '',
        oninput: e => { a.setAttribute('href', e.target.value); onChange(out()); } }))));
  }
  drawLinks();

  return h('div', { class: 'rt-wrap' },
    h('div', { class: 'rt-bar' },
      cmd('italic', h('i', null, 'Italique'), 'Mettre en italique'),
      opts.single ? null : h('button', { type: 'button', class: 'rt-btn', onmousedown: e => e.preventDefault(),
        onclick: () => { ed.focus(); if (!document.execCommand('insertLineBreak')) document.execCommand('insertHTML', false, '<br>'); fire(); } },
      '↵ Retour à la ligne')),
    ed, links);
}
