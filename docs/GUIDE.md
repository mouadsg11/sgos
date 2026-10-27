# Guide d'utilisation de SGOS

## Utiliser SGOS au quotidien

- **Créer une carte** : titre, **catégorie** (Religion, Stage, Sport, Vie quotidienne, Permis,
  Autre — la couleur suit, et l'étiquette du même nom est ajoutée), **durée** (5 min à 2 h, ou
  « Autre » : `6h15`, `1:30`, `45`).
- **Placer une carte**, au choix : la glisser sur l'heure ; bouton **Planifier** (heure proposée :
  le premier créneau libre) ; ou **cliquer sur un créneau vide** de la grille pour créer et placer
  d'un coup. Bouton **Ajouter une tâche** en haut de la journée.
- **Au survol d'une carte** : Fait · Modifier · Dupliquer · Supprimer (deux clics pour confirmer, puis
  **Annuler** possible pendant 5 s) ;
  tirer le bord du bas change la durée ; « … » pour les autres actions.
- **Clavier** : Tab jusqu'à une carte, puis ↑/↓ déplace de 5 min (Maj : 30 min), Alt+↑/↓ change la
  durée, Entrée ouvre, Espace coche ; sur une carte en attente, Entrée ouvre « Planifier » ; Échap
  ferme les fenêtres.
- **Épinglé** (ex-« Toujours ici ») : la carte reste dans la liste quand on la place (une copie
  est posée) — idéal pour une tâche récurrente.
- **Journée** : début réglable (04:00 par défaut ; la nuit est repliée et se déplie d'un clic),
  heures passées atténuées, heure actuelle mise en avant, résumé « Planifié · Libre · Réalisé ».
- **Jour / Semaine** : la semaine montre les 7 jours ; un clic ouvre le jour ou la carte.
- **Hier · Aujourd'hui · Demain**, flèches ‹ ›, ou clic sur la date pour le calendrier.
- **Zoom** pour les cartes courtes ; **Arrière-plan** au choix.
- En haut à droite : **Enregistré à l'instant / Enregistrement… / Erreur** (pastille verte, bleue
  ou rouge).
- Sur téléphone (version web) : le bouton ☰ ouvre les cartes en attente.

## Nutrition

Onglet **Nutrition** : pour un sportif, avec la table officielle **Ciqual** (Anses) intégrée —
3 092 aliments, hors ligne, valeurs pour 100 g.

- **Repas du jour** : créez un repas (ou depuis une carte « Petit déjeuner », « Déjeuner »… :
  ouvrez la carte → *Saisir le repas de cette carte*), puis *+ Ajouter des aliments* :
  cherchez l'aliment, indiquez les grammes — calories, protéines, glucides et lipides sont
  calculés tout seuls. Les grammes restent modifiables directement dans le repas. Pour les
  céréales, pâtes, viandes et poissons, la recherche montre d'abord la version **cuite** (tapez
  « cru » pour la version crue).
- **Hors base** : ce qui n'est pas dans la table (msemen, harira, whey…) se saisit à la main
  avec ses calories et, si vous les connaissez, ses macros.
- **Prix du repas** : saisissez le prix exact et le domaine (ex. « nutrition ») : il est compté
  directement dans l'onglet **Argent** comme une dépense.
- **Recettes** : ingrédients en grammes + méthode + nombre de portions ; les apports par portion
  sont calculés, et une recette s'ajoute à un repas en un clic.
- **Eau**, **objectifs** (poids, calories, protéines en g/kg, eau) et suivi du jour.
- **Bilans** : calories du jour, moyennes de la semaine et du mois, budget repas.

### Idées de repas

Dans Nutrition, l'onglet **Idées de repas** propose **50 recettes** avec photo, ingrédients,
étapes, prix estimé en dirhams et niveau healthy (Très healthy → Pas healthy).

- **« Tirer un repas au hasard »** : une suggestion, qui respecte vos filtres.
- **Recherche** : par ingrédient (`poulet, riz`), par **budget** (`30 DH` : les repas à ce prix
  ou un peu au-dessus), par niveau healthy ; tri par prix, temps ou niveau.
- **Nombre de personnes** : quantités et prix recalculés.
- **Dans la fiche** : cochez les ingrédients déjà à la maison (le « reste à acheter » se
  recalcule), copiez la liste de courses, cochez les étapes, puis **ajoutez le plat à vos repas
  du jour** (son prix est compté dans Argent).

