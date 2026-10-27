/* SGOS — Rapport hebdomadaire
 * Transforme les données d'une semaine (préparées par la page Bilans) en :
 *   - une page A4 au style LaTeX (Computer Modern, sections numérotées, tableaux booktabs),
 *     imprimée par la boîte de dialogue du système → « Enregistrer au format PDF » ;
 *   - un fichier .tex équivalent, à compiler avec pdflatex (ou sur Overleaf).
 * Les polices Computer Modern (OFL) sont injectées par build.py dans window.SGOS_CMU.
 */
(function () {
  if (window.SGOS_RAPPORT) return;

  // ---------- formats ----------
  function nb(v, dec) {
    var x = Number(v) || 0;
    var s = dec ? x.toFixed(dec) : String(Math.round(x));
    var p = s.split('.');
    p[0] = p[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return p.join(',');
  }
  function heures(h) {
    var t = Math.round((h || 0) * 60), hh = Math.floor(t / 60), mm = t % 60;
    if (hh && mm) return hh + ' h ' + (mm < 10 ? '0' : '') + mm;
    if (hh) return hh + ' h';
    return mm + ' min';
  }
  function minutes(m) { return (m > 0 ? '+' : m < 0 ? '−' : '') + Math.abs(Math.round(m)) + ' min'; }
  function mention(n) {
    if (n == null) return 'non notée';
    return n >= 85 ? 'excellente' : n >= 70 ? 'bonne' : n >= 50 ? 'moyenne' : 'difficile';
  }
  function plural(n, s, p) { return n + ' ' + (n > 1 ? (p || s + 's') : s); }

  // ---------- analyse : points forts et pistes, à partir des chiffres ----------
  function analyse(d) {
    var forts = [], pistes = [], t = d.totaux;
    if (d.note != null) {
      if (d.note >= 85) forts.push('Semaine très bien tenue : ' + d.note + '/100.');
      else if (d.note < 50) pistes.push('Note de ' + d.note + '/100 : moins de la moitié du temps planifié a été tenu. Prévoir moins, mais le tenir.');
      if (d.notePrev != null) {
        var e = d.note - d.notePrev;
        if (e >= 5) forts.push('Progression de ' + e + ' points par rapport à la semaine précédente (' + d.notePrev + '/100).');
        else if (e <= -5) pistes.push('Recul de ' + (-e) + ' points par rapport à la semaine précédente (' + d.notePrev + '/100).');
      }
    }
    var notes = d.jours.filter(function (j) { return j.note != null; });
    if (notes.length >= 2) {
      var best = notes.slice().sort(function (a, b) { return b.note - a.note; })[0];
      var worst = notes.slice().sort(function (a, b) { return a.note - b.note; })[0];
      if (best.note - worst.note >= 20) {
        forts.push('Meilleur jour : ' + best.nom.toLowerCase() + ' (' + best.note + '/100).');
        pistes.push('Jour le plus faible : ' + worst.nom.toLowerCase() + ' (' + worst.note + '/100). Alléger ce jour-là ou mieux répartir les cartes.');
      }
    }
    if (t.total) {
      var tab = t.ab / t.total;
      if (tab >= 0.2) pistes.push(Math.round(tab * 100) + ' % des cartes ont été abandonnées : les durées prévues sont peut-être trop optimistes.');
      if (t.pending) pistes.push(plural(t.pending, 'carte') + ' sans statut : non validée' + (t.pending > 1 ? 's' : '') + ', elle' + (t.pending > 1 ? 's comptent' : ' compte') + ' comme non faite' + (t.pending > 1 ? 's' : '') + '. Pensez à cocher ce qui a été fait.');
    }
    if (d.ponctuel != null && t.done >= 3) {
      if (d.ponctuel >= 80) forts.push(d.ponctuel + ' % des cartes réalisées à l’heure (moins de 5 min d’écart).');
      if (t.decal >= 15) pistes.push('Décalage moyen de ' + t.decal + ' min : laisser des marges entre les cartes.');
    }
    var cats = d.cats.filter(function (c) { return c.h >= 1 && !c.sans; });
    if (cats.length >= 2) {
      var cb = cats.slice().sort(function (a, b) { return b.rate - a.rate; });
      if (cb[0].rate >= 75) forts.push('Catégorie la mieux tenue : ' + cb[0].nom + ' (' + cb[0].rate + ' % réalisé).');
      var cw = cb[cb.length - 1];
      if (cw.rate < 50) pistes.push('Catégorie la moins tenue : ' + cw.nom + ' (' + cw.rate + ' % réalisé sur ' + heures(cw.h) + ' planifiées).');
    }
    if (d.nut) {
      var n = d.nut;
      if (n.kcalObj && n.jours) {
        var ec = (n.kcal - n.kcalObj) / n.kcalObj;
        if (Math.abs(ec) <= 0.1) forts.push('Calories proches de l’objectif : ' + nb(n.kcal) + ' kcal/jour en moyenne.');
        else pistes.push('Calories ' + (ec > 0 ? 'au-dessus' : 'en dessous') + ' de l’objectif de ' + Math.abs(Math.round(ec * 100)) + ' % (' + nb(n.kcal) + ' kcal/jour pour ' + nb(n.kcalObj) + ').');
      }
      if (n.protObj && n.jours && n.prot < n.protObj * 0.85) pistes.push('Protéines insuffisantes : ' + nb(n.prot) + ' g/jour pour un objectif de ' + nb(n.protObj) + ' g.');
      if (n.jours && n.jours < 4) pistes.push('Repas renseignés seulement ' + plural(n.jours, 'jour') + ' sur 7 : le bilan nutrition reste partiel.');
      if (n.eauObj && n.joursEau && n.eau < n.eauObj * 0.8) pistes.push('Hydratation faible : ' + nb(n.eau) + ' ml/jour en moyenne pour ' + nb(n.eauObj) + ' ml.');
    }
    if (d.argent && d.argent.total) {
      var sup = d.argent.niveaux.filter(function (x) { return x.cle === 'superflue'; })[0];
      if (sup && sup.pct >= 20) pistes.push('Dépenses superflues : ' + sup.pct + ' % du total (' + nb(sup.v) + ' DH).');
      if (d.argent.prev) {
        var ev = (d.argent.total - d.argent.prev) / d.argent.prev;
        if (ev >= 0.25) pistes.push('Dépenses en hausse de ' + Math.round(ev * 100) + ' % par rapport à la semaine précédente.');
        else if (ev <= -0.15) forts.push('Dépenses en baisse de ' + Math.round(-ev * 100) + ' % par rapport à la semaine précédente.');
      }
    }
    if (d.sport.n) {
      if (d.sport.done >= 3) forts.push(plural(d.sport.done, 'séance') + ' de sport réalisée' + (d.sport.done > 1 ? 's' : '') + ' (' + heures(d.sport.hDone) + ').');
      else if (d.sport.done < d.sport.n) pistes.push('Sport : ' + d.sport.done + ' séance' + (d.sport.done > 1 ? 's' : '') + ' réalisée' + (d.sport.done > 1 ? 's' : '') + ' sur ' + d.sport.n + ' prévue' + (d.sport.n > 1 ? 's' : '') + '.');
    } else if (t.total) pistes.push('Aucune séance de sport planifiée cette semaine.');
    if (!forts.length) forts.push('Semaine renseignée : c’est la base pour progresser.');
    if (!pistes.length) pistes.push('Rien à signaler : garder le même rythme la semaine prochaine.');
    return { forts: forts, pistes: pistes };
  }

  function resume(d) {
    var t = d.totaux;
    if (!t.total) return 'Aucune carte n’était planifiée sur cette semaine : il n’y a pas de note à calculer.';
    var s = 'Sur la semaine du ' + d.duCourt + ' au ' + d.auCourt + ', ' + plural(t.total, 'carte') + ' étaient planifiées pour ' + heures(t.hPlan) +
      ' ; ' + t.done + ' ont été réalisées (' + heures(t.hDone) + '), ' + t.ab + ' abandonnée' + (t.ab > 1 ? 's' : '') + ' et ' + t.pending + ' sans statut. ';
    s += 'La note de la semaine est de ' + d.note + '/100, une semaine ' + mention(d.note);
    if (d.notePrev != null) { var e = d.note - d.notePrev; s += (e === 0 ? ', stable par rapport à la précédente' : ' (' + (e > 0 ? '+' : '−') + Math.abs(e) + ' points par rapport à la précédente)'); }
    s += '.';
    if (t.done) s += ' Le décalage moyen des cartes réalisées est de ' + t.decal + ' min.';
    return s;
  }

  // =====================================================================
  // HTML au style LaTeX
  // =====================================================================
  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function fontFaces() {
    var f = window.SGOS_CMU || {};
    var out = '';
    [['r', 'normal', 'normal'], ['b', 'bold', 'normal'], ['i', 'normal', 'italic']].forEach(function (x) {
      if (f[x[0]]) out += '@font-face{font-family:"CMU Serif";src:url(' + f[x[0]] + ') format("woff2");font-weight:' + x[1] + ';font-style:' + x[2] + '}';
    });
    return out;
  }

  var CSS = [
    '@page{size:A4;margin:2.4cm 2.5cm 2.6cm;@bottom-center{content:counter(page);font-family:"CMU Serif","Latin Modern Roman","Cambria",serif;font-size:10.5pt}}',
    '*{box-sizing:border-box}',
    'html{-webkit-print-color-adjust:exact;print-color-adjust:exact}',
    'body{margin:0;font-family:"CMU Serif","Latin Modern Roman","Cambria","Times New Roman",serif;font-size:11pt;line-height:1.38;color:#000;background:#fff;text-align:justify;hyphens:auto;font-kerning:normal}',
    '.doc{max-width:16cm;margin:0 auto}',
    '@media screen{body{background:#e8e8e8;padding:24px}.doc{background:#fff;padding:2.4cm 2.5cm;box-shadow:0 2px 12px rgba(0,0,0,.2)}}',
    '.title{text-align:center;margin:0 0 1.6em}',
    '.title h1{font-size:17.3pt;font-weight:normal;margin:0 0 .55em;line-height:1.25}',
    '.title .sub{font-size:12pt;margin:0 0 .9em}',
    '.title .auth{font-size:12pt;margin:0 0 .35em}',
    '.title .date{font-size:12pt}',
    '.abstract{margin:0 1.2cm 1.6em;font-size:10pt}',
    '.abstract h2{text-align:center;font-size:10pt;font-weight:bold;margin:0 0 .5em}',
    '.abstract p{margin:0;text-indent:1.5em}',
    '.kpis{display:flex;justify-content:center;gap:0;margin:0 0 1.6em;border-top:.08em solid #000;border-bottom:.08em solid #000;padding:.45em 0}',
    '.kpi{flex:1;text-align:center;padding:0 .4em}',
    '.kpi+.kpi{border-left:.05em solid #000}',
    '.kpi b{display:block;font-size:15pt;font-weight:bold;line-height:1.2}',
    '.kpi span{font-size:9pt;font-variant:small-caps;letter-spacing:.02em}',
    'h2.sec{font-size:14.4pt;font-weight:bold;margin:1.5em 0 .6em;break-after:avoid}',
    'h2.sec .n{display:inline-block;min-width:1.6em}',
    'h3.ssec{font-size:12pt;font-weight:bold;margin:1.1em 0 .45em;break-after:avoid}',
    'h3.ssec .n{display:inline-block;min-width:2.2em}',
    'p{margin:0 0 .55em}',
    'p.ind{text-indent:1.5em}',
    '.float{margin:1.1em 0 1.3em;break-inside:avoid;text-align:center}',
    '.cap{font-size:10pt;margin:.5em 0 0;text-align:center}',
    '.cap.top{margin:0 0 .45em}',
    'table.bt{border-collapse:collapse;margin:0 auto;font-size:10pt;font-variant-numeric:tabular-nums;text-align:left}',
    'table.bt th,table.bt td{padding:.18em .7em;vertical-align:baseline;white-space:nowrap}',
    'table.bt.dense{font-size:9.5pt}',
    'table.bt.dense th,table.bt.dense td{padding:.18em .42em}',
    'table.bt thead tr:first-child th{border-top:.08em solid #000;padding-top:.35em}',
    'table.bt thead tr:last-child th{border-bottom:.05em solid #000;padding-bottom:.3em;font-weight:bold}',
    'table.bt tbody tr:last-child td{border-bottom:.08em solid #000;padding-bottom:.35em}',
    'table.bt tfoot td{border-top:.05em solid #000;border-bottom:.08em solid #000;padding:.3em .7em;font-weight:bold}',
    'table.bt tbody tr:last-child td{border-bottom:none}',
    'table.bt tbody:last-child tr:last-child td{border-bottom:.08em solid #000}',
    'table.bt .r{text-align:right}',
    'table.bt .c{text-align:center}',
    'table.bt td.it{font-style:italic}',
    '.sw{display:inline-block;width:.7em;height:.7em;margin-right:.45em;vertical-align:-.02em;border:.04em solid #000}',
    '.bar{display:inline-block;height:.62em;background:#444;vertical-align:-.02em}',
    'ul.it{margin:.2em 0 .7em;padding-left:1.8em}',
    'ul.it li{margin:0 0 .3em}',
    'ul.it.plus li::marker{content:"+  "}',
    'ul.it.moins li::marker{content:"\\2013  "}',
    '.foot{margin-top:2em;font-size:8.5pt}',
    '.foot::before{content:"";display:block;width:5cm;border-top:.05em solid #000;margin-bottom:.3em}',
    '.muted{color:#333}',
    'svg text{font-family:"CMU Serif","Latin Modern Roman","Cambria",serif}'
  ].join('\n');

  // Figure : note de chaque jour (histogramme sobre, axes à la pgfplots)
  function figNotes(d) {
    var W = 480, H = 190, L = 40, B = 28, T = 10, R = 70;
    var iw = W - L - R, ih = H - T - B, bw = iw / 7;
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" xmlns="http://www.w3.org/2000/svg" font-size="10">';
    [0, 25, 50, 75, 100].forEach(function (v) {
      var y = T + ih - v / 100 * ih;
      s += '<line x1="' + L + '" x2="' + (L + iw) + '" y1="' + y + '" y2="' + y + '" stroke="#bbb" stroke-width=".4" stroke-dasharray="' + (v ? '2 2' : '0') + '"/>';
      s += '<line x1="' + (L - 3) + '" x2="' + L + '" y1="' + y + '" y2="' + y + '" stroke="#000" stroke-width=".6"/>';
      s += '<text x="' + (L - 6) + '" y="' + (y + 3.4) + '" text-anchor="end">' + v + '</text>';
    });
    if (d.note != null) {
      var ym = T + ih - d.note / 100 * ih;
      s += '<line x1="' + L + '" x2="' + (L + iw) + '" y1="' + ym + '" y2="' + ym + '" stroke="#000" stroke-width=".7" stroke-dasharray="5 3"/>';
      s += '<text x="' + (L + iw + 5) + '" y="' + (ym + 3.2) + '" font-style="italic" font-size="9">semaine : ' + d.note + '</text>';
    }
    d.jours.forEach(function (j, i) {
      var x = L + i * bw + bw * 0.22, w = bw * 0.56;
      if (j.note != null) {
        var h = Math.max(.8, j.note / 100 * ih);
        s += '<rect x="' + x + '" y="' + (T + ih - h) + '" width="' + w + '" height="' + h + '" fill="#d9d9d9" stroke="#000" stroke-width=".6"/>';
        s += '<text x="' + (x + w / 2) + '" y="' + (T + ih - h - 3.5) + '" text-anchor="middle" font-size="9">' + j.note + '</text>';
      } else {
        s += '<text x="' + (x + w / 2) + '" y="' + (T + ih - 4) + '" text-anchor="middle" font-size="9" fill="#666">–</text>';
      }
      s += '<text x="' + (x + w / 2) + '" y="' + (H - B + 15) + '" text-anchor="middle">' + esc(j.nom.slice(0, 3).toLowerCase()) + '.</text>';
    });
    s += '<line x1="' + L + '" x2="' + L + '" y1="' + T + '" y2="' + (T + ih) + '" stroke="#000" stroke-width=".7"/>';
    s += '<line x1="' + L + '" x2="' + (L + iw) + '" y1="' + (T + ih) + '" y2="' + (T + ih) + '" stroke="#000" stroke-width=".7"/>';
    s += '<text transform="translate(11 ' + (T + ih / 2) + ') rotate(-90)" text-anchor="middle" font-size="9.5">note / 100</text>';
    return s + '</svg>';
  }

  function html(d) {
    var A = analyse(d), t = d.totaux, fig = 0, tab = 0, sec = 0;
    var S = function (title) { sec++; return '<h2 class="sec"><span class="n">' + sec + '</span>' + esc(title) + '</h2>'; };
    var cap = function (kind, txt, top) { return '<p class="cap' + (top ? ' top' : '') + '">' + kind + ' ' + (kind === 'Figure' ? ++fig : ++tab) + ' – ' + esc(txt) + '</p>'; };
    var h = '<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>' + esc(d.fichier) + '</title><style>' + fontFaces() + CSS + '</style></head><body><div class="doc">';

    h += '<div class="title"><h1>Rapport hebdomadaire</h1><div class="sub">Semaine ' + d.semaine + ' — du ' + esc(d.du) + ' au ' + esc(d.au) + '</div>' +
      '<div class="auth">' + esc(d.auteur) + '</div><div class="date">' + esc(d.genere) + '</div></div>';

    h += '<div class="kpis">' +
      '<div class="kpi"><b>' + (d.note == null ? '–' : d.note + '/100') + '</b><span>note de la semaine</span></div>' +
      '<div class="kpi"><b>' + (d.notePrev == null || d.note == null ? '–' : (d.note - d.notePrev >= 0 ? '+' : '−') + Math.abs(d.note - d.notePrev)) + '</b><span>vs sem. précédente</span></div>' +
      '<div class="kpi"><b>' + t.done + '/' + t.total + '</b><span>cartes réalisées</span></div>' +
      '<div class="kpi"><b>' + heures(t.hDone) + '</b><span>temps réalisé</span></div></div>';

    h += '<div class="abstract"><h2>Résumé</h2><p>' + esc(resume(d)) + '</p></div>';

    // 1. Emploi du temps
    h += S('Tenue de l’emploi du temps');
    h += '<p class="ind">Chaque note compare ce qui était planifié avec ce qui a été réellement fait : une carte réalisée compte pour sa durée, diminuée d’une pénalité de décalage (jusqu’à 45 %) ; une carte abandonnée ou sans statut compte pour zéro.</p>';
    h += '<div class="float">' + cap('Table', 'Bilan jour par jour', true) + '<table class="bt dense"><thead><tr><th>Jour</th><th class="r">Cartes</th><th class="r">Réalisées</th><th class="r">Abandon.</th><th class="r">Sans statut</th><th class="r">Planifié</th><th class="r">Réalisé</th><th class="r">Décalage</th><th class="r">Note</th></tr></thead><tbody>';
    d.jours.forEach(function (j) {
      h += '<tr><td>' + esc(j.nom.slice(0, 3) + '. ' + j.date) + '</td><td class="r">' + j.total + '</td><td class="r">' + j.done + '</td><td class="r">' + j.ab + '</td><td class="r">' + j.pending + '</td><td class="r">' + (j.total ? heures(j.hPlan) : '–') + '</td><td class="r">' + (j.total ? heures(j.hDone) : '–') + '</td><td class="r">' + (j.done ? j.decal + ' min' : '–') + '</td><td class="r">' + (j.note == null ? '–' : j.note) + '</td></tr>';
    });
    h += '</tbody><tfoot><tr><td>Semaine</td><td class="r">' + t.total + '</td><td class="r">' + t.done + '</td><td class="r">' + t.ab + '</td><td class="r">' + t.pending + '</td><td class="r">' + heures(t.hPlan) + '</td><td class="r">' + heures(t.hDone) + '</td><td class="r">' + (t.done ? t.decal + ' min' : '–') + '</td><td class="r">' + (d.note == null ? '–' : d.note) + '</td></tr></tfoot></table></div>';
    if (t.total) h += '<div class="float">' + figNotes(d) + cap('Figure', 'Note de chaque jour ; en pointillé, la note de la semaine') + '</div>';

    // 2. Répartition
    h += S('Répartition du temps');
    if (!d.cats.length) h += '<p class="ind">Aucune carte posée dans l’emploi du temps cette semaine.</p>';
    else {
      h += '<p class="ind">Le temps planifié se répartit sur ' + plural(d.cats.length, 'catégorie') + '. Le taux de réalisation indique la part de ce temps effectivement faite.</p>';
      h += '<div class="float">' + cap('Table', 'Temps planifié et taux de réalisation par catégorie', true) + '<table class="bt"><thead><tr><th>Catégorie</th><th class="r">Planifié</th><th class="r">Part</th><th></th><th class="r">Réalisé</th></tr></thead><tbody>';
      d.cats.forEach(function (c) {
        h += '<tr><td><span class="sw" style="background:' + esc(c.couleur) + '"></span>' + esc(c.nom) + '</td><td class="r">' + heures(c.h) + '</td><td class="r">' + c.pct + ' %</td><td><span class="bar" style="width:' + (c.pct * 0.045).toFixed(2) + 'cm"></span></td><td class="r">' + c.rate + ' %</td></tr>';
      });
      h += '</tbody></table></div>';
      if (d.doms.length) {
        h += '<h3 class="ssec"><span class="n">' + sec + '.1</span>Par domaine de vie</h3><p class="ind">' + d.doms.map(function (x) { return esc(x.nom) + ' : ' + heures(x.h) + ' (' + x.pct + ' %)'; }).join(' ; ') + '.</p>';
      }
    }

    // 3. Ponctualité et écarts
    h += S('Ponctualité et écarts');
    if (!t.done) h += '<p class="ind">Aucune carte réalisée : pas de mesure de ponctualité.</p>';
    else {
      h += '<p class="ind">' + (d.ponctuel == null ? '' : d.ponctuel + ' % des cartes réalisées l’ont été à moins de 5 minutes de l’heure prévue. ') + 'Le décalage moyen est de ' + t.decal + ' minutes.</p>';
      if (d.retards.length) {
        h += '<div class="float">' + cap('Table', 'Plus grands décalages de la semaine', true) + '<table class="bt"><thead><tr><th>Carte</th><th>Jour</th><th class="r">Prévue à</th><th class="r">Décalage</th></tr></thead><tbody>';
        d.retards.forEach(function (r) { h += '<tr><td>' + esc(r.titre) + '</td><td>' + esc(r.jour) + '</td><td class="r">' + esc(r.heure) + '</td><td class="r">' + minutes(r.shift) + '</td></tr>'; });
        h += '</tbody></table></div>';
      }
    }
    if (d.abandons.length) {
      h += '<h3 class="ssec"><span class="n">' + sec + '.1</span>Cartes non tenues</h3><div class="float">' + cap('Table', 'Cartes abandonnées ou laissées sans statut', true) + '<table class="bt"><thead><tr><th>Carte</th><th>Jour</th><th class="r">Heure</th><th class="r">Durée</th><th>Statut</th></tr></thead><tbody>';
      d.abandons.forEach(function (r) { h += '<tr><td>' + esc(r.titre) + '</td><td>' + esc(r.jour) + '</td><td class="r">' + esc(r.heure) + '</td><td class="r">' + heures(r.dur) + '</td><td class="it">' + esc(r.statut) + '</td></tr>'; });
      h += '</tbody></table>' + (d.abandonsPlus ? '<p class="cap">… et ' + plural(d.abandonsPlus, 'autre carte') + '.</p>' : '') + '</div>';
    }

    // 4. Sport
    h += S('Sport');
    if (!d.sport.n) h += '<p class="ind">Aucune séance de sport planifiée cette semaine.</p>';
    else {
      h += '<p class="ind">' + plural(d.sport.n, 'séance') + ' planifiée' + (d.sport.n > 1 ? 's' : '') + ' (' + heures(d.sport.h) + '), dont ' + d.sport.done + ' réalisée' + (d.sport.done > 1 ? 's' : '') + ' (' + heures(d.sport.hDone) + ').</p>';
      h += '<div class="float">' + cap('Table', 'Séances de la semaine', true) + '<table class="bt"><thead><tr><th>Séance</th><th>Jour</th><th class="r">Durée</th><th>Statut</th></tr></thead><tbody>';
      d.sport.list.forEach(function (r) { h += '<tr><td>' + esc(r.titre) + '</td><td>' + esc(r.jour) + '</td><td class="r">' + heures(r.dur) + '</td><td class="it">' + esc(r.statut) + '</td></tr>'; });
      h += '</tbody></table></div>';
    }

    // 5. Nutrition
    h += S('Nutrition');
    var n = d.nut;
    if (!n || (!n.jours && !n.joursEau)) h += '<p class="ind">Aucun repas ni verre d’eau saisi cette semaine.</p>';
    else {
      h += '<p class="ind">Moyennes calculées sur les ' + plural(n.jours, 'jour') + ' où des repas ont été saisis' + (n.joursEau ? ' (eau : ' + plural(n.joursEau, 'jour') + ')' : '') + '.</p>';
      h += '<div class="float">' + cap('Table', 'Apports moyens par jour et objectifs', true) + '<table class="bt"><thead><tr><th></th><th class="r">Moyenne / jour</th><th class="r">Objectif</th><th class="r">Atteint</th></tr></thead><tbody>';
      var row = function (k, v, o, u) { return '<tr><td>' + k + '</td><td class="r">' + nb(v) + ' ' + u + '</td><td class="r">' + (o ? nb(o) + ' ' + u : '–') + '</td><td class="r">' + (o ? Math.round(v / o * 100) + ' %' : '–') + '</td></tr>'; };
      if (n.jours) h += row('Énergie', n.kcal, n.kcalObj, 'kcal') + row('Protéines', n.prot, n.protObj, 'g') + row('Glucides', n.gluc, n.glucObj, 'g') + row('Lipides', n.lip, n.lipObj, 'g');
      if (n.joursEau) h += row('Eau', n.eau, n.eauObj, 'ml');
      h += '</tbody></table></div>';
      h += '<div class="float">' + cap('Table', 'Détail par jour', true) + '<table class="bt"><thead><tr><th>Jour</th><th class="r">Énergie</th><th class="r">Protéines</th><th class="r">Eau</th><th class="r">Coût repas</th></tr></thead><tbody>';
      n.parJour.forEach(function (j) { h += '<tr><td>' + esc(j.nom) + '</td><td class="r">' + (j.kcal ? nb(j.kcal) + ' kcal' : '–') + '</td><td class="r">' + (j.kcal ? nb(j.prot) + ' g' : '–') + '</td><td class="r">' + (j.eau ? nb(j.eau) + ' ml' : '–') + '</td><td class="r">' + (j.cout ? nb(j.cout) + ' DH' : '–') + '</td></tr>'; });
      h += '</tbody></table></div>';
    }

    // 6. Dépenses
    h += S('Dépenses');
    var a = d.argent;
    if (!a || !a.total) h += '<p class="ind">Aucune dépense enregistrée cette semaine (dans les cartes ou les repas).</p>';
    else {
      h += '<p class="ind">Total de la semaine : <b>' + nb(a.total) + ' DH</b>' + (a.prev ? ' (semaine précédente : ' + nb(a.prev) + ' DH)' : '') + ', soit ' + nb(a.total / 7, 1) + ' DH par jour en moyenne.</p>';
      h += '<div class="float">' + cap('Table', 'Dépenses par domaine de vie et par niveau', true) + '<table class="bt"><thead><tr><th>Domaine</th><th class="r">Montant</th><th class="r">Part</th></tr></thead><tbody>';
      a.doms.forEach(function (x) { h += '<tr><td>' + esc(x.nom) + '</td><td class="r">' + nb(x.v) + ' DH</td><td class="r">' + x.pct + ' %</td></tr>'; });
      h += '</tbody><tbody>';
      a.niveaux.forEach(function (x, i) { h += '<tr><td class="it"' + (i === 0 ? ' style="border-top:.05em solid #000;padding-top:.3em"' : '') + '>' + esc(x.nom) + '</td><td class="r"' + (i === 0 ? ' style="border-top:.05em solid #000;padding-top:.3em"' : '') + '>' + nb(x.v) + ' DH</td><td class="r"' + (i === 0 ? ' style="border-top:.05em solid #000;padding-top:.3em"' : '') + '>' + x.pct + ' %</td></tr>'; });
      h += '</tbody></table></div>';
      if (a.top.length) h += '<p class="ind">Plus grosses dépenses : ' + a.top.map(function (x) { return esc(x.label) + ' (' + nb(x.v) + ' DH, ' + esc(x.jour) + ')'; }).join(' ; ') + '.</p>';
    }

    // 7. Analyse
    h += S('Analyse et pistes pour la semaine prochaine');
    h += '<h3 class="ssec"><span class="n">' + sec + '.1</span>Points forts</h3><ul class="it plus">' + A.forts.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>';
    h += '<h3 class="ssec"><span class="n">' + sec + '.2</span>À améliorer</h3><ul class="it moins">' + A.pistes.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>';

    h += '<div class="foot">Rapport généré par SGOS à partir des données de l’application. Seules les cartes posées dans l’emploi du temps sont notées.</div>';
    return h + '</div></body></html>';
  }

  // =====================================================================
  // Source LaTeX
  // =====================================================================
  function tx(v) {
    return String(v == null ? '' : v)
      .replace(/\\/g, '\u0000')
      .replace(/([&%$#_{}])/g, '\\$1')
      .replace(/~/g, '\\textasciitilde{}').replace(/\^/g, '\\textasciicircum{}')
      .replace(/\u0000/g, '\\textbackslash{}')
      .replace(/[  ]/g, '~').replace(/−/g, '$-$').replace(/–/g, '--').replace(/—/g, '---')
      .replace(/’/g, "'")
      .replace(/(\d{1,2}):(\d{2})/g, '\\heure{$1}{$2}');   // babel-french espacerait « 09 :00 »
  }
  function texHex(c) { var m = /^#?([0-9a-f]{6})$/i.exec(String(c || '').trim()); return m ? m[1].toUpperCase() : '888888'; }

  function tex(d) {
    var A = analyse(d), t = d.totaux, L = [];
    var p = function (s) { L.push(s); };
    var pct = function (v) { return v + '~\\%'; };
    p('% Rapport hebdomadaire SGOS — semaine ' + d.semaine + ' (' + d.annee + ')');
    p('% Compiler avec : pdflatex ' + d.fichier + '.tex   (ou importer le fichier sur Overleaf)');
    p('\\documentclass[11pt,a4paper]{article}');
    p('\\usepackage[utf8]{inputenc}');
    p('\\usepackage[T1]{fontenc}');
    p('\\usepackage{lmodern}');
    p('\\usepackage[french]{babel}');
    p('\\usepackage[margin=2.5cm]{geometry}');
    p('\\usepackage{booktabs}');
    p('\\usepackage[table]{xcolor}');
    p('\\usepackage{pgfplots}');
    p('\\pgfplotsset{compat=1.16}');
    p('\\usepackage{enumitem}');
    p('\\usepackage{float}');
    p('\\usepackage[skip=5pt]{caption}');
    p('\\newcommand{\\heure}[2]{{\\NoAutoSpacing #1:#2}}');
    p('\\newcommand{\\pastille}[1]{\\textcolor[HTML]{#1}{\\rule{0.7em}{0.7em}}\\,}');
    p('\\title{Rapport hebdomadaire\\\\[0.4em]\\large Semaine ' + d.semaine + ' --- du ' + tx(d.du) + ' au ' + tx(d.au) + '}');
    p('\\author{' + tx(d.auteur) + '}');
    p('\\date{' + tx(d.genere) + '}');
    p('');
    p('\\begin{document}');
    p('\\maketitle');
    p('');
    p('\\begin{center}');
    p('\\begin{tabular}{cccc}');
    p('\\toprule');
    p('\\textbf{\\large ' + (d.note == null ? '--' : d.note + '/100') + '} & \\textbf{\\large ' + (d.notePrev == null || d.note == null ? '--' : (d.note - d.notePrev >= 0 ? '$+$' : '$-$') + Math.abs(d.note - d.notePrev)) + '} & \\textbf{\\large ' + t.done + '/' + t.total + '} & \\textbf{\\large ' + tx(heures(t.hDone)) + '} \\\\');
    p('\\textsc{note de la semaine} & \\textsc{vs sem.\\ précédente} & \\textsc{cartes réalisées} & \\textsc{temps réalisé} \\\\');
    p('\\bottomrule');
    p('\\end{tabular}');
    p('\\end{center}');
    p('');
    p('\\begin{abstract}');
    p(tx(resume(d)));
    p('\\end{abstract}');
    p('');
    p('\\section{Tenue de l\'emploi du temps}');
    p('Chaque note compare ce qui était planifié avec ce qui a été réellement fait : une carte réalisée compte pour sa durée, diminuée d\'une pénalité de décalage (jusqu\'à 45~\\%) ; une carte abandonnée ou sans statut compte pour zéro.');
    p('');
    p('\\begin{table}[H]');
    p('\\centering\\small');
    p('\\caption{Bilan jour par jour}');
    p('\\begin{tabular}{lrrrrrrrr}');
    p('\\toprule');
    p('Jour & Cartes & Réalisées & Abandon. & Sans statut & Planifié & Réalisé & Décalage & Note \\\\');
    p('\\midrule');
    d.jours.forEach(function (j) {
      p(tx(j.nom.slice(0, 3) + '. ' + j.date) + ' & ' + j.total + ' & ' + j.done + ' & ' + j.ab + ' & ' + j.pending + ' & ' + (j.total ? tx(heures(j.hPlan)) : '--') + ' & ' + (j.total ? tx(heures(j.hDone)) : '--') + ' & ' + (j.done ? j.decal + '~min' : '--') + ' & ' + (j.note == null ? '--' : j.note) + ' \\\\');
    });
    p('\\midrule');
    p('\\textbf{Semaine} & ' + t.total + ' & ' + t.done + ' & ' + t.ab + ' & ' + t.pending + ' & ' + tx(heures(t.hPlan)) + ' & ' + tx(heures(t.hDone)) + ' & ' + (t.done ? t.decal + '~min' : '--') + ' & \\textbf{' + (d.note == null ? '--' : d.note) + '} \\\\');
    p('\\bottomrule');
    p('\\end{tabular}');
    p('\\end{table}');
    if (t.total) {
      p('');
      p('\\begin{figure}[H]');
      p('\\centering');
      p('\\begin{tikzpicture}');
      p('\\begin{axis}[ybar, width=0.85\\textwidth, height=5.5cm, ymin=0, ymax=105, bar width=0.6cm,');
      p('  symbolic x coords={' + d.jours.map(function (j) { return j.nom.slice(0, 3).toLowerCase(); }).join(',') + '}, xtick=data,');
      p('  ylabel={note / 100}, nodes near coords, nodes near coords style={font=\\footnotesize},');
      p('  axis lines*=left, ymajorgrids, grid style={dashed,gray!40}]');
      p('\\addplot[fill=gray!30, draw=black] coordinates {' + d.jours.filter(function (j) { return j.note != null; }).map(function (j) { return '(' + j.nom.slice(0, 3).toLowerCase() + ',' + j.note + ')'; }).join(' ') + '};');
      if (d.note != null) p('\\draw[dashed, thick] ({rel axis cs:0,0} |- {axis cs:lun,' + d.note + '}) -- ({rel axis cs:1,0} |- {axis cs:lun,' + d.note + '}) node[pos=0.02, above right, font=\\footnotesize\\itshape] {semaine : ' + d.note + '};');
      p('\\end{axis}');
      p('\\end{tikzpicture}');
      p('\\caption{Note de chaque jour ; en pointillé, la note de la semaine}');
      p('\\end{figure}');
    }
    p('');
    p('\\section{Répartition du temps}');
    if (!d.cats.length) p('Aucune carte posée dans l\'emploi du temps cette semaine.');
    else {
      p('Le temps planifié se répartit sur ' + plural(d.cats.length, 'catégorie') + '. Le taux de réalisation indique la part de ce temps effectivement faite.');
      p('');
      p('\\begin{table}[H]');
      p('\\centering\\small');
      p('\\caption{Temps planifié et taux de réalisation par catégorie}');
      p('\\begin{tabular}{lrrlr}');
      p('\\toprule');
      p('Catégorie & Planifié & Part & & Réalisé \\\\');
      p('\\midrule');
      d.cats.forEach(function (c) {
        p('\\pastille{' + texHex(c.couleur) + '}' + tx(c.nom) + ' & ' + tx(heures(c.h)) + ' & ' + pct(c.pct) + ' & \\rule{' + (c.pct * 0.045).toFixed(2) + 'cm}{0.6em} & ' + pct(c.rate) + ' \\\\');
      });
      p('\\bottomrule');
      p('\\end{tabular}');
      p('\\end{table}');
      if (d.doms.length) {
        p('');
        p('\\subsection{Par domaine de vie}');
        p(d.doms.map(function (x) { return tx(x.nom) + ' : ' + tx(heures(x.h)) + ' (' + pct(x.pct) + ')'; }).join(' ; ') + '.');
      }
    }
    p('');
    p('\\section{Ponctualité et écarts}');
    if (!t.done) p('Aucune carte réalisée : pas de mesure de ponctualité.');
    else {
      p((d.ponctuel == null ? '' : pct(d.ponctuel) + ' des cartes réalisées l\'ont été à moins de 5 minutes de l\'heure prévue. ') + 'Le décalage moyen est de ' + t.decal + ' minutes.');
      if (d.retards.length) {
        p('');
        p('\\begin{table}[H]');
        p('\\centering\\small');
        p('\\caption{Plus grands décalages de la semaine}');
        p('\\begin{tabular}{llrr}');
        p('\\toprule');
        p('Carte & Jour & Prévue à & Décalage \\\\');
        p('\\midrule');
        d.retards.forEach(function (r) { p(tx(r.titre) + ' & ' + tx(r.jour) + ' & ' + tx(r.heure) + ' & ' + tx(minutes(r.shift)) + ' \\\\'); });
        p('\\bottomrule');
        p('\\end{tabular}');
        p('\\end{table}');
      }
    }
    if (d.abandons.length) {
      p('');
      p('\\subsection{Cartes non tenues}');
      p('\\begin{table}[H]');
      p('\\centering\\small');
      p('\\caption{Cartes abandonnées ou laissées sans statut}');
      p('\\begin{tabular}{llrrl}');
      p('\\toprule');
      p('Carte & Jour & Heure & Durée & Statut \\\\');
      p('\\midrule');
      d.abandons.forEach(function (r) { p(tx(r.titre) + ' & ' + tx(r.jour) + ' & ' + tx(r.heure) + ' & ' + tx(heures(r.dur)) + ' & \\emph{' + tx(r.statut) + '} \\\\'); });
      p('\\bottomrule');
      p('\\end{tabular}');
      if (d.abandonsPlus) p('\\\\[0.3em]\\footnotesize\\dots{} et ' + plural(d.abandonsPlus, 'autre carte') + '.');
      p('\\end{table}');
    }
    p('');
    p('\\section{Sport}');
    if (!d.sport.n) p('Aucune séance de sport planifiée cette semaine.');
    else {
      p(plural(d.sport.n, 'séance') + ' planifiée' + (d.sport.n > 1 ? 's' : '') + ' (' + tx(heures(d.sport.h)) + '), dont ' + d.sport.done + ' réalisée' + (d.sport.done > 1 ? 's' : '') + ' (' + tx(heures(d.sport.hDone)) + ').');
      p('');
      p('\\begin{table}[H]');
      p('\\centering\\small');
      p('\\caption{Séances de la semaine}');
      p('\\begin{tabular}{llrl}');
      p('\\toprule');
      p('Séance & Jour & Durée & Statut \\\\');
      p('\\midrule');
      d.sport.list.forEach(function (r) { p(tx(r.titre) + ' & ' + tx(r.jour) + ' & ' + tx(heures(r.dur)) + ' & \\emph{' + tx(r.statut) + '} \\\\'); });
      p('\\bottomrule');
      p('\\end{tabular}');
      p('\\end{table}');
    }
    p('');
    p('\\section{Nutrition}');
    var n = d.nut;
    if (!n || (!n.jours && !n.joursEau)) p('Aucun repas ni verre d\'eau saisi cette semaine.');
    else {
      p('Moyennes calculées sur les ' + plural(n.jours, 'jour') + ' où des repas ont été saisis' + (n.joursEau ? ' (eau : ' + plural(n.joursEau, 'jour') + ')' : '') + '.');
      p('');
      p('\\begin{table}[H]');
      p('\\centering\\small');
      p('\\caption{Apports moyens par jour et objectifs}');
      p('\\begin{tabular}{lrrr}');
      p('\\toprule');
      p(' & Moyenne / jour & Objectif & Atteint \\\\');
      p('\\midrule');
      var row = function (k, v, o, u) { p(k + ' & ' + tx(nb(v)) + '~' + u + ' & ' + (o ? tx(nb(o)) + '~' + u : '--') + ' & ' + (o ? pct(Math.round(v / o * 100)) : '--') + ' \\\\'); };
      if (n.jours) { row('Énergie', n.kcal, n.kcalObj, 'kcal'); row('Protéines', n.prot, n.protObj, 'g'); row('Glucides', n.gluc, n.glucObj, 'g'); row('Lipides', n.lip, n.lipObj, 'g'); }
      if (n.joursEau) row('Eau', n.eau, n.eauObj, 'ml');
      p('\\bottomrule');
      p('\\end{tabular}');
      p('\\end{table}');
      p('');
      p('\\begin{table}[H]');
      p('\\centering\\small');
      p('\\caption{Détail par jour}');
      p('\\begin{tabular}{lrrrr}');
      p('\\toprule');
      p('Jour & Énergie & Protéines & Eau & Coût repas \\\\');
      p('\\midrule');
      n.parJour.forEach(function (j) { p(tx(j.nom) + ' & ' + (j.kcal ? tx(nb(j.kcal)) + '~kcal' : '--') + ' & ' + (j.kcal ? tx(nb(j.prot)) + '~g' : '--') + ' & ' + (j.eau ? tx(nb(j.eau)) + '~ml' : '--') + ' & ' + (j.cout ? tx(nb(j.cout)) + '~DH' : '--') + ' \\\\'); });
      p('\\bottomrule');
      p('\\end{tabular}');
      p('\\end{table}');
    }
    p('');
    p('\\section{Dépenses}');
    var a = d.argent;
    if (!a || !a.total) p('Aucune dépense enregistrée cette semaine (dans les cartes ou les repas).');
    else {
      p('Total de la semaine : \\textbf{' + tx(nb(a.total)) + '~DH}' + (a.prev ? ' (semaine précédente : ' + tx(nb(a.prev)) + '~DH)' : '') + ', soit ' + tx(nb(a.total / 7, 1)) + '~DH par jour en moyenne.');
      p('');
      p('\\begin{table}[H]');
      p('\\centering\\small');
      p('\\caption{Dépenses par domaine de vie et par niveau}');
      p('\\begin{tabular}{lrr}');
      p('\\toprule');
      p('Domaine & Montant & Part \\\\');
      p('\\midrule');
      a.doms.forEach(function (x) { p(tx(x.nom) + ' & ' + tx(nb(x.v)) + '~DH & ' + pct(x.pct) + ' \\\\'); });
      p('\\midrule');
      a.niveaux.forEach(function (x) { p('\\emph{' + tx(x.nom) + '} & ' + tx(nb(x.v)) + '~DH & ' + pct(x.pct) + ' \\\\'); });
      p('\\bottomrule');
      p('\\end{tabular}');
      p('\\end{table}');
      if (a.top.length) p('Plus grosses dépenses : ' + a.top.map(function (x) { return tx(x.label) + ' (' + tx(nb(x.v)) + '~DH, ' + tx(x.jour) + ')'; }).join(' ; ') + '.');
    }
    p('');
    p('\\section{Analyse et pistes pour la semaine prochaine}');
    p('\\subsection{Points forts}');
    p('\\begin{itemize}[label=$+$]');
    A.forts.forEach(function (x) { p('  \\item ' + tx(x)); });
    p('\\end{itemize}');
    p('\\subsection{À améliorer}');
    p('\\begin{itemize}[label=--]');
    A.pistes.forEach(function (x) { p('  \\item ' + tx(x)); });
    p('\\end{itemize}');
    p('');
    p('\\vfill');
    p('\\noindent\\rule{5cm}{0.4pt}\\\\');
    p('{\\footnotesize Rapport généré par SGOS à partir des données de l\'application. Seules les cartes posées dans l\'emploi du temps sont notées.}');
    p('\\end{document}');
    return L.join('\n') + '\n';
  }

  window.SGOS_RAPPORT = { html: html, tex: tex, analyse: analyse };
})();
