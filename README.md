# SGOS — My Personal Operating System

> Ton agenda, ton carnet de nutrition, ton budget et ton suivi sportif réunis dans une seule
> application. **Aucun compte, aucun serveur : tes données restent sur ton appareil.**

<!-- Remplacez soughoumouad1 par votre nom d'utilisateur GitHub dans ce fichier. -->
[![Dernière version](https://img.shields.io/github/v/release/mouadsg11/sgos?label=version)](https://github.com/mouadsg11/sgos/releases/latest)
[![Vérification](https://github.com/mouadsg11/sgos/actions/workflows/verif.yml/badge.svg)](https://github.com/mouadsg11/sgos/actions/workflows/verif.yml)
[![Licence MIT](https://img.shields.io/badge/licence-MIT-blue.svg)](LICENSE)

## Captures d'écran

<!-- Ajoutez vos captures dans docs/captures/ puis décommentez les lignes ci-dessous. -->
<!--
![Emploi du temps](docs/captures/emploi-du-temps.png)
![Nutrition — suivi du jour](docs/captures/nutrition.png)
![Idées de repas](docs/captures/idees-de-repas.png)
![Fiche recette](docs/captures/fiche-recette.png)
-->

*Captures à venir : emplacement prévu dans [`docs/captures/`](docs/captures/).*

## Fonctionnalités

| Page | Ce qu'elle fait |
|---|---|
| **Emploi du temps** | Journée de 24 h en glisser-déposer, cartes colorées par catégorie, sous-tâches, vue jour / semaine, rappels Windows à l'heure de chaque carte. |
| **Nutrition** | Suivi des calories, protéines, glucides, lipides et de l'eau avec la table officielle **Ciqual** (3 092 aliments, hors ligne) ; recettes personnelles ; **50 idées de repas** avec photo, étapes, coût estimé en dirhams, niveau healthy, repas au hasard, recherche par ingrédient ou par budget, quantités selon le nombre de personnes. |
| **Argent** | Revenu réparti en domaines classés par priorité, dépenses, reste disponible ; le prix des repas de Nutrition y est compté automatiquement. |
| **Sport** | Séances, exercices, séries et charges, dépense calorique estimée, conseils de repas avant et après l'entraînement. |
| **Bilans** | Note de la journée, de la semaine et du mois, répartition du temps par étiquette. |
| **Équipe** | Partage local de l'emploi du temps (propositions, membres). |
| **SG Assistant** | Assistant (texte ou voix) qui organise ta journée, via une IA externe (Gemini ou Groq) avec ta propre clé. |

Et aussi : mode clair / sombre, sauvegarde automatique avec historique de 120 jours,
fonctionnement hors ligne, **application Android** (rappels même application fermée, interface
pensée pour le doigt), rapport PDF hebdomadaire mis en page comme un document LaTeX.

Mode d'emploi détaillé : [docs/GUIDE.md](docs/GUIDE.md).

## Télécharger

| Appareil | Fichier | Où |
|---|---|---|
| **Windows 10 / 11** | `SGOS_…_x64-setup.exe` | [Dernière version (Releases)](https://github.com/mouadsg11/sgos/releases/latest) |
| **Android 7+** | `SGOS.apk` | [Dernière version (Releases)](https://github.com/mouadsg11/sgos/releases/latest) |

## Installer SGOS sur Android

1. Télécharge **`SGOS.apk`** dans la page **Releases** (section *Assets*).
2. Ouvre le fichier. Si le téléphone le demande, autorise *Installer des applications inconnues*
   pour ton navigateur ou ton gestionnaire de fichiers.
3. Si **Play Protect** affiche un avertissement, touche *Installer quand même* : l'application ne vient
   pas du Play Store, c'est normal.
4. Ouvre SGOS et suis le guide de bienvenue.

Dans l'application : **+** pour créer une carte, **appui long** sur une carte pour la déplacer (sur son
bord bas pour changer sa durée), le **cercle** pour la cocher, et la barre du bas *Temps · Cartes · Tâches ·
Stats · Profil*. La cloche 🔔 active les rappels.

## Installer SGOS (utilisateur Windows)

1. Ouvre la page **[Releases](https://github.com/mouadsg11/sgos/releases/latest)**.
2. Dans **Assets**, télécharge **`SGOS_…_x64-setup.exe`**.
3. Double-clique dessus, puis *Installer*. Pas besoin d'être administrateur.
4. SGOS apparaît dans le menu Démarrer (et sur le Bureau).

> **Windows affiche « Windows a protégé votre ordinateur » ?** C'est normal : l'installateur
> n'est pas signé numériquement (un certificat coûte plusieurs centaines d'euros par an).
> Clique sur **Informations complémentaires**, puis **Exécuter quand même**.
> Certains antivirus peuvent aussi le signaler à tort ; le code source est entièrement
> public dans ce dépôt.

- **Windows 10 ou 11.** Le composant d'affichage (WebView2) est déjà présent sur presque tous
  les PC ; sinon l'installateur le télécharge une fois.
- **Mise à jour** : installe la nouvelle version par-dessus l'ancienne, tes données restent.
- **Désinstaller** : *Paramètres → Applications installées → SGOS*.
- **Où sont mes données ?** Dans `Documents\SGOS\SGOS-donnees.json` (avec un historique par
  jour). Tu peux copier ce fichier pour changer de PC.

### Sur téléphone ou dans un navigateur (version web)

Version installable (PWA), hébergée par GitHub Pages :
**https://soughoumouad1.github.io/sgos/**

- **Android (Chrome)** : menu ⋮ → *Installer l'application*.
- **iPhone (Safari)** : Partager → *Sur l'écran d'accueil*.
- **PC (Chrome / Edge)** : icône « Installer » dans la barre d'adresse.

Les données restent sur l'appareil ; chaque appareil a les siennes (voir *Exporter / Importer
une copie* dans l'application). Le fichier `SGOS.html` peut aussi s'ouvrir directement en
double-cliquant dessus.

## Fonctions utilisant internet (facultatives)

SGOS marche entièrement hors ligne. Deux fonctions, **désactivées par défaut**, utilisent internet ;
on les active dans le guide de démarrage ou dans **Paramètres ⚙** (en haut à droite).

| Fonction | Service | Ce qui est envoyé |
|---|---|---|
| Horaires de prière | [Aladhan](https://aladhan.com) (sans clé) | le nom de la ville et le pays (ou les coordonnées si « Me localiser »), la méthode de calcul |
| Météo sur les cartes | [Open-Meteo](https://open-meteo.com) (sans clé) | la latitude et la longitude de la ville |
| Recherche de ville | [Open-Meteo Geocoding](https://open-meteo.com/en/docs/geocoding-api) | le nom tapé |

Rien d'autre ne quitte l'ordinateur (pas de cartes, pas de données personnelles).

- **Prières** : le calendrier du mois est téléchargé une fois et gardé en cache (clé `sgos.cache` du coffre) ;
  hors ligne, la dernière copie est utilisée. Chaque jour, Fajr, Dhuhr, Asr, Maghrib et Isha sont posées
  automatiquement (Jumu'a le vendredi, Tarawih en Ramadan si activé). Une carte que vous modifiez,
  déplacez ou supprimez n'est jamais recréée ni écrasée. Méthode par défaut : 21 (Maroc).
- **Météo** : prévisions horaires sur 7 jours, rafraîchies au plus toutes les 30 minutes. Chaque carte
  posée affiche l'icône, la température et le risque de pluie de son heure de début ; « ! » signale une
  pluie probable (plus de 60 %) pour une activité dehors.
- Dans le programme Windows, la politique de sécurité (CSP) n'autorise les connexions qu'à ces services
  et aux deux services de SG Assistant (Groq, Gemini).

## Configurer SG Assistant (clé API)

SG Assistant fonctionne avec **Gemini** (Google) ou **Groq**. Tu utilises **ta propre clé**,
qui reste sur ton ordinateur (jamais envoyée ailleurs qu'au service choisi).

1. Crée une clé gratuite : Gemini → <https://aistudio.google.com/apikey> · Groq → <https://console.groq.com/keys>.
2. Ouvre SG Assistant dans SGOS une première fois : le fichier `Documents\SGOS\assistant.json`
   est créé.
3. Ouvre-le avec le Bloc-notes et remplis-le :

   ```json
   {
     "fournisseur": "gemini",
     "cle": "COLLE_TA_CLE_ICI",
     "modele": ""
   }
   ```

   `fournisseur` : `gemini` ou `groq` · `modele` : laisse vide pour le modèle par défaut.
4. Dans SGOS, appuie sur **Réessayer**.

⚠️ Ne publie jamais ce fichier : il est exclu du dépôt par le `.gitignore`.

## Pour les développeurs

### Prérequis

| Outil | Version | Sert à |
|---|---|---|
| [Python](https://www.python.org/downloads/) | 3.10+ | `build.py` (assemble la page) |
| [Node.js](https://nodejs.org/) | 20+ | Tauri CLI, Capacitor (Android) |
| [Android Studio](https://developer.android.com/studio) | récent | SDK Android et JDK pour l'APK |
| [Rust](https://rustup.rs/) | stable | compiler le programme Windows |
| Microsoft C++ Build Tools | — | requis par Rust sur Windows (« Desktop development with C++ ») |

### Construire

```bash
# 1. Assembler la page : écrit SGOS.html, app/index.html et desktop/dist/index.html
python build.py

# 2. Compiler le programme Windows (la première fois, ≈ 5 min)
cd desktop
npm ci
npx tauri build
```

L'installateur est créé dans `desktop/src-tauri/target/release/bundle/nsis/SGOS_<version>_x64-setup.exe`.

Pour tester la page dans un navigateur : `python -m http.server 5173 --directory app`, puis
<http://localhost:5173>.

### Structure du projet

```
sgos/
├── build.py                 # assemble source/ → SGOS.html, app/, desktop/dist/
├── SGOS.html                # version « un seul fichier » (générée, versionnée)
├── LICENSE · CREDITS.md     # licence MIT du code · licences des données et images
│
├── source/                  # ★ le code à modifier
│   ├── sgos-page.html       #   toute l'application : styles, modèle HTML, logique
│   ├── SGOS-export-base.html#   enveloppe : moteur d'affichage, React, polices, logo
│   ├── sgos-coffre.js       #   sauvegarde (navigateur, copie interne, fichier disque)
│   ├── sgos-rappels.js      #   notifications à l'heure des cartes
│   ├── sgos-pwa.js          #   installation web
│   ├── aliments-ciqual.js   #   table Ciqual (générée par tools/ciqual.py)
│   ├── idees-repas.js       #   50 recettes avec photos
│   └── support.js, SGOS.dc.html, assets/   # fichiers du moteur (ne pas modifier)
│
├── app/                     # version web installable (générée, publiée sur GitHub Pages)
│   ├── index.html · manifest.webmanifest · sw.js · icons/
│
├── desktop/                 # programme Windows (Tauri 2)
│   ├── src-tauri/src/main.rs       # sauvegarde sur disque, config de l'assistant
│   ├── src-tauri/tauri.conf.json   # nom, version, fenêtre, installateur
│   └── dist/                       # page embarquée (générée, non versionnée)
│
├── mobile/                  # application Android (Capacitor 8)
│   ├── capacitor.config.json       # identifiant, greffons (notifications…)
│   ├── android/                    # projet Android Studio (module natif : impression PDF, fichiers)
│   └── www/                        # page embarquée (générée par build.py, non versionnée)
├── tools/ciqual.py          # régénère source/aliments-ciqual.js
├── docs/                    # guide d'utilisation et captures
└── .github/workflows/       # vérification, publication de l'installateur, GitHub Pages
```

> `source/sgos-page.html` est le seul fichier à éditer pour modifier l'interface. Après
> chaque modification, relance `python build.py`. Les fichiers `SGOS.html` et `app/index.html`
> sont **générés** : ne les modifie pas à la main.

### Régénérer la table Ciqual

Les fichiers XML d'origine de l'Anses (≈ 100 Mo) ne sont pas dans le dépôt. Le script les
retélécharge tout seul depuis <https://ciqual.anses.fr> :

```bash
python tools/ciqual.py
```

### Construire l'APK Android

```bash
python build.py                 # écrit aussi mobile/www/index.html
cd mobile && npm ci && npx cap sync android
cd android && ./gradlew assembleRelease
```

L'APK sort dans `mobile/android/app/build/outputs/apk/release/`. Pour la signer, crée ta propre clé
(`keytool -genkeypair …`) et un fichier `mobile/android/keystore.properties` (jamais publié) ; détails dans
[mobile/LISEZ-MOI.md](mobile/LISEZ-MOI.md). Une clé d'assistant peut être intégrée à l'APK avec un fichier
`mobile/assistant.local.json` (exclu du dépôt).

### Publier une nouvelle version

1. Change le numéro de version dans `desktop/src-tauri/tauri.conf.json` et `Cargo.toml`.
2. `git commit`, puis crée et pousse un tag : `git tag v1.1.0` puis `git push origin v1.1.0`.
3. GitHub Actions compile l'installateur et le publie dans **Releases** (≈ 10 min).

## Crédits et licences

- **Code** : [licence MIT](LICENSE).
- **Valeurs nutritionnelles** : Anses. 2020. *Table de composition nutritionnelle des
  aliments Ciqual*. <https://ciqual.anses.fr> — Licence Ouverte / Open Licence (Etalab).
- **Horaires de prière** : [Aladhan](https://aladhan.com) (API Prayer Times).
- **Météo et géocodage** : [Open-Meteo.com](https://open-meteo.com), données sous licence
  [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
- **Recettes, photos et composants intégrés** : voir [CREDITS.md](CREDITS.md).

SGOS ne remplace pas l'avis d'un médecin ou d'un nutritionniste : les repères nutritionnels
sont indicatifs et les coûts des recettes sont des estimations.
