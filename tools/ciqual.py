"""Construit la base d'aliments de SGOS à partir de la table officielle Ciqual (ANSES).

    python tools/ciqual.py

Télécharge la table Ciqual 2020 (XML, format officiel) si elle n'est pas déjà dans
tools/.ciqual/, puis écrit source/aliments-ciqual.js : une base compacte de valeurs
pour 100 g (calories, protéines, glucides, sucres, fibres, lipides, sel), embarquée
dans l'application par build.py.

Source : Anses. 2020. Table de composition nutritionnelle des aliments Ciqual.
https://ciqual.anses.fr — Licence Ouverte / Open Licence (Etalab) : citer la source.
"""
import json
import re
import urllib.request
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CACHE = ROOT / "tools" / ".ciqual"
URL = "https://ciqual.anses.fr/cms/sites/default/files/inline-files/XML_2020_07_07.zip"
OUT = ROOT / "source" / "aliments-ciqual.js"

# constituants retenus (codes Ciqual) → position dans chaque ligne de la base
CONST = {
    "328": "kcal",     # Énergie, règlement UE 1169/2011 (kcal/100 g)
    "25000": "prot",   # Protéines, N x facteur de Jones (g/100 g)
    "31000": "gluc",   # Glucides (g/100 g)
    "32000": "sucres", # Sucres (g/100 g)
    "34100": "fib",    # Fibres alimentaires (g/100 g)
    "40000": "lip",    # Lipides (g/100 g)
    "10004": "sel",    # Sel chlorure de sodium (g/100 g)
}
ORDER = ["kcal", "prot", "gluc", "lip", "fib", "sucres", "sel"]


def fetch():
    CACHE.mkdir(parents=True, exist_ok=True)
    z = CACHE / "ciqual_2020_xml.zip"
    if not z.exists():
        print("Téléchargement de la table Ciqual 2020…")
        urllib.request.urlretrieve(URL, z)
    with zipfile.ZipFile(z) as f:
        f.extractall(CACHE)
    # alim_2020_07_07.xml → « alim », alim_grp_2020_07_07.xml → « alim_grp », compo_… → « compo »
    return {p.name.split("_20")[0]: p for p in CACHE.glob("*.xml")}


def tags(text, tag):
    return re.findall(rf"<{tag}>(.*?)</{tag}>", text, re.S)


def value(raw):
    """Teneur Ciqual → nombre. « traces » et « < x » comptent pour 0 ; « - » = inconnu."""
    t = raw.strip().replace(",", ".")
    if t in ("", "-"):
        return None
    if t.lower() == "traces" or t.startswith("<"):
        return 0.0
    try:
        return float(t)
    except ValueError:
        return None


def main():
    files = fetch()
    read = lambda k: files[k].read_text(encoding="cp1252")

    # sous-groupes (« viandes cuites », « fruits crus »…) pour situer chaque aliment
    groups = {}
    grp_text = read("alim_grp")
    for block in re.findall(r"<ALIM_GRP>(.*?)</ALIM_GRP>", grp_text, re.S):
        code = tags(block, "alim_ssgrp_code")[0].strip()
        name = tags(block, "alim_ssgrp_nom_fr")[0].strip()
        if code and name and name != "-":
            groups[code] = name

    foods = {}
    for block in re.findall(r"<ALIM>(.*?)</ALIM>", read("alim"), re.S):
        code = tags(block, "alim_code")[0].strip()
        name = re.sub(r"\s+", " ", tags(block, "alim_nom_fr")[0]).strip()
        sg = tags(block, "alim_ssgrp_code")[0].strip()
        foods[code] = {"n": name, "g": sg}

    compo = read("compo")
    for block in re.findall(r"<COMPO>(.*?)</COMPO>", compo, re.S):
        const = tags(block, "const_code")[0].strip()
        if const not in CONST:
            continue
        code = tags(block, "alim_code")[0].strip()
        if code in foods:
            foods[code][CONST[const]] = value(tags(block, "teneur")[0])

    rows = []
    for code, f in foods.items():
        prot, gluc, lip = f.get("prot"), f.get("gluc"), f.get("lip")
        kcal = f.get("kcal")
        if kcal is None and None not in (prot, gluc, lip):
            kcal = prot * 4 + gluc * 4 + lip * 9
        if kcal is None:
            continue                       # sans énergie connue, l'aliment ne sert à rien ici
        f["kcal"] = kcal
        row = [int(code), f["n"], f["g"]] + [None if f.get(k) is None else round(f[k], 2) for k in ORDER]
        rows.append(row)
    rows.sort(key=lambda r: r[1].lower())

    used = {r[2] for r in rows}
    data = {
        "source": "Anses. 2020. Table de composition nutritionnelle des aliments Ciqual (ciqual.anses.fr) — Licence Ouverte Etalab",
        "colonnes": ["code", "nom", "sous-groupe"] + ORDER,
        "groupes": {k: v for k, v in groups.items() if k in used},
        "aliments": rows,
    }
    js = ("/* SGOS — base d'aliments (valeurs pour 100 g), générée par tools/ciqual.py.\n"
          " * " + data["source"] + " */\n"
          "window.SGOS_ALIMENTS = " + json.dumps(data, ensure_ascii=False, separators=(",", ":")) + ";\n")
    OUT.write_text(js, encoding="utf-8", newline="")
    print(f"{len(rows)} aliments -> {OUT.relative_to(ROOT)} ({OUT.stat().st_size:,} octets)")


if __name__ == "__main__":
    main()
