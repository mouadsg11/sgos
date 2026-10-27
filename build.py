"""Construit SGOS à partir de source/sgos-page.html (la page de l'application).

    python build.py

- SGOS.html               : fichier unique à double-cliquer ou à envoyer.
- app/index.html          : même page, servie en ligne comme application installable
                            (avec app/manifest.webmanifest, app/sw.js, app/icons/).
- desktop/dist/index.html : page du programme Windows. Ensuite :
      cd desktop && npx tauri build
  → desktop/src-tauri/target/release/bundle/nsis/SGOS_<version>_x64-setup.exe
    (à copier en SGOS-Installation.exe).

source/sgos-page.html est la page telle que l'exécute le moteur de Claude Design
(attributs camelCase écrits `sc-camel-on-click`, ressources par identifiant). Elle est
réinjectée dans l'enveloppe autonome source/SGOS-export-base.html, qui contient déjà
le moteur, React, les polices et le logo.
"""
import base64
import time
import json
from pathlib import Path

ROOT = Path(__file__).parent
SRC = ROOT / "source"
TEMPLATE_TAG = '<script type="__bundler/template">'
CLOSE_SCRIPT = "<" + chr(92) + "u002F"   # « </ » échappé, comme l'export d'origine

FAVICON = "data:image/png;base64," + base64.b64encode((ROOT / "app" / "icons" / "favicon-32.png").read_bytes()).decode()

base = (SRC / "SGOS-export-base.html").read_text(encoding="utf-8")

# 1. Réinjecter la page de l'application dans l'enveloppe.
page = (SRC / "sgos-page.html").read_text(encoding="utf-8")
a = base.find(TEMPLATE_TAG) + len(TEMPLATE_TAG)
b = base.find("</script>", a)
inner = base[a:b]
lead = inner[:len(inner) - len(inner.lstrip())]
trail = inner[len(inner.rstrip()):]
encoded = json.dumps(page, ensure_ascii=False).replace("</", CLOSE_SCRIPT)
base = base[:a] + lead + encoded + trail + base[b:]

# 2. Ajouter le coffre des données et l'installation web, avant le démarrage.
# Polices Computer Modern (OFL) du rapport hebdomadaire, en data: URI.
def woff2(name):
    return "data:font/woff2;base64," + base64.b64encode((SRC / "fonts" / name).read_bytes()).decode()
cmu = {"r": woff2("cmu-serif-500-roman.woff2"), "b": woff2("cmu-serif-700-roman.woff2"), "i": woff2("cmu-serif-500-italic.woff2")}
scripts = f"<script data-sgos-cmu>\nwindow.SGOS_CMU = {json.dumps(cmu)};\n</script>\n"
for name, attr in (("aliments-ciqual.js", "data-sgos-aliments"), ("idees-repas.js", "data-sgos-idees"),("sgos-pwa.js", "data-sgos-pwa"), ("sgos-coffre.js", "data-sgos-coffre"), ("sgos-rappels.js", "data-sgos-rappels"), ("sgos-rapport.js", "data-sgos-rapport")):
    js = (SRC / name).read_text(encoding="utf-8")
    js = js.replace("__SGOS_FAVICON__", FAVICON)
    assert "</script" not in js, name
    scripts += f"<script {attr}>\n{js}\n</script>\n"

i = base.find("</head>")
assert i > 0 and "data-sgos-coffre" not in base
out_html = base[:i] + scripts + base[i:]

# Application Android : assistant préconfiguré si mobile/assistant.local.json existe (hors dépôt).
# Insertion avant le premier <script> : la page sait dès le départ qu'elle est l'application Android
# (pas avant « </head> » : cette balise apparaît aussi dans le code du rapport PDF).
head = "<script data-sgos-app>window.SGOS_APP = true;</script>\n"
conf = ROOT / "mobile" / "assistant.local.json"
if conf.exists():
    ai = json.loads(conf.read_text(encoding="utf-8"))
    head += f"<script data-sgos-ai>window.SGOS_AI_DEFAULT = {json.dumps(ai)};</script>\n"
j = out_html.find("<script")
mobile_html = out_html[:j] + head + out_html[j:]

for out, html in ((ROOT / "SGOS.html", out_html), (ROOT / "app" / "index.html", out_html), (ROOT / "desktop" / "dist" / "index.html", out_html),
                  (ROOT / "mobile" / "www" / "index.html", mobile_html)):
    out.parent.mkdir(parents=True, exist_ok=True)
    for essai in range(6):   # fichier parfois verrouillé un instant (antivirus, serveur d'aperçu)
        try:
            out.write_text(html, encoding="utf-8", newline="")
            break
        except OSError:
            if essai == 5:
                raise
            time.sleep(0.5)
    print(f"{out.relative_to(ROOT)}  {out.stat().st_size:,} octets")

# Application Android (Capacitor, dossier mobile/) : même page, sans service worker.
#   cd mobile && npx cap sync android && cd android && gradlew assembleRelease
