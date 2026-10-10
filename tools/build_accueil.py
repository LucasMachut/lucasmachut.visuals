#!/usr/bin/env python3
"""Les textes et les photos de l'accueil vivent dans `data/accueil.json`.

On les modifie depuis /admin (onglet « Accueil »). Ce fichier sert aux
deux versions de la page — grand écran (.dv) et téléphone (.mv) — qui
avaient chacune leur copie de chaque phrase.

index.html déclare les endroits que le script réécrit :

    <!-- cms:dv-nome-texte -->
      ...ce que le script écrit...
    <!-- /cms:dv-nome-texte -->

Tout le reste de la page (mise en page, voiles, commentaires, liens)
est laissé intact. Après une modification du JSON :

    python tools/build_accueil.py

À lancer depuis la racine du site. En ligne, c'est GitHub qui le lance
tout seul à chaque publication depuis /admin
(.github/workflows/accueil.yml).

Écriture des textes, dans le CMS :
  - une ligne vide sépare deux paragraphes (sur téléphone : deux temps
    de texte qui se remplacent au défilement) ;
  - un simple retour à la ligne : sur téléphone, la phrase passe en
    dessous ; sur grand écran, elle reste dans le même paragraphe ;
  - *mots* met en italique (dans les titres) ; une ligne entière entre
    astérisques passe en italique rose sur téléphone.

Le script s'arrête sans rien écrire si un champ manque ou si une
balise attendue n'est pas dans la page.
"""

import html
import io
import json
import re
import sys
from urllib.parse import quote

PAGE = 'index.html'
DATA = 'data/accueil.json'

# Pixel vide : la version qui n'est pas affichée ne télécharge rien.
PIX = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw=='
DV_SRC = '<source media="(max-width:860px)" srcset="%s">' % PIX
MV_SRC = '<source media="(min-width:861px)" srcset="%s">' % PIX

# Inclinaison des tirages de l'album, reprise en boucle.
TILTS = ('-2.4deg', '1.8deg', '-1.2deg', '2.2deg', '-.8deg')

BLOCK = re.compile(
    r'(?P<open>(?P<pad>[ \t]*)<!-- cms:(?P<name>[a-z0-9-]+) -->[ \t]*\n)'
    r'.*?'
    r'(?P<close>[ \t]*<!-- /cms:(?P=name) -->)',
    re.S,
)


class Manque(Exception):
    pass


# ─── lecture du JSON ───

def champ(d, *chemin):
    v = d
    for k in chemin:
        if isinstance(v, dict) and k in v:
            v = v[k]
        elif isinstance(v, list) and isinstance(k, int) and k < len(v):
            v = v[k]
        else:
            raise Manque('champ manquant : ' + ' > '.join(map(str, chemin)))
    if v is None or v == '':
        raise Manque('champ vide : ' + ' > '.join(map(str, chemin)))
    return v


def src(p):
    p = str(p).strip().lstrip('/')
    return html.escape(quote(p, safe="/%-_.~()"), quote=True)


def attr(s):
    return html.escape(str(s).strip(), quote=True)


def inline(s):
    """Échappe le texte et transforme *mots* en <em>mots</em>."""
    s = html.escape(s.strip(), quote=False)
    return re.sub(r'\*(.+?)\*', r'<em>\1</em>', s)


def titre(s):
    return '<br>'.join(inline(l) for l in s.strip().split('\n') if l.strip())


def blocs(texte):
    """Le texte en paragraphes (ligne vide), chacun en lignes."""
    out = []
    for b in re.split(r'\n\s*\n', texte.strip().replace('\r', '')):
        lignes = [l.strip() for l in b.split('\n') if l.strip()]
        if lignes:
            out.append(lignes)
    return out


def entiere_em(ligne):
    return len(ligne) > 2 and ligne.startswith('*') and ligne.endswith('*') \
        and '*' not in ligne[1:-1]


# ─── grand écran ───

def dv_texte(texte, cls):
    """Un <p> par paragraphe, ses lignes recollées."""
    out = []
    for b in blocs(texte):
        phr = ' '.join(l[1:-1] if entiere_em(l) else l for l in b)
        out.append('<p class="%s">%s</p>' % (cls, inline(phr)))
    return out


def dv_panel(fotos):
    f = fotos[0]
    return [
        '<picture>',
        '  ' + DV_SRC,
        '  <img loading="lazy" src="%s" alt="%s"' % (src(f['foto']), attr(f.get('alt', ''))),
        '       style="--dpos:%s">' % attr(f.get('cadrage') or '50% 50%'),
        '</picture>',
    ]


def dv_tiles(fotos):
    out = ['<figure class="tile">']
    out += ['  ' + l for l in dv_panel(fotos)]
    out.append('</figure>')
    for f in fotos[1:]:
        out.append(
            '<figure class="tile tile--alt"><picture>%s<img src="%s" alt="%s" '
            'loading="lazy" style="object-position:%s"></picture></figure>'
            % (DV_SRC, src(f['foto']), attr(f.get('alt', '')),
               attr(f.get('cadrage') or '50% 50%')))
    return out


