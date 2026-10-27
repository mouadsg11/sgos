# SGOS pour Android (APK)

La même page que le programme Windows (`www/index.html`, générée par `python build.py`),
emballée dans une application Android avec **Capacitor 8**. Pas de Rust ni de NDK.

## Construire l'APK

```bash
python build.py                       # régénère mobile/www/index.html
cd mobile && npx cap sync android     # copie www/ dans le projet Android
cd android
export JAVA_HOME="C:/Program Files/Android/Android Studio/jbr"
export GRADLE_USER_HOME="%USERPROFILE%/.gradle"
./gradlew.bat assembleRelease
```

L'APK signée sort dans `android/app/build/outputs/apk/release/app-release.apk`.

## Clé de signature — À SAUVEGARDER

- `mobile/sgos-release.keystore` et `mobile/android/keystore.properties` (mot de passe).
- **Sans eux, impossible de publier une mise à jour** : Android refuse d'installer une APK
  signée avec une autre clé par-dessus l'ancienne (il faudrait désinstaller, donc perdre les
  données). Garde une copie sur une clé USB ou un cloud privé. Ils sont exclus de git.
- Pour chaque nouvelle version : augmenter `versionCode` (et `versionName`) dans
  `android/app/build.gradle`.

## Ce qui est propre à Android

| Fonction | Sur Android |
|---|---|
| Données | Gardées dans l'application (stockage + copie IndexedDB). Désinstaller l'app les efface : faire une copie avant (barre DONNÉES → copie, enregistrée dans Téléchargements/SGOS). |
| Rapport PDF | Service d'impression du téléphone → « Enregistrer au format PDF ». |
| Fichier .tex, copie des données | Module natif `SgosNativePlugin` → Téléchargements/SGOS. |
| Barres système | Capacitor ajoute la marge sous la barre d'état (pas de `viewport-fit=cover`). |
| Pas encore fait | Rappels (notifications à l'heure des cartes), SG Assistant (clé IA), sauvegarde automatique dans un fichier. |

## iPhone

Une APK ne s'installe pas sur iPhone. Pour iOS : la version web (PWA, dossier `app/`)
ouverte dans Safari → Partager → « Sur l'écran d'accueil », une fois publiée en HTTPS
(GitHub Pages quand le dépôt est public, ou un autre hébergement). Une vraie application
iOS demanderait un Mac (Xcode) et un compte Apple Developer (99 $/an) pour la distribuer.
