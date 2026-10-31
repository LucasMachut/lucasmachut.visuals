// Textes calculés d'une série, sans accès disque : servent au site et à l'admin.

// « Rio de Janeiro, RJ » + 2026 → « Rio de Janeiro · 2026 » (texte vertical Koisei)
export function placeDate(s) {
  return [(s.location || '').split(',')[0].trim(), s.year].filter(Boolean).join(' · ');
}

export function metaLine(s) {
  return [(s.location || '').split(',')[0].trim(), s.type, s.year].filter(Boolean).join(' · ');
}
