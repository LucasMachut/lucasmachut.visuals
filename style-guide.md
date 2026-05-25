# Lucas Machut Visuals — Guide de style

Document de référence pour produire des PDF (propositions, audits Regard, devis, présentations) cohérents avec lucasmachut.com.

L'identité visuelle est volontairement **sobre**, **éditoriale**, **photographique**. Les photos respirent, les blocs typographiques sont aérés, l'italique bronze sert exclusivement à signaler un mot-clé.

---

## 1. Palette — Ivoire & Bronze

| Rôle | Hex | RGB | CMYK approx. | Usage |
|---|---|---|---|---|
| `--bg` Ivoire | `#FAF6EC` | 250, 246, 236 | 0 / 2 / 6 / 2 | Fond principal de toutes les pages claires |
| `--bg-alt` Bronze doux | `#E7D9B8` | 231, 217, 184 | 0 / 6 / 20 / 9 | Bandeau de contraste doux, cards, sections alt |
| `--accent` Bronze | `#B08D4E` | 176, 141, 78 | 0 / 20 / 55 / 31 | Mots-clés, accents, liens, boutons hover, traits |
| `--ink-soft` Brun foncé | `#5A3E22` | 90, 62, 34 | 0 / 31 / 62 / 65 | Texte secondaire, légendes, captions |
| `--ink` Noir chaud | `#1F1812` | 31, 24, 18 | 0 / 23 / 42 / 88 | Texte principal, sections sombres, footer |

**Règles** :
- Sur fond clair `#FAF6EC` : texte `#1F1812` par défaut. Texte long ou secondaire : `#5A3E22`.
- Sur fond sombre `#1F1812` : texte `#FAF6EC`. Texte secondaire : `rgba(250, 246, 236, 0.85)`.
- Bronze `#B08D4E` : **uniquement pour mots-clés en italique, accents décoratifs, traits, boutons hover**. **Jamais pour du corps de texte** (contraste insuffisant — 2.88:1 sur ivoire).
- Filets et séparateurs : `rgba(31, 24, 18, 0.12)` sur fond clair, `rgba(250, 246, 236, 0.12)` sur fond sombre.

---

## 2. Typographie

Deux polices uniquement. Disponibles gratuitement sur Google Fonts et en version desktop.

### Newsreader (serif, italique vivant)
- **Variable** sur `opsz` (6 à 72), poids 300 à 600, italiques disponibles.
- Pour **tous les titres** (h1, h2, h3, h4) et les **mots-clés en italique**.

### Inter Tight (sans-serif, lisible)
- Poids 300, 400, 500, 600.
- Pour **tout le corps de texte**, la nav, les boutons, les labels UI.

### Hiérarchie

| Élément | Police | Poids | Taille (PDF A4) | Casse / commentaires |
|---|---|---|---|---|
| Titre principal couverture | Newsreader | 400 normal | 48–64 pt | Sans casse particulière |
| Section h2 | Newsreader | 400 normal | 28–36 pt | Sans italique sur le titre entier |
| Sous-section h3 | Newsreader | 400 normal | 18–22 pt | |
| Label / eyebrow | Inter Tight | 500 | 9–10 pt | **MAJUSCULES**, letter-spacing 0.22 em, couleur `--ink-soft` |
| Corps de texte | Inter Tight | 300 | 10–11 pt | line-height 1.75 ; couleur `--ink` ou `--ink-soft` |
| Légende / caption | Inter Tight | 400 | 8–9 pt | italique optionnel, couleur `--ink-soft` |
| Numéro décoratif | Newsreader italique | 300–400 | variable | Pour indices `01`, `02`, etc. |

**Réglages serif** :
- Newsreader sur les titres : `letter-spacing: -0.015 em`, `line-height: 1.12`.
- Sur très grands titres (≥48 pt) : `letter-spacing: -0.02 em`, `font-variation-settings: 'opsz' 72` si l'outil le permet.

**Réglages sans-serif** :
- Corps : `line-height: 1.75`.
- Labels en majuscules : `letter-spacing: 0.22 em`.

---

## 3. Convention éditoriale — emphase

**Règle d'or** : pour signaler un mot ou une expression-clé, on l'écrit en **italique bronze** (`#B08D4E`).

Exemples :
- « Photographie pour les hôtels qui veulent montrer leur *atmosphère*. »
- « Une *lecture visuelle* avant la production. »
- « Votre lieu peut être *le prochain*. »

**Volume** : 1 à 3 emphases par bloc de texte maximum. Un texte sans emphase est préférable à un texte qui en abuse.

**Ne PAS** :
- Mettre tout un titre en italique. L'italique souligne un mot, pas un bloc.
- Mettre des emphases en gras + bronze (le gras est réservé aux poids 500/600 sur labels et CTA).
- Utiliser le bronze sur un mot non italique (perd la cohérence avec le site).

---

## 4. Spacing — échelle modulaire

Système de 4 px, multiples de 8 :

| Token | Valeur | Usage |
|---|---|---|
| 8 px | gap entre éléments très liés (icône + label) |
| 16 px | espace intra-paragraphe |
| 24 px | inter-paragraphe |
| 32 px | inter-section secondaire |
| 48 px | inter-section principale |
| 64 px | marge respiratoire |
| 96 px | bandeau / hero |
| 128 px+ | espaces généreux sur couverture, intercalaire |

