// Un texte de l'accueil.json : une suite de morceaux { t, em }.
// em = le mot en avant (souligné terracotta, Special Elite n'a pas d'italique).
// Pas de capsules photo dans les lignes (Koisei en a, Lucas n'en veut pas).
export function Segments({ parts }) {
  return parts.map((s, i) => {
    return s.em ? <em key={i}>{s.t}</em> : <span key={i}>{s.t}</span>;
  });
}

// Plusieurs lignes, chacune dans son masque pour monter à la Koisei
export function Lines({ lines, lineClass = 'mLine' }) {
  return lines.map((line, i) => (
    <span className={lineClass} key={i}>
      <span><Segments parts={line} /></span>
    </span>
  ));
}


// Flèche des liens (Koisei : solar:arrow-right-linear)
export function Arrow({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 12h16m-6-6 6 6-6 6" />
    </svg>
  );
}