Les repères (lipides 30 % des calories, glucides = le reste) sont indicatifs ; pour un
programme précis, voyez un nutritionniste.

Source des valeurs : Anses. 2020. Table de composition nutritionnelle des aliments Ciqual
(ciqual.anses.fr), Licence Ouverte Etalab. `python tools/ciqual.py` régénère
`source/aliments-ciqual.js` depuis la table officielle.

## Bilans : rapport de la semaine et historique

- **Rapport de la semaine** : à la fin de chaque semaine (dès le dimanche 18 h), un bandeau en
  haut de **Bilans** propose le rapport de la semaine. Il est mis en page comme un document
  LaTeX (police Computer Modern, sections numérotées, tableaux) : note jour par jour avec un
  graphique, répartition du temps par catégorie et domaine, ponctualité et cartes non tenues,
  sport, nutrition, dépenses, puis **points forts** et **pistes pour la semaine prochaine**.
  *Imprimer en PDF* ouvre la fenêtre d'impression : choisissez « Enregistrer au format PDF »
  (ou « Microsoft Print to PDF »). Le sélecteur **Semaine** permet d'imprimer n'importe quelle
  semaine passée.
- **Fichier LaTeX (.tex)** : la source du même rapport, à compiler avec `pdflatex` ou sur
  Overleaf. Le programme Windows l'enregistre dans `Documents\SGOS\rapports`.
- **Effacer l'historique** (en bas de Bilans) : choisissez « Plus ancien que… » (1 semaine →
  1 an, ou tout) ou une **période précise** (du … au …), et ce qu'il faut effacer (emploi du
  temps, nutrition). SGOS affiche ce qui sera supprimé, demande une confirmation, et propose
  **Annuler** pendant 8 secondes. Catégories, domaines, recettes et réglages sont conservés.
  Dans le programme Windows, une case permet de supprimer aussi les copies automatiques des
  jours précédents (`Documents\SGOS\historique`), qui contiennent encore ces données.

## Les données ne se perdent pas — le « Coffre »

**Programme Windows** : tout est **enregistré automatiquement** à chaque ajout ou
modification, sans rien faire, dans `Documents\SGOS\SGOS-donnees.json`, avec une copie
par jour dans `Documents\SGOS\historique` (120 derniers jours). La barre DONNÉES affiche
l'heure du dernier enregistrement. Si le programme est réinstallé ou que ses données
internes disparaissent, il relit ce fichier au démarrage.

**Version navigateur / téléphone** :

En bas de la colonne de gauche : la barre **DONNÉES**. Chaque modification est gardée
à trois endroits :

1. le stockage du navigateur ;
2. une **copie de secours interne** (restaurée automatiquement si le premier est vidé) ;
3. un **fichier sur votre disque** — à relier une seule fois :
   *Données → Créer le fichier de données…* → enregistrez `SGOS-donnees.json`
   (par exemple dans Documents). Il est ensuite mis à jour à chaque modification.

À chaque ouverture, SGOS reprend la version la plus récente des trois. Si le
navigateur a tout effacé, il suffit de cliquer « Reconnecter le fichier » : tout
revient. Pour ne plus avoir à confirmer, choisissez « Autoriser à chaque visite »
(dans le programme Windows, l'accès au fichier est demandé au plus une fois par
ouverture).

- **Changer de PC ou de navigateur** : *Ouvrir un fichier existant…* et choisissez
  votre `SGOS-donnees.json` (copié par clé USB, Google Drive, OneDrive…).
- **Copie ponctuelle** : *Exporter une copie* / *Importer une copie…* (tous navigateurs).
- Le fichier disque marche dans le programme Windows, Chrome et Edge. Sur téléphone, Firefox,
  Safari ou Brave : copie de secours interne + *Exporter une copie* de temps en temps.

Chaque ami a son propre coffre : rien n'est partagé entre appareils.

## À savoir

- Les documents joints à une carte sont gardés par **nom et taille** seulement.
- Glisser-déposer à la **souris** (le tactile n'est pas encore pris en charge : sur
  téléphone, l'application s'ouvre et se consulte, mais placer une carte sur l'heure
  demande une souris).
- Le module Équipe est **local** : rien n'est envoyé entre appareils.
- Le bouton **Arrière-plan** est en haut de la colonne « Journée · 24 h ».