Le site utilise des marges généreuses. Sur PDF A4, prévoir au minimum **20 mm** de marge intérieure / extérieure. Pour un PDF présentation 16:9, **30 mm**.

---

## 5. Photographie

L'image **prime** sur le texte. Hiérarchie d'une page type :

1. **Photo pleine page ou large bandeau** en couverture.
2. **Bloc texte** sur fond ivoire, avec une emphase bronze maximum.
3. **Filet bronze fin** (0.5 pt, `#B08D4E`) comme séparation discrète optionnelle.
4. **Pied de page** sobre : nom + URL en `--ink-soft`, taille 8 pt.

**Choix photo** :
- Privilégier le calme, la lumière naturelle, les gestes vivants.
- Éviter les images trop saturées ou trop graphiques (incompatibles avec le ton sobre).
- Les portraits préférés ont une dominante chaude (chair, terre, sable) qui rentre en dialogue avec le bronze.

**Crop** : laisser respirer le sujet. Ne pas centrer agressivement. Préférer le tiers / hors-cadre.

---

## 6. Layout / grille

- **Marges** A4 portrait : 20 mm minimum, 30 mm idéal pour les couvertures.
- **Largeur de bloc texte** : 60 à 80 caractères par ligne max (≈ 110 mm sur A4 en Inter Tight 10 pt).
- **Colonnes** : préférer 1 colonne large pour le narratif, ou 2 colonnes asymétriques (1fr / 2fr) pour mélanger métadonnées et corps.

---

## 7. Éléments spécifiques

### Couverture type (proposition / audit)

```
[Label en haut à gauche]
NOM DU CLIENT — DATE

[Titre principal Newsreader 48–64 pt]
Audit visuel
de [Nom du lieu]

[Sous-titre italique bronze optionnel, Newsreader 18 pt]
*lecture visuelle avant production*

[Photo pleine largeur en bas de couverture]
```

### Page de section

```
[Label en haut, Inter Tight MAJUSCULES 9 pt #5A3E22]
SECTION 02 — POSITIONNEMENT

[Titre h2 Newsreader 32 pt #1F1812]
Ce que votre lieu communique
*aujourd'hui*

[Corps Inter Tight 10 pt, line-height 1.75, #1F1812]
Texte du paragraphe…
```

### Bouton / lien d'action

- Texte en Inter Tight 9–10 pt, `letter-spacing: 0.14 em`, **MAJUSCULES**.
- Fond `--ink` (`#1F1812`), texte `--bg` (`#FAF6EC`).
- Bordure 1 pt même couleur que le fond.
- Padding 0.88 rem (≈ 12 pt) vertical, 2.2 rem (≈ 32 pt) horizontal.

---

## 8. Logo

- Fichier source web : `photos/Logo blanc casse.png` (logo blanc cassé sur fond sombre).
- Sur fond clair PDF : version sombre `#1F1812` à exporter, ou texte « Lucas Machut » composé en Newsreader 400 + « VISUALS » en Inter Tight 500 majuscules letter-spacing 0.22 em juste en dessous.
- Taille minimum lisible : 24 mm de large sur A4.

---

## 9. Ton de voix (rappel)

- Phrases courtes, claires. Pas de jargon.
- Vouvoyer le client.
- Le « je » de Lucas est francophone, basé au Brésil, photographe pour l'hôtellerie. Sa promesse est de **traduire l'atmosphère d'un lieu**, pas d'illustrer des espaces.
- Quelques mots-récurrents à utiliser comme ancrages éditoriaux (et à mettre en *bronze italique* avec parcimonie) :
  *atmosphère*, *perception*, *regard*, *lecture visuelle*, *expérience*, *ressentir avant l'arrivée*, *choisi*, *cohérence*.

---

## 10. À éviter

- ❌ Mélanger plus de deux polices.
- ❌ Utiliser le bronze pour du corps de texte (illisible).
- ❌ Italique appliqué à un titre entier (l'italique signale un mot, pas un bloc).
- ❌ Couleurs vives saturées (rouge, bleu vif). La palette reste dans les tons terre / ivoire.
- ❌ Photos sur-traitées, HDR, ou avec filtres trop marqués.
- ❌ Centrage forcé du texte sur de longs paragraphes (préférer fer à gauche).
- ❌ Bullet points classiques (•). Préférer des tirets fins `—` ou rien.

---

## 11. Référence rapide pour Claude Design

Quand on demande un PDF :

> Utilise la palette Ivoire & Bronze :
> - Fond `#FAF6EC`
> - Texte principal `#1F1812`
> - Texte secondaire `#5A3E22`
> - Bronze accent `#B08D4E` (uniquement sur mots-clés italiques)
>
> Typographie : **Newsreader** pour les titres (poids 400 normal, italique seulement sur les mots-clés en bronze) + **Inter Tight** pour le corps (poids 300, line-height 1.75).
>
> Ton sobre, éditorial, photographique. Marges généreuses, blocs aérés, 1 à 3 emphases italiques bronze par page max. Pas de gras au-delà des labels MAJUSCULES.
