// SGOS — programme de bureau : une fenêtre qui affiche l'application (dist/index.html),
// plus la sauvegarde automatique des données dans Documents\SGOS.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs;
use std::path::PathBuf;
use tauri::Manager;

const FICHIER: &str = "SGOS-donnees.json";
const HISTORIQUE: &str = "historique";
const JOURS_GARDES: usize = 120;

fn dossier(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().document_dir().map_err(|e| e.to_string())?.join("SGOS");
    fs::create_dir_all(dir.join(HISTORIQUE)).map_err(|e| e.to_string())?;
    Ok(dir)
}

/// Enregistre toutes les données : Documents\SGOS\SGOS-donnees.json (remplacé d'un
/// coup, jamais à moitié écrit) + une copie du jour dans Documents\SGOS\historique.
#[tauri::command]
fn sauvegarder(app: tauri::AppHandle, contenu: String, jour: String) -> Result<String, String> {
    let dir = dossier(&app)?;
    let fichier = dir.join(FICHIER);
    let tmp = dir.join(format!("{FICHIER}.tmp"));
    fs::write(&tmp, &contenu).map_err(|e| e.to_string())?;
    fs::rename(&tmp, &fichier).map_err(|e| e.to_string())?;

    let jour: String = jour.chars().filter(|c| c.is_ascii_digit() || *c == '-').collect();
    if !jour.is_empty() {
        let hist = dir.join(HISTORIQUE);
        fs::write(hist.join(format!("SGOS-{jour}.json")), &contenu).map_err(|e| e.to_string())?;
        garder_les_plus_recents(&hist);
    }
    Ok(fichier.to_string_lossy().into_owned())
}

/// Relit la sauvegarde automatique (utilisée au démarrage si elle est plus récente).
#[tauri::command]
fn lire_sauvegarde(app: tauri::AppHandle) -> Result<Option<String>, String> {
    let fichier = dossier(&app)?.join(FICHIER);
    if !fichier.exists() {
        return Ok(None);
    }
    fs::read_to_string(&fichier).map(Some).map_err(|e| e.to_string())
}

/// Configuration de SG Assistant : Documents\SGOSssistant.json (créé vide au premier appel).
/// La clé reste sur l'ordinateur, hors du code et des sauvegardes de données.
#[tauri::command]
fn config_assistant(app: tauri::AppHandle) -> Result<String, String> {
    let fichier = dossier(&app)?.join("assistant.json");
    if !fichier.exists() {
        let modele = "{
  \"fournisseur\": \"gemini\",
  \"cle\": \"\",
  \"modele\": \"\"
}
";
        fs::write(&fichier, modele).map_err(|e| e.to_string())?;
    }
    fs::read_to_string(&fichier).map_err(|e| e.to_string())
}

/// Rapport hebdomadaire au format LaTeX : Documents\SGOS\rapports\<nom>.tex
#[tauri::command]
fn enregistrer_rapport(app: tauri::AppHandle, nom: String, contenu: String) -> Result<String, String> {
    let nom: String = nom.chars().filter(|c| c.is_ascii_alphanumeric() || *c == '-' || *c == '_' || *c == '.').collect();
    if nom.is_empty() || !nom.ends_with(".tex") || nom.starts_with('.') {
        return Err("nom de fichier invalide".into());
    }
    let dir = dossier(&app)?.join("rapports");
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let fichier = dir.join(nom);
    fs::write(&fichier, contenu).map_err(|e| e.to_string())?;
    Ok(fichier.to_string_lossy().into_owned())
}

/// Effacement de l'historique : supprime les copies automatiques des jours précédents
/// (elles contiennent encore les données effacées). La copie du jour `garder` est conservée.
#[tauri::command]
fn purger_historique(app: tauri::AppHandle, garder: String) -> Result<usize, String> {
    let hist = dossier(&app)?.join(HISTORIQUE);
    let garder = format!("SGOS-{}.json", garder.chars().filter(|c| c.is_ascii_digit() || *c == '-').collect::<String>());
    let mut n = 0;
    for e in fs::read_dir(&hist).map_err(|e| e.to_string())?.flatten() {
        let p = e.path();
        let nom = p.file_name().map(|x| x.to_string_lossy().into_owned()).unwrap_or_default();
        if nom.starts_with("SGOS-") && nom.ends_with(".json") && nom != garder && fs::remove_file(&p).is_ok() {
            n += 1;
        }
    }
    Ok(n)
}

fn garder_les_plus_recents(hist: &PathBuf) {
    let Ok(entrees) = fs::read_dir(hist) else { return };
    let mut noms: Vec<PathBuf> = entrees
        .filter_map(|e| e.ok().map(|e| e.path()))
        .filter(|p| p.extension().map_or(false, |x| x == "json"))
        .collect();
    noms.sort();
    if noms.len() > JOURS_GARDES {
        for vieux in &noms[..noms.len() - JOURS_GARDES] {
            let _ = fs::remove_file(vieux);
        }
    }
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .invoke_handler(tauri::generate_handler![sauvegarder, lire_sauvegarde, config_assistant, enregistrer_rapport, purger_historique])
        .run(tauri::generate_context!())
        .expect("erreur au lancement de SGOS");
}
