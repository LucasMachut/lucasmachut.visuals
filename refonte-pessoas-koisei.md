# Refonte pessoas : Koisei avec mon identité

Proposition du 31.10.2026, à valider avant toute construction. Concerne uniquement pessoas (`/`, Trabalhos, Contato, séries). Lugares ne bouge pas.

## Décisions prises

| Sujet | Koisei d'origine | Ce qu'on garde / remplace |
|---|---|---|
| Titres | Cormorant Garamond | **Special Elite**, avec les tailles, interlignes et révélations Koisei. Ma règle « pas de Cormorant » est respectée |
| Corps | Space Grotesk | **Newsreader** pour la lecture, Space Grotesk pour les petits labels UI (nav, eyebrows) |
| Fond clair | washi `#F1E9DE` | **lin `#F0E8DC`** |
| Fond nuit / texte | night `#241B15`, ink `#251C16` | **brun terre `#2E2620`** |
| Accent | vermillon `#C4472F` | **terracotta `#B5623C`**, aux mêmes endroits (carrés d'eyebrow, soulignement des liens, bouton) |
| Couleur secondaire | sakura `#E8B4C0` | **rose poussière `#C98E7A`** |
| Logo / torii | torii + KOISEI | **LUCAS MACHUT** en Special Elite, montée lettre par lettre |
| Texte vertical japonais | 桜の川を下る | lieu et date en portugais, ex. `ITAÚNAS · 2026` |
| Pétales WebGL | sakura qui tombent | **grain / poussière rosée** qui flotte sur le hero |
| Chiffres romains | chapitres | gardés : I, II, III |
| Grain, papier, vignette | film grain, washi | gardés : c'est déjà ma texture signature |
| Preloader | oui | **gardé** |
| Curseur perso, scroll lissé, rail | oui | **retirés** |
| Lien vers lugares | – | un seul lien discret en pied de page, `Lugares →` |

## L'accueil, section par section

0. **Preloader** : LUCAS MACHUT qui monte, filet terracotta, pourcentage.
1. **Hero** : une photo plein cadre avec grain, le nom, une sous-ligne (`fotógrafo e filmmaker · Rio de Janeiro`), le texte vertical lieu · date, la poussière qui flotte.
2. **Manifeste** (révélation ligne par ligne) : *Guardar vivo o que passa.* et quelques lignes sur le lien, l'éphémère, jamais la pose.
3. **Lede** : qui je suis en un paragraphe (le voyage, la LSF, l'écoute). Bloc chiffres : **point ouvert**, voir plus bas.
4. **Stations** (défilement horizontal, I à IV) : Casamentos e elopements · Festivais e eventos · Ensaios e retratos · Retiros e viagens.
5. **Scroll film I, dia** : emplacement vidéo, tu choisis le fichier.
6. **Scroll film II, noite** : emplacement vidéo, le fond passe au brun terre.
7. **Trabalhos** : les séries en défilement (Arpoador, Itaúnas…), lien vers la page Trabalhos.
8. **Contato** : grand titre + disque « Começar » (le Begin disc Koisei).
9. **Pied de page** : Instagram `@lucasmachut__`, `@forro.films`, Contato, `Lugares →`.

Le titre actuel « Casamentos, retiros, hotéis » et le chapitre hôtels disparaissent.

## Les autres pages

- **Trabalhos** : grille de séries en cadres Koisei (plate frame), une carte par série.
- **Série** (gabarit, Arpoador en premier) : hero de la série, lede, un scroll film, puis les photos en plaques.
- **Contato** : feuille papier (washi sheet) avec le formulaire, en portugais.

## Technique

- **Astro** : chaque page sort en vrai HTML (Google et aperçus WhatsApp/Instagram la lisent).
- **Composants React** pour tout ce qui bouge (preloader, hero, manifeste, stations, scroll films), transposés d'après le code Koisei, avec GSAP ScrollTrigger.
- **Contenu dans `data/pessoas/*.json`** : textes, photos, ordre des blocs, offres, vidéos, séries.
- **Admin en React** sur `/admin` : modifier textes et photos d'un bloc, réordonner par cliquer-glisser, ajouter une série, changer les offres et les vidéos. Il enregistre dans les JSON via GitHub, comme aujourd'hui.
- **Publication** : la GitHub Action existante construit le site, Hostinger le récupère.
- **Lugares** et ses pages restent en HTML tels quels, servis à côté. EN/FR de pessoas viendront après, depuis les mêmes JSON.

## Points ouverts

1. **Bloc chiffres** (les compteurs Koisei) : ma proposition est des chiffres intimes et vrais (`1 ano rodando o Brasil`, `0 pose`…), que tu valides un par un. Sinon on le retire.
2. **Vidéos des deux films** et **photo du hero** : à désigner.
3. **Textes en portugais** : je les écris à partir de `veralem-pratique-photo.md`, tu relis.
4. **Mariage** : présenté comme une offre, sans prétendre à une expérience que tu n'as pas encore.
5. **Hostinger** : vérifier comment le cron récupère le dépôt, pour savoir où l'Action dépose le site construit.

## Ordre de construction proposé

1. Squelette Astro, tokens (couleurs, typo), lugares servi intact
2. Accueil complet
3. Trabalhos + gabarit série (Arpoador)
4. Contato
5. Admin React
6. Publication par l'Action

Chaque étape vérifiée sur ordinateur et sur téléphone avant de passer à la suivante.