def fotos(d, cle, n):
    lst = champ(d, cle, 'fotos_grande')
    if len(lst) != n:
        raise Manque('%s > fotos_grande : il faut exactement %d photo(s), il y en a %d'
                     % (cle, n, len(lst)))
    for i, f in enumerate(lst):
        champ(d, cle, 'fotos_grande', i, 'foto')
    return lst


# ─── téléphone ───

def mv_chapitre(d, cle, num, nom, titre_cls=None, apres=(), extra_cls=''):
    """Un chapitre complet : la photo nue, puis le texte en overlay."""
    c = d[cle]
    ft = champ(d, cle, 'foto_telefone')
    champ(d, cle, 'foto_telefone', 'foto')

    temps = []
    if c.get('texto'):
        for b in blocs(c['texto']):
            temps.append(['<p class="mtx mtx--em rv">%s</p>' % inline(l[1:-1])
                          if entiere_em(l) else
                          '<p class="mtx rv">%s</p>' % inline(l) for l in b])
    if not temps:
        temps = [[]]
    if c.get('titulo'):
        temps[0].insert(0, '<h2 class="rv">%s</h2>' % titre(c['titulo']))
    temps[0].insert(0, '<p class="ch__n" data-type="%s"></p>' % attr(nom))
    temps[-1].extend(apres)

    style = ' style="--beats:%d"' % len(temps) if len(temps) > 1 else ''
    out = [
        '<section class="ch%s" data-ch="%s" data-name="%s"%s>'
        % (extra_cls, num, attr(nom), style),
        '  <div class="ch__stage">',
        '    <div class="ch__photos"><picture>%s<img loading="lazy" src="%s" alt="%s"></picture></div>'
        % (MV_SRC, src(ft['foto']), attr(ft.get('alt', ''))),
        '    <div class="ch__af" aria-hidden="true" style="--af:%s"><i></i><i></i><i></i><i></i></div>'
        % attr(ft.get('viseur') or '20% 20% 40% 20%'),
        '    <div class="ch__leak" aria-hidden="true"></div>',
        '    <div class="ch__veil"></div>',
        '    <div class="ch__text">',
    ]
    for t in temps:
        out.append('      <div class="beat">')
        out += ['        ' + l for l in t]
        out.append('      </div>')
    out += ['    </div>', '  </div>', '</section>']
    return out


def mv_suite(d, cle):
    lst = d[cle].get('serie_telefone') or []
    if not lst:
        return []
    out = ['<div class="suite">']
    for i, f in enumerate(lst):
        champ(d, cle, 'serie_telefone', i, 'foto')
        out.append(
            '  <figure class="prova%s"><picture>%s<img loading="lazy" src="%s" alt="%s"></picture></figure>'
            % ('' if i % 2 else ' prova--r', MV_SRC, src(f['foto']), attr(f.get('alt', ''))))
    out.append('</div>')
    return out


# ─── les blocs de la page ───

