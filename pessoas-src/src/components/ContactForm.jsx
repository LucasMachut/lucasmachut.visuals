// Formulaire Contato : rien ne part vers un serveur. Enviar compose le message
// et ouvre WhatsApp prérempli vers Lucas (décision du 31.10.2026), la personne
// n'a plus qu'à appuyer sur envoyer là-bas.
import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function compose(form, values) {
  const lines = [form.intro, ''];
  for (const f of form.fields) {
    const v = (values[f.name] || '').trim();
    if (v) lines.push(f.type === 'textarea' ? `\n${v}` : `${f.label}: ${v}`);
  }
  return `https://wa.me/${form.whatsapp}?text=${encodeURIComponent(lines.join('\n'))}`;
}

function Field({ f, form, value, error, onChange }) {
  const common = {
    id: f.name, name: f.name, value, onChange: (e) => onChange(f.name, e.target.value),
    autoComplete: f.autocomplete, 'aria-invalid': error ? true : undefined,
    'aria-describedby': error ? `${f.name}-erro` : undefined,
  };
  return (
    <div className={`field${f.full ? ' field--full' : ''}${error ? ' field--error' : ''}`}>
      <label htmlFor={f.name}>{f.label}</label>
      {f.type === 'select' ? (
        <select {...common}>
          <option value="">{form.select_placeholder}</option>
          {f.options.map((o) => <option key={o}>{o}</option>)}
        </select>
      ) : f.type === 'textarea' ? (
        <textarea {...common} rows={5} placeholder={f.placeholder} />
      ) : (
        <input {...common} type={f.type} placeholder={f.placeholder} />
      )}
      {error && <p className="field-error" id={`${f.name}-erro`}>{error}</p>}
    </div>
  );
}

export default function ContactForm({ form }) {
  const [values, setValues] = useState({});
  const [errors, setErrors] = useState({});
  const [sentUrl, setSentUrl] = useState(null);
  const disc = useRef(null);

  // Begin disc Koisei (#magnet) : suit le pointeur à .3 × l'écart, rebond au départ.
  useEffect(() => {
    const el = disc.current;
    if (!el || !matchMedia('(pointer: fine)').matches) return;
    const move = (e) => {
      const r = el.getBoundingClientRect();
      gsap.to(el, { x: (e.clientX - r.left - r.width / 2) * .3, y: (e.clientY - r.top - r.height / 2) * .3, duration: .4 });
    };
    const leave = () => gsap.to(el, { x: 0, y: 0, duration: .8, ease: 'elastic.out(1,0.4)' });
    el.addEventListener('mousemove', move);
    el.addEventListener('mouseleave', leave);
    return () => { el.removeEventListener('mousemove', move); el.removeEventListener('mouseleave', leave); };
  }, [sentUrl]);

  const onChange = (name, v) => {
    setValues((s) => ({ ...s, [name]: v }));
    if (errors[name]) setErrors((s) => ({ ...s, [name]: undefined }));
  };

  const submit = (e) => {
    e.preventDefault();
    const next = {};
    if (!(values.nome || '').trim()) next.nome = form.errors.nome;
    if (!EMAIL.test((values.email || '').trim())) next.email = form.errors.email;
    setErrors(next);
    const first = Object.keys(next)[0];
    if (first) { document.getElementById(first)?.focus(); return; }
    const url = compose(form, values);
    window.open(url, '_blank', 'noopener');
    setSentUrl(url);
  };

  if (sentUrl) {
    return (
      <div className="sent" role="status">
        <p className="sent-title t-title">{form.sent.title}</p>
        <p className="sent-text">{form.sent.text}</p>
        <a className="u-link sent-link" href={sentUrl} target="_blank" rel="noopener noreferrer">{form.sent.retry}</a>
        <button type="button" className="u-link sent-link" onClick={() => { setValues({}); setSentUrl(null); }}>{form.sent.again}</button>
      </div>
    );
  }

  return (
    <form className="contact-form" noValidate onSubmit={submit}>
      <div className="fields">
        {form.fields.map((f) => (
          <Field key={f.name} f={f} form={form} value={values[f.name] || ''} error={errors[f.name]} onChange={onChange} />
        ))}
      </div>
      <div className="submit-row">
        <button ref={disc} type="submit" className="disc">
          <span>{form.submit}</span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 12h16M14 6l6 6-6 6" /></svg>
        </button>
      </div>
    </form>
  );
}
