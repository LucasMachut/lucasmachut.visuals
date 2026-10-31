// Contato pessoas : titre, feuille washi avec la voix de Lucas et le
// formulaire (envoyé par WhatsApp prérempli). Texte : data/pessoas/contato.json.
// Rendu par Astro (pages/contato.astro) et affiché tel quel dans l'admin.
import ContactForm from './ContactForm.jsx';
import { Segments } from './Segments.jsx';

export default function ContatoBody({ data }) {
  const { hero, voice, form } = data;
  return (
    <div className="contact-page">
      <header className="contact-head">
        <p className="eyebrow" data-edit="hero.eyebrow"><i />{hero.eyebrow}</p>
        <h1 className="t-title contact-title" data-edit="hero.title"><Segments parts={hero.title} /></h1>
        <p className="contact-strip" data-edit="hero.strip">{hero.strip}</p>
      </header>
      <section className="sheet" aria-labelledby="contato-voz">
        <div className="sheet-inner">
          <div className="voice">
            <h2 id="contato-voz" className="t-title voice-title" data-edit="voice.title"><Segments parts={voice.title} /></h2>
            {voice.paragraphs.map((p, i) => <p key={i} className="voice-p" data-edit={`voice.paragraphs.${i}`}>{p}</p>)}
            <ul className="voice-links">
              {voice.links.map((l, i) => (
                <li key={i}>
                  <span className="voice-label" data-edit={`voice.links.${i}.label`}>{l.label}</span>
                  <a href={l.href} className="u-link" data-edit={`voice.links.${i}.handle`}
                    target={l.href.startsWith('http') ? '_blank' : undefined} rel={l.href.startsWith('http') ? 'noopener noreferrer' : undefined}>{l.handle}</a>
                </li>
              ))}
            </ul>
          </div>
          <ContactForm form={form} />
        </div>
      </section>
    </div>
  );
}