def blocs_page(d):
    t = {}

    # grand écran
    t['dv-nome-foto'] = dv_panel(fotos(d, 'nome', 1))
    t['dv-nome-texte'] = (
        ['<h2>%s</h2>' % titre(champ(d, 'nome', 'titulo'))]
        + dv_texte(champ(d, 'nome', 'texto'), 'lede')
        + ['<p class="metier">%s</p>' % inline(champ(d, 'nome', 'metier'))])
    t['dv-memoria-fotos'] = dv_tiles(fotos(d, 'memoria', 2))
    t['dv-memoria-texte'] = dv_texte(champ(d, 'memoria', 'texto'), 'mf')
    t['dv-cada-foto'] = dv_panel(fotos(d, 'cada_pessoa', 1))
    t['dv-cada-texte'] = dv_texte(champ(d, 'cada_pessoa', 'texto'), 'mf')
    t['dv-olhar-fotos'] = dv_tiles(fotos(d, 'olhar', 4))
    t['dv-olhar-texte'] = dv_texte(champ(d, 'olhar', 'texto'), 'mf')
    t['dv-lacos-fotos'] = dv_tiles(fotos(d, 'lacos', 3))
    t['dv-lacos-texte'] = dv_texte(champ(d, 'lacos', 'texto'), 'mf')
    t['dv-lacos-texte-etroit'] = t['dv-lacos-texte']
    t['dv-quem-fotos'] = dv_tiles(fotos(d, 'quem', 3))
    t['dv-quem-texte'] = ['<h2 class="h2--sm">%s</h2>' % titre(champ(d, 'quem', 'titulo'))]
    t['dv-respiracao-foto'] = dv_panel(fotos(d, 'respiracao', 1))
    t['dv-autorretrato-fotos'] = dv_tiles(fotos(d, 'autorretrato', 2))

    prest = champ(d, 'prestacoes')
    dv_p = []
    for i, p in enumerate(prest):
        if i:
            dv_p.append('')
        dv_p += [
            '<div class="prestacao fi">',
            '  <h2 class="h2--sm">%s</h2>' % inline(champ(d, 'prestacoes', i, 'titulo')),
            '  <p class="lede">%s</p>'
            % inline(' '.join(sum(blocs(champ(d, 'prestacoes', i, 'texto')), []))),
            '</div>',
        ]
    t['dv-prestacoes'] = dv_p

    t['dv-hoteis-foto'] = dv_panel(fotos(d, 'hoteis', 1))
    t['dv-hoteis-texte'] = (
        ['<h2>%s</h2>' % titre(champ(d, 'hoteis', 'titulo'))]
        + [l.replace('<p class="lede">', '<p class="lede" style="margin-top:1.6rem">', 1)
           if i == 0 else l
           for i, l in enumerate(dv_texte(champ(d, 'hoteis', 'texto'), 'lede'))])
    t['dv-contato-foto'] = dv_panel(fotos(d, 'contato', 1))
    t['dv-contato-texte'] = ['<h2>%s</h2>' % titre(champ(d, 'contato', 'titulo'))]

    # téléphone
    t['mv-abertura-linha'] = [
        '<p class="open__line" data-type="%s"></p>' % attr(champ(d, 'abertura', 'linha'))]
    t['mv-nome'] = mv_chapitre(
        d, 'nome', '01', 'o nome',
        apres=['<p class="mmet rv">%s</p>' % inline(champ(d, 'nome', 'metier'))])
    t['mv-memoria'] = mv_chapitre(d, 'memoria', '02', 'a memória')
    t['mv-memoria-serie'] = mv_suite(d, 'memoria')
    t['mv-cada'] = mv_chapitre(d, 'cada_pessoa', '03', 'cada pessoa')
    t['mv-cada-serie'] = mv_suite(d, 'cada_pessoa')
    t['mv-olhar'] = mv_chapitre(d, 'olhar', '04', 'o olhar')
    t['mv-olhar-serie'] = mv_suite(d, 'olhar')
    t['mv-lacos'] = mv_chapitre(d, 'lacos', '05', 'os laços')
    t['mv-lacos-serie'] = mv_suite(d, 'lacos')
    t['mv-quem'] = mv_chapitre(
        d, 'quem', '06', 'quem a gente é',
        apres=['<p class="rv"><a href="/portfolio.html" class="mcta">Ver o portfólio <i>&#8594;</i></a></p>'])
    t['mv-quem-serie'] = mv_suite(d, 'quem')

    tir = champ(d, 'album', 'tirages')
    t['mv-album'] = [
        '<figure class="tirage tirage--%s" style="--r:%s"><picture>%s<img src="%s" alt="%s" loading="lazy"></picture></figure>'
        % ('v' if f.get('sens') == 'v' else 'h', TILTS[i % len(TILTS)], MV_SRC,
           src(champ(d, 'album', 'tirages', i, 'foto')), attr(f.get('alt', '')))
        for i, f in enumerate(tir)]

    mv_p = []
    for i, p in enumerate(prest):
        if i:
            mv_p.append('')
        mv_p += [
            '<details class="prest rv">',
            '  <summary><span>%s</span><i aria-hidden="true"></i></summary>' % inline(p['titulo']),
            '  <p>%s</p>' % inline(' '.join(sum(blocs(p['texto']), []))),
            '</details>',
        ]
    t['mv-prestacoes'] = mv_p

    t['mv-hoteis'] = mv_chapitre(
        d, 'hoteis', '08', 'hotéis',
        apres=['<p class="rv"><a href="/lugares/" class="mcta">Ver o trabalho para hotéis <i>&#8594;</i></a></p>'])
    t['mv-contato'] = mv_chapitre(
        d, 'contato', '09', 'contato', extra_cls=' ch--last',
        apres=['<p class="rv"><a href="https://wa.me/5571993554883" class="mbtn mbtn--cream" target="_blank" rel="noopener">Falar comigo</a></p>'])
    return t


def main():
    try:
        with io.open(DATA, encoding='utf-8') as f:
            data = json.load(f)
        contenu = blocs_page(data)
    except (ValueError, Manque) as e:
        sys.exit('accueil.json : %s — index.html n\'a pas été touché.' % e)

    with io.open(PAGE, encoding='utf-8', newline='') as f:
        page = f.read()
    nl = '\r\n' if '\r\n' in page else '\n'

    vus = set()

    def remplace(m):
        nom = m.group('name')
        if nom not in contenu:
            sys.exit('index.html : balise cms:%s inconnue du script.' % nom)
        vus.add(nom)
        pad = m.group('pad')
        corps = ''.join((pad + l if l else '') + nl for l in contenu[nom])
        return m.group('open') + corps + m.group('close')

    neuf = BLOCK.sub(remplace, page)
    absents = sorted(set(contenu) - vus)
    if absents:
        sys.exit('index.html : balises introuvables : ' + ', '.join(absents))

    if neuf != page:
        with io.open(PAGE, 'w', encoding='utf-8', newline='') as f:
            f.write(neuf)
        print('index.html mis à jour depuis accueil.json.')
    else:
        print('index.html déjà à jour.')


if __name__ == '__main__':
    main()
