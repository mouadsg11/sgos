# Crédits et licences des données

Le **code** de SGOS est sous licence MIT (voir [LICENSE](LICENSE)).
Les données et images ci-dessous gardent **leur propre licence**.

## Table nutritionnelle — Ciqual (Anses)

Les valeurs nutritionnelles (3 092 aliments, `source/aliments-ciqual.js`) viennent de :

> Anses. 2020. Table de composition nutritionnelle des aliments Ciqual.
> https://ciqual.anses.fr — **Licence Ouverte / Open Licence (Etalab)**.

La licence Etalab autorise la réutilisation, y compris commerciale, à condition de
**citer la source** (mention ci-dessus, également affichée en bas de la page Nutrition
de l'application). Les données ont été converties au format JavaScript par
`tools/ciqual.py` ; les valeurs ne sont pas modifiées.

## Idées de repas (`source/idees-repas.js`)

- **Recettes 1 à 30** : sélection issue du classeur « 30 recettes, coût et ingrédients ».
  Les étapes sont reformulées en français simple ; chaque fiche renvoie vers la recette
  d'origine (WeightWatchers, Démotivateur, Santé Canada, CROQ-kilos, etc.).
  Les coûts sont des **estimations** en dirhams marocains.
- **Recettes 31 à 50** : recettes écrites pour SGOS (libres de droits).
- **Photos** : le crédit de chaque photo est affiché sur la fiche de la recette.
  - Photos issues de **Wikimedia Commons** (licences libres de type Creative Commons ;
    le nom du fichier est indiqué dans l'application, la page d'origine donne l'auteur
    et la licence exacte : https://commons.wikimedia.org).
  - Une partie des photos des recettes 1 à 30 provient des sites cités ci-dessus
    (images de présentation des recettes). **Elles restent la propriété de leurs
    auteurs** : si vous êtes l'un d'eux et souhaitez le retrait d'une image, ouvrez une
    « issue » sur le dépôt, elle sera retirée.

## Services en ligne (facultatifs)

- **Horaires de prière** : Aladhan — https://aladhan.com (API publique, sans clé).
- **Météo et recherche de ville** : *Weather data by Open-Meteo.com* — https://open-meteo.com,
  licence Creative Commons Attribution 4.0 (CC BY 4.0). L'attribution est aussi affichée dans
  SGOS › Paramètres › Météo.

## Composants intégrés

- **Moteur d'affichage** (`source/support.js`, `source/SGOS-export-base.html`) : issu de
  Claude Design (Anthropic) ; inclut React.
- **Police Inter** (SIL Open Font License), intégrée à la page.
- **Tauri** (MIT / Apache-2.0), **@modelcontextprotocol/sdk** (MIT), **zod** (MIT).

## Police du rapport hebdomadaire — Computer Modern Unicode

Le rapport PDF (Bilans › Rapport de la semaine) utilise la police **CMU Serif**
(`source/fonts/cmu-serif-*.woff2`), d'après Computer Modern de Donald E. Knuth,
paquet npm `computer-modern` 0.1.3. **SIL Open Font License 1.1** : texte complet
dans `source/fonts/OFL-cmu.txt`.
