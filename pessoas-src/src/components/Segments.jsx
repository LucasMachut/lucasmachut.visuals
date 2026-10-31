// Un texte de l'accueil.json : une suite de morceaux { t, em }.
// em = le mot en avant (souligné terracotta, Special Elite n'a pas d'italique).
// Pas de capsules photo dans les lignes (Koisei en a, Lucas n'en veut pas).
export function Segments({ parts }) {
  return parts.map((s, i) => {
    return s.em ? <em key={i}>{s.t}</em> : <span key={i}>{s.t}</span>;
  });
}

// Plusieurs lignes, chacune dans son masque pour monter à la Koisei.
// edit = chemin du champ dans le JSON, lu par l'admin pour ouvrir le bon panneau.
export function Lines({ lines, lineClass = 'mLine', edit }) {
  return lines.map((line, i) => (
    <span className={lineClass} key={i} data-edit={edit ? `${edit}.${i}` : undefined}>
      <span><Segments parts={line} /></span>
    </span>
  ));
}

// Titre en lignes [[{t, em}]] de Trabalhos et des séries : chaque ligne dans
// son masque (.clip), qui monte à l'arrivée (.heroLine).
export function RichLines({ lines, tag: Tag = 'h2', className = '', edit }) {
  return (
    <Tag className={`t-title ${className}`}>
      {lines.map((line, i) => (
        <span className="clip" key={i} data-edit={edit ? `${edit}.${i}` : undefined}>
          <span className="heroLine"><Segments parts={line} /></span>
        </span>
      ))}
    </Tag>
  );
}

// Flèche des liens (Koisei : solar:arrow-right-linear)
export function Arrow({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 12h16m-6-6 6 6-6 6" />
    </svg>
  );
}
