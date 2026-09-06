#!/usr/bin/env python3
"""La barre de navigation et le pied de page vivent dans `partials/`.

Le site a deux branches qui ne partagent plus ni menu ni rodapé :

    partials/nav-pessoas.html     casamentos, ensaios, eventos  (veralem)
    partials/nav-lugares.html     hotéis, pousadas, imóveis     (Ivoire & Bronze)
    partials/nav-home.html        l'en-tête propre à la page d'accueil
    partials/footer-*.html        les rodapés correspondants

Chaque page déclare ce qu'elle veut entre deux balises :

    <!-- partial:nav-lugares -->
      ...ce que le script écrit...
    <!-- /partial:nav-lugares -->

Pour changer un menu, on touche au fichier de `partials/`, puis :

    python tools/build_partials.py

À lancer depuis la racine du site. Le script réécrit le contenu entre les
balises et rien d'autre — le reste de la page est laissé intact.

Le sélecteur de langue est reconstruit pour chaque page à partir de son nom
de fichier (`en/<page>`, `fr/<page>`) ; une langue dont le fichier n'existe
pas est simplement omise, et une page qui n'existe qu'en portugais n'affiche
pas de sélecteur du tout — un bouton « PT » seul ne veut rien dire.

La branche lugares a changé d'adresse mais pas ses traductions : ses pages
déclarent donc où elles pointent, dans la balise même :

    <!-- partial:nav-lugares en="/en/hoteis.html" fr="/fr/hoteis.html" -->

Les dossiers `en/` et `fr/` ne sont pas traités : ils suivent encore
l'ancienne structure et seront refaits depuis le portugais.
"""

import io
import os
import re
import sys

PARTIALS = 'partials'
LANGS = (('en', 'EN'), ('fr', 'FR'))

# Le bloc à écrire là où le partial pose {{LANG}} (barre) ou
# {{LANG_MOBILE}} (menu déroulant) : l'enveloppe est comprise, pour
# qu'une page sans traduction n'en laisse pas une vide derrière elle.
LANG_SELF = '<a href="/%s" class="nav__lang-link nav__lang-link--active">PT</a>'
LANG_OTHER = '<a href="%s" class="nav__lang-link">%s</a>'
LANG_WRAP = {'LANG': 'nav__lang', 'LANG_MOBILE': 'nav__mobile-lang'}

BLOCK = re.compile(
    r'(?P<open>[ \t]*<!-- partial:(?P<name>[a-z0-9-]+)'
    r'(?P<attrs>(?:\s+[a-z]+="[^"]*")*)\s*-->[ \t]*\n)'
    r'.*?'
    r'(?P<close>[ \t]*<!-- /partial:(?P=name) -->)',
    re.S,
)
ATTR = re.compile(r'([a-z]+)="([^"]*)"')
PLACEHOLDER = re.compile(
    r'^(?P<pad>[ \t]*)\{\{(?P<slot>LANG|LANG_MOBILE)\}\}[ \t]*\n', re.M
)


def pages():
    """Les pages portugaises : la racine, et la branche lugares."""
    trouvees = [n for n in os.listdir('.')
                if n.endswith('.html') and os.path.isfile(n)]
    if os.path.isdir('lugares'):
        trouvees += ['lugares/' + n for n in os.listdir('lugares')
                     if n.endswith('.html')]
    return sorted(trouvees)


def lang_block(page, pad, slot, forces=None):
    """Le sélecteur de langue d'une page, indenté comme le placeholder.

    Rien du tout si la page n'existe qu'en portugais. Une adresse passée
    dans la balise (en="…", fr="…") l'emporte sur celle qu'on déduit.
    """
    forces = forces or {}
    others = []
    for folder, label in LANGS:
        impose = forces.get(folder)
        if impose:
            others.append((impose, label))
            continue
        cible = '%s/%s' % (folder, page)
        if os.path.isfile(cible):
            others.append(('/' + cible, label))
    if not others:
        return ''

    lines = ['<div class="%s">' % LANG_WRAP[slot], '  ' + LANG_SELF % page]
    lines += ['  ' + LANG_OTHER % pair for pair in others]
    lines.append('</div>')
    return '\n'.join(pad + line for line in lines) + '\n'


def read_partial(name, page, forces=None):
    path = os.path.join(PARTIALS, name + '.html')
    if not os.path.isfile(path):
        return None
    with io.open(path, encoding='utf-8') as fh:
        body = fh.read().rstrip('\n')
    return PLACEHOLDER.sub(
        lambda m: lang_block(page, m.group('pad'), m.group('slot'), forces),
        body,
    )


def main():
    if not os.path.isdir(PARTIALS):
        sys.exit('dossier partials/ introuvable — lance le script depuis la racine du site.')

    missing = []
    for page in pages():
        with io.open(page, encoding='utf-8') as fh:
            html = fh.read()

        names = []

        def fill(match):
            name = match.group('name')
            forces = dict(ATTR.findall(match.group('attrs') or ''))
            body = read_partial(name, page, forces)
            if body is None:
                missing.append((page, name))
                return match.group(0)
            names.append(name)
            return match.group('open') + body + '\n' + match.group('close')

        new = BLOCK.sub(fill, html)
        if not names:
            print('  %-24s pas de partial' % page)
            continue
        if new != html:
            with io.open(page, 'w', encoding='utf-8') as fh:
                fh.write(new)
            print('  %-24s %s' % (page, ', '.join(names)))
        else:
            print('  %-24s déjà à jour (%s)' % (page, ', '.join(names)))

    for page, name in missing:
        print('  !! partial introuvable : %s demandé par %s' % (name, page))
    if missing:
        sys.exit(1)


if __name__ == '__main__':
    main()
