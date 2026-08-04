#!/usr/bin/env python3
"""Le portfólio suit les dossiers `destaque`.

Chaque projet garde toutes ses photos dans son dossier, et les cinq qui
doivent paraître sur la page portfólio dans un sous-dossier `destaque` :

    Projets-web/Fotos/forro/            ← la série entière (page Fotos)
    Projets-web/Fotos/forro/destaque/   ← ce qu'on voit du portfólio

Pour changer la vitrine d'un projet, on remplace les fichiers du dossier
`destaque` — rien à écrire dans le HTML ni dans le CMS. Puis :

    python tools/sync_portfolio.py

À lancer depuis la racine du site. Le script fait deux choses :

  1. relit chaque dossier `destaque` et inscrit la liste dans
     data/fotos.json, sous la clé `destaque` de la série ;
  2. rafraîchit la copie de secours embarquée dans chaque page — celle
     qui prend le relais quand la page est ouverte depuis le disque et
     que le navigateur refuse le fetch.

Aucune photo n'est déplacée ni supprimée.
"""

import io
import json
import os
import re
import sys

# La copie de secours va dans toute page qui lit fotos.json par fetch :
# le portfólio, et la page Fotos vers laquelle il renvoie.
PAGES = {
    'portfolio.html': 'portfolio-series-data',
    'en/portfolio.html': 'portfolio-series-data',
    'fr/portfolio.html': 'portfolio-series-data',
    'fotos.html': 'fotos-series-data',
    'en/fotos.html': 'fotos-series-data',
    'fr/fotos.html': 'fotos-series-data',
}
ANCHORS = {
    'portfolio-series-data': r'[ \t]*<div id="portfolio-series"[^>]*></div>\n',
    'fotos-series-data': r'[ \t]*<div id="fotos-gallery"[^>]*></div>\n',
}

EXT = ('.jpg', '.jpeg', '.png', '.webp', '.avif')


def fallback_re(mark):
    return re.compile(
        r'[ \t]*<script type="application/json" id="%s">.*?</script>\n' % mark, re.S
    )


def listing(folder):
    """Les fichiers image d'un dossier, dans l'ordre alphabétique."""
    if not os.path.isdir(folder):
        return []
    names = [n for n in os.listdir(folder) if n.lower().endswith(EXT)]
    return sorted(names)



def main():
    if not os.path.isfile(os.path.join('data', 'fotos.json')):
        sys.exit('data/fotos.json introuvable — lance le script depuis la racine du site.')

    # ── 1. les séries du CMS ────────────────────────────────────────
    with io.open('data/fotos.json', encoding='utf-8') as fh:
        data = json.load(fh)

    for serie in data.get('series', []):
        photos = serie.get('photos') or []
        if not photos:
            continue
        folder = os.path.join(os.path.dirname(photos[0]), 'destaque')
        names = listing(folder)
        if names:
            serie['destaque'] = [
                os.path.join(folder, n).replace(os.sep, '/') for n in names
            ]
            print('  %-14s %d en vitrine' % (serie.get('slug', '?'), len(names)))
        else:
            serie.pop('destaque', None)
            print('  %-14s pas de dossier destaque, on garde les premières'
                  % serie.get('slug', '?'))

    with io.open('data/fotos.json', 'w', encoding='utf-8') as fh:
        json.dump(data, fh, ensure_ascii=False, indent=2)
        fh.write('\n')

    # ── 2. la copie de secours, page par page ───────────────
    payload = json.dumps(
        {'series': data.get('series', [])}, ensure_ascii=False, separators=(',', ':')
    ).replace('<', '\\u003c')
    for page, mark in PAGES.items():
        if not os.path.isfile(page):
            print('  ignoré (absent) :', page)
            continue

        block = '  <script type="application/json" id="%s">%s</script>\n' % (mark, payload)
        pattern = fallback_re(mark)

        with io.open(page, encoding='utf-8') as fh:
            html = fh.read()

        if pattern.search(html):
            html = pattern.sub(block, html, count=1)
        else:
            anchor = re.search(ANCHORS[mark], html)
            if anchor:
                html = html[:anchor.end()] + block + html[anchor.end():]
            else:
                print("  !! point d'ancrage introuvable :", page)

        with io.open(page, 'w', encoding='utf-8') as fh:
            fh.write(html)
        print('  ok', page)


if __name__ == '__main__':
    main()
