/* SGOS — Rappels
 * Prévient à l'heure de chaque carte posée, ou X minutes avant : réglage général
 * « sgos.rappels.avance », ou réglage propre à une carte (champ « rappel » : minutes
 * avant, -1 = pas de rappel pour cette carte). Notification Windows dans le programme
 * (greffon Tauri), notification du navigateur sinon. Chaque carte n'est annoncée qu'une fois.
 * Application Android : notifications programmées à l'avance (greffon Capacitor
 * LocalNotifications) pour les 7 prochains jours ; elles sonnent même application fermée.
 * L'état du bouton « Rappels » est dans window.__sgosRappels (utilisé par l'en-tête de l'app).
 */
(function () {
  if (window.__sgosRappels) return;

  var KEY = 'sgos.v1';
  var PREF = 'sgos.rappels';        // 'on' | 'off'
  var SENT = 'sgos.rappels.envoyes'; // { "AAAA-MM-JJ": ["id", …] }
  var AVANCE = 'sgos.rappels.avance'; // minutes avant l'heure de la carte (0 = à l'heure)
  var FENETRE_MIN = 3;               // on annonce une carte jusqu'à 3 min après l'heure du rappel
  var tauri = window.__TAURI_INTERNALS__ && typeof window.__TAURI_INTERNALS__.invoke === 'function';
  // Application Android : window.SGOS_APP (posé par build.py) ; le pont Capacitor arrive après ce script,
  // le greffon est donc cherché au moment de l'utiliser.
  var cap = !tauri && !!window.SGOS_APP;
  var LN = cap ? { _m: null } : null;
  function ln() {
    var C = window.Capacitor;
    if (!LN._m && C) LN._m = (C.Plugins && C.Plugins.LocalNotifications) || (C.registerPlugin ? C.registerPlugin('LocalNotifications') : null);
    if (!LN._m) throw new Error('Capacitor pas encore prêt');
    return LN._m;
  }
  if (LN) ['checkPermissions', 'requestPermissions', 'createChannel', 'schedule', 'getPending', 'cancel'].forEach(function (m) {
    LN[m] = function (a) { try { return ln()[m](a); } catch (e) { return Promise.reject(e); } };
  });
  var CANAL = 'sgos-rappels';
  var JOURS = 7;                     // Android : rappels programmés sur 7 jours

  function invoke(cmd, args) { return window.__TAURI_INTERNALS__.invoke('plugin:notification|' + cmd, args || {}); }
  function webOk() { return typeof window.Notification === 'function' && location.protocol !== 'file:'; }

  var api = window.__sgosRappels = {
    supporte: tauri || !!LN || webOk(),
    actif: false,
    permission: 'inconnue',
    onchange: null,
    basculer: basculer,
    avance: 0,
    reglerAvance: function (m) { m = Math.max(0, Math.round(+m || 0)); api.avance = m; ecrire(AVANCE, String(m)); changed(); if (LN) programmer(); },
    essai: function () {
      envoyer('SGOS', api.avance ? 'Les rappels fonctionnent : vous serez prévenu ' + avant(api.avance) + ' chaque carte.'
        : 'Les rappels fonctionnent : vous serez prévenu à l\'heure de chaque carte.');
    }
  };
  function avant(m) { return m >= 60 && m % 60 === 0 ? (m / 60) + ' h avant' : m + ' min avant'; }
  function changed() { if (typeof api.onchange === 'function') api.onchange(); }

  function lire(k, d) { try { var v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } }
  function ecrire(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  api.avance = Math.max(0, parseInt(lire(AVANCE, '0'), 10) || 0);
  // avance d'une carte : son propre réglage, sinon le réglage général (-1 : pas de rappel)
  function avanceDe(c) { var r = c.rappel; return r === undefined || r === null || r === '' ? api.avance : +r; }

  function demanderPermission() {
    if (LN) {
      return LN.checkPermissions().then(function (p) {
        if (p.display === 'granted') return 'granted';
        return LN.requestPermissions().then(function (r) { return r.display === 'granted' ? 'granted' : 'denied'; });
      }).then(function (r) { if (r === 'granted') canal(); return r; }).catch(function () { return 'denied'; });
    }
    if (tauri) {
      return invoke('is_permission_granted').then(function (ok) {
        if (ok) return 'granted';
        return invoke('request_permission');
      }).catch(function () { return 'denied'; });
    }
    if (!webOk()) return Promise.resolve('denied');
    if (Notification.permission === 'granted') return Promise.resolve('granted');
    return Notification.requestPermission().catch(function () { return 'denied'; });
  }

  function envoyer(titre, corps) {
    if (LN) {
      LN.schedule({ notifications: [Object.assign(style({ color: '#0EA5E9' }), { id: 1, title: '✅ ' + titre, body: corps, largeBody: corps,
        schedule: { at: new Date(Date.now() + 1500), allowWhileIdle: true } })] }).catch(function () {});
      return;
    }
    if (tauri) { invoke('notify', { options: { title: titre, body: corps } }).catch(function () {}); return; }
    if (webOk() && Notification.permission === 'granted') {
      try { new Notification(titre, { body: corps, tag: 'sgos', icon: 'icons/icon-192.png' }); } catch (e) {}
    }
  }

  function basculer() {
    if (api.actif) {
      api.actif = false;
      ecrire(PREF, 'off');
      if (LN) annulerTout();
      changed();
      return Promise.resolve(false);
    }
    return demanderPermission().then(function (p) {
      api.permission = p;
      api.actif = p === 'granted';
      ecrire(PREF, api.actif ? 'on' : 'off');
      changed();
      if (api.actif) { marquerPassees(); api.essai(); signature = ''; programmer(); }
      return api.actif;
    });
  }

  // ---------- suivi des cartes ----------
  function jour() {
    var d = new Date();
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
  }
  function cartesDuJour() {
    try {
      var s = JSON.parse(localStorage.getItem(KEY) || '{}');
      var d = (s.days || {})[jour()];
      return ((d && d.cards) || []).filter(function (c) { return c.start !== null && c.start !== undefined; });
    } catch (e) { return []; }
  }
  function envoyes() {
    try { var o = JSON.parse(lire(SENT, '{}')); return o && o[jour()] ? o : { [jour()]: [] }; }
    catch (e) { var x = {}; x[jour()] = []; return x; }
  }
  function noter(id) {
    var o = envoyes();
    var j = jour();
    o[j] = (o[j] || []).concat([id]);
    ecrire(SENT, JSON.stringify({ [j]: o[j] }));   // on ne garde que la journée en cours
  }
  function dejaEnvoye(id) { return (envoyes()[jour()] || []).indexOf(id) !== -1; }

  // À l'activation : les cartes déjà passées ne sont pas annoncées après coup.
  function marquerPassees() {
    var now = new Date();
    var h = now.getHours() + now.getMinutes() / 60;
    cartesDuJour().forEach(function (c) {
      var a = avanceDe(c);
      if (a >= 0 && c.start - a / 60 <= h - FENETRE_MIN / 60 && !dejaEnvoye(c.id)) noter(c.id);
    });
  }

  function fmt(h) {
    var t = Math.round(h * 60);
    return ('0' + (Math.floor(t / 60) % 24)).slice(-2) + ':' + ('0' + (t % 60)).slice(-2);
  }
  function duree(d) {
    var hh = Math.floor(d), mm = Math.round((d - hh) * 60);
    return hh && mm ? hh + ' h ' + mm : (hh ? hh + ' h' : mm + ' min');
  }

  function verifier() {
    if (!api.actif || LN) return;                           // Android : les rappels sont déjà programmés
    var now = new Date();
    var h = now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
    cartesDuJour().forEach(function (c) {
      if (c.status !== 'plan') return;                      // déjà réalisée ou abandonnée
      var a = avanceDe(c);
      if (a < 0) return;                                    // pas de rappel pour cette carte
      var t = c.start - a / 60;                             // heure du rappel
      if (h < t || h > t + FENETRE_MIN / 60) return;
      if (dejaEnvoye(c.id)) return;
      noter(c.id);
      var fin = fmt(c.start + c.dur);
      var dans = a ? 'Dans ' + (a >= 60 && a % 60 === 0 ? a / 60 + ' h' : a + ' min') + ' · ' : '';
      var corps = dans + fmt(c.start) + ' – ' + fin + ' · ' + duree(c.dur) + (c.desc ? '\n' + c.desc : '');
      envoyer(c.title, corps);
    });
  }


  // ---------- Android : notifications programmées ----------
  function canal() {
    if (!LN || !LN.createChannel) return;
    LN.createChannel({ id: CANAL, name: 'Rappels des cartes', description: "À l'heure de chaque carte de l'emploi du temps",
      importance: 4, visibility: 1, lights: true, lightColor: '#0EA5E9', vibration: true }).catch(function () {});
  }
  function style(c) {
    return { channelId: CANAL, smallIcon: 'ic_stat_sgos', largeIcon: 'ic_large_sgos', iconColor: c.color || '#0EA5E9',
      group: 'sgos', autoCancel: true };
  }
  function sansAccents(t) { return String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); }
  var EMOJIS = [
    [/fajr|dhuhr|dohr|asr|maghrib|isha|jumu|priere|religion|coran|wird|hadith|qiyam|tarawih|jalsa|dhikr/, '🕌'],
    [/prepa|recap|seance|revision|etude|cours|td|tp|examen|controle|algebre|analyse|algo|python|signal|stage|lecture|devoir/, '📚'],
    [/sport|muscu|course|marche|randonnee|foot|natation|velo|gym|seance de sport|abdo|pompes/, '🏋️'],
    [/repas|dejeuner|diner|petit dej|collation|nutrition|cuisine|manger/, '🍽️'],
    [/permis|conduite|code de la route/, '🚗'],
    [/dormir|sommeil|sieste|reveil/, '😴'],
    [/argent|banque|courses|achat|paiement/, '💳'],
    [/appel|reunion|rendez|rdv|meeting|equipe/, '📞']
  ];
  function emoji(c, cat) {
    var t = sansAccents((cat || '') + ' ' + c.title);
    for (var i = 0; i < EMOJIS.length; i++) if (EMOJIS[i][0].test(t)) return EMOJIS[i][1];
    return '⏰';
  }
  function hash(s) { var h = 0; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h % 2000000000) + 10; }
  function iso(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }

  function aProgrammer() {
    var s; try { s = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { return []; }
    var tags = {}; (s.tags || []).forEach(function (t) { tags[t.id] = t; });
    var out = [], now = Date.now();
    for (var j = 0; j < JOURS; j++) {
      var d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + j);
      var cards = (((s.days || {})[iso(d)] || {}).cards || []);
      cards.forEach(function (c) {
        if (c.start === null || c.start === undefined || c.status !== 'plan') return;
        var a = avanceDe(c); if (a < 0) return;
        var at = d.getTime() + (c.start * 60 - a) * 60000;
        if (at < now + 5000) return;
        var cat = ((c.tags || []).map(function (id) { return tags[id]; }).filter(Boolean)[0] || {});
        var quand = (a ? 'Dans ' + (a >= 60 && a % 60 === 0 ? a / 60 + ' h' : a + ' min') : 'Maintenant') + ' · ' + fmt(c.start) + ' – ' + fmt(c.start + c.dur) + ' (' + duree(c.dur) + ')';
        var details = [quand];
        if (c.desc) details.push(String(c.desc).split('\n')[0]);
        (c.check || []).filter(function (i) { return !i.done; }).slice(0, 5).forEach(function (i) { details.push('☐ ' + i.txt); });
        out.push(Object.assign(style({ color: c.color || cat.color }), {
          id: hash(iso(d) + c.id), title: emoji(c, cat.name) + ' ' + c.title, body: quand, largeBody: details.join('\n'),
          summaryText: cat.name || 'SGOS', schedule: { at: new Date(at), allowWhileIdle: true },
          extra: { sgos: 1, jour: iso(d), carte: c.id }
        }));
      });
    }
    return out.sort(function (x, y) { return x.schedule.at - y.schedule.at; }).slice(0, 300);
  }
  function annulerTout() {
    return LN.getPending().then(function (r) {
      var ids = (r.notifications || []).filter(function (n) { return n.extra && n.extra.sgos; }).map(function (n) { return { id: n.id }; });
      return ids.length ? LN.cancel({ notifications: ids }) : null;
    }).catch(function () {});
  }
  var signature = '', enCours = false;
  function programmer() {
    if (!LN || !api.actif || enCours) return;
    var liste = aProgrammer();
    var sig = JSON.stringify(liste.map(function (n) { return [n.id, +n.schedule.at, n.title, n.largeBody]; }));
    if (sig === signature) return;
    enCours = true;
    annulerTout().then(function () {
      return liste.length ? LN.schedule({ notifications: liste }) : null;
    }).then(function () { signature = sig; }).catch(function () {}).then(function () { enCours = false; });
  }
  if (LN) {
    setInterval(programmer, 30000);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) programmer(); });
  }

  // ---------- démarrage ----------
  function quandPret(f) {   // Android : attendre le pont Capacitor (au plus ~10 s)
    if (!cap) return f();
    var n = 0, t = setInterval(function () {
      if ((window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.LocalNotifications) || ++n > 50) { clearInterval(t); f(); }
    }, 200);
  }
  quandPret(function () {
  if (lire(PREF, 'off') === 'on') {
    demanderPermission().then(function (p) {
      api.permission = p;
      api.actif = p === 'granted';
      if (!api.actif) ecrire(PREF, 'off'); else { marquerPassees(); programmer(); }
      changed();
    });
  }
  });
  setInterval(verifier, 20000);
  verifier();
})();
