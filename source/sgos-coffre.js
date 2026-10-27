/* SGOS — Coffre des données
 * Garde les données de SGOS à trois endroits pour qu'elles ne se perdent pas :
 *   1. localStorage (là où l'application lit et écrit),
 *   2. une copie miroir dans IndexedDB (restaure si localStorage est vidé),
 *   3. un fichier de données sur le disque : relié une fois (File System Access API) dans
 *      un navigateur, ou écrit automatiquement dans Documents\SGOS par le programme Windows.
 * Au démarrage, la version la plus récente des trois gagne.
 * S'exécute avant l'application et survit au remplacement du document par le bundler.
 */
(function () {
  if (window.__sgosCoffre) return;

  var KEYS = ['sgos.v1', 'sgos.theme', 'sgos.cache'];   // sgos.cache : horaires de prière et météo (dernière copie, pour le hors-ligne)
  var STAMP = 'sgos.savedAt';
  var DB_NAME = 'sgos-coffre';
  var STORE = 'kv';
  var FILE_TYPES = [{ description: 'Données SGOS', accept: { 'application/json': ['.json'] } }];
  var rawSet = Storage.prototype.setItem;
  // Programme Windows (Tauri) : il écrit lui-même dans Documents\SGOS, sans sélecteur de fichier.
  var tauri = window.__TAURI_INTERNALS__ && typeof window.__TAURI_INTERNALS__.invoke === 'function';
  var hasFS = !tauri && typeof window.showSaveFilePicker === 'function' && typeof window.showOpenFilePicker === 'function';

  var mem = {};              // dernières valeurs connues des clés SGOS
  var st = {
    ready: false,
    savedAt: 0,              // horodatage de la dernière modification
    handle: null,            // FileSystemFileHandle du fichier de données
    perm: 'none',            // 'none' | 'granted' | 'prompt' | 'denied'
    diskAt: 0,               // dernière écriture réussie sur le disque
    autoPath: '',            // programme Windows : chemin de la sauvegarde automatique
    error: '',
    persisted: false,
    open: false
  };

  // ---------- IndexedDB ----------
  var dbp = null;
  function db() {
    if (!dbp) {
      dbp = new Promise(function (res, rej) {
        var r = indexedDB.open(DB_NAME, 1);
        r.onupgradeneeded = function () { r.result.createObjectStore(STORE); };
        r.onsuccess = function () { res(r.result); };
        r.onerror = function () { rej(r.error); };
      });
    }
    return dbp;
  }
  function idb(mode, fn) {
    return db().then(function (d) {
      return new Promise(function (res, rej) {
        var tx = d.transaction(STORE, mode);
        var q = fn(tx.objectStore(STORE));
        tx.oncomplete = function () { res(q && q.result); };
        tx.onerror = function () { rej(tx.error); };
      });
    });
  }
  var idbGet = function (k) { return idb('readonly', function (s) { return s.get(k); }); };
  var idbPut = function (k, v) { return idb('readwrite', function (s) { return s.put(v, k); }); };
  var idbDel = function (k) { return idb('readwrite', function (s) { return s.delete(k); }); };

  // ---------- utilitaires ----------
  function hasData(d) { return !!(d && d['sgos.v1']); }
  function same(a, b) { return KEYS.every(function (k) { return (a[k] || null) === (b[k] || null); }); }
  function snapshot() { return { savedAt: st.savedAt, data: Object.assign({}, mem) }; }
  function lsSet(k, v) { try { rawSet.call(localStorage, k, v); } catch (e) { /* quota : les miroirs gardent la valeur */ } }
  function hhmms(t) { var d = new Date(t); return hhmm(t) + ':' + ('0' + d.getSeconds()).slice(-2); }
  function hhmm(t) { var d = new Date(t); return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2); }

  function readLocal() {
    var d = {};
    KEYS.forEach(function (k) { var v = localStorage.getItem(k); if (v != null) d[k] = v; });
    return { savedAt: +localStorage.getItem(STAMP) || 0, data: d };
  }

  // Accepte le format du coffre, ou un export brut de `sgos.v1`.
  function parseBackup(text) {
    if (!text || !text.trim()) return null;
    var o = JSON.parse(text);
    if (o && o.app === 'SGOS' && o.data) return { savedAt: +o.savedAt || 0, data: o.data };
    if (o && (o.backlog || o.days)) return { savedAt: 0, data: { 'sgos.v1': text } };
    throw new Error('Ce fichier ne contient pas de données SGOS.');
  }
  function serialize() {
    return JSON.stringify({ app: 'SGOS', format: 1, savedAt: st.savedAt, data: mem });
  }

  // ---------- écriture ----------
  var mirrorTimer = null;
  var diskChain = Promise.resolve();

  var listeners = [];
  function notify() { listeners.forEach(function (f) { try { f(); } catch (e) {} }); }

  function onChange(k, v) {
    mem[k] = v;
    if (!st.saving) { st.saving = true; notify(); }
    st.savedAt = Date.now();
    lsSet(STAMP, String(st.savedAt));
    clearTimeout(mirrorTimer);
    mirrorTimer = setTimeout(flush, 300);
  }

  function flush() {
    clearTimeout(mirrorTimer);
    var snap = snapshot();
    var p = idbPut('snapshot', snap).catch(function () {}).then(render);
    return Promise.all([p, writeDisk(), autoSave()]).then(function () {
      st.saving = false; st.lastOk = Date.now(); notify();
    }, function () { st.saving = false; notify(); });
  }

  function writeDisk() {
    if (!st.handle || st.perm !== 'granted') return Promise.resolve();
    diskChain = diskChain.then(function () {
      return st.handle.createWritable().then(function (w) {
        return w.write(serialize()).then(function () { return w.close(); });
      }).then(function () {
        st.diskAt = Date.now();
        st.error = '';
      }, function (e) {
        st.error = 'Écriture sur le disque impossible (' + (e && e.message || e) + ').';
        if (e && (e.name === 'NotAllowedError' || e.name === 'SecurityError')) st.perm = 'prompt';
      }).then(render);
    });
    return diskChain;
  }

  // Programme Windows : chaque modification part dans Documents\SGOS (+ copie du jour).
  var autoChain = Promise.resolve();
  function today() {
    var d = new Date();
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
  }
  function autoSave() {
    if (!tauri || !hasData(mem)) return Promise.resolve();
    var contenu = serialize();
    autoChain = autoChain.then(function () {
      return window.__TAURI_INTERNALS__.invoke('sauvegarder', { contenu: contenu, jour: today() }).then(function (path) {
        st.autoPath = path; st.diskAt = Date.now(); st.error = '';
      }, function (e) {
        st.error = 'Sauvegarde automatique impossible (' + (e && e.message || e) + ').';
      }).then(render);
    });
    return autoChain;
  }
  function readAuto() {
    if (!tauri) return Promise.resolve(null);
    return window.__TAURI_INTERNALS__.invoke('lire_sauvegarde').then(parseBackup).catch(function () { return null; });
  }

  Storage.prototype.setItem = function (k, v) {
    var err = null;
    try { rawSet.call(this, k, v); } catch (e) { err = e; }
    if (this === window.localStorage && KEYS.indexOf(k) !== -1) onChange(k, String(v));
    if (err) throw err;
  };

  // Remplace les données locales par `snap`, met les miroirs à jour, recharge.
  function applyAndReload(snap, fromDisk) {
    mem = Object.assign({}, snap.data);
    st.savedAt = snap.savedAt || Date.now();
    KEYS.forEach(function (k) {
      if (mem[k] != null) lsSet(k, mem[k]); else localStorage.removeItem(k);
    });
    lsSet(STAMP, String(st.savedAt));
    var jobs = [idbPut('snapshot', snapshot()).catch(function () {})];
    if (!fromDisk) jobs.push(writeDisk());
    return Promise.all(jobs).then(function () {
      try { sessionStorage.setItem('sgos.coffre.reload', String(Date.now())); } catch (e) {}
      location.reload();
    });
  }
  function recentlyReloaded() {
    try { return Date.now() - (+sessionStorage.getItem('sgos.coffre.reload') || 0) < 8000; } catch (e) { return false; }
  }

  // ---------- fichier de données ----------
  function queryPerm(h) {
    if (!h || !h.queryPermission) return Promise.resolve('none');
    return h.queryPermission({ mode: 'readwrite' }).catch(function () { return 'prompt'; });
  }
  function readHandle(h) {
    return h.getFile().then(function (f) { return f.text(); }).then(parseBackup);
  }

  // Après avoir obtenu l'accès au fichier : la version la plus récente gagne.
  function syncWithFile() {
    return readHandle(st.handle).then(function (file) {
      if (file && hasData(file.data) && file.savedAt > st.savedAt && !same(file.data, mem)) {
        return applyAndReload(file, true);
      }
      return writeDisk();
    }).catch(function (e) {
      st.error = 'Lecture du fichier impossible (' + (e && e.message || e) + ').';
      render();
    });
  }

  function createFile() {
    return window.showSaveFilePicker({ suggestedName: 'SGOS-donnees.json', types: FILE_TYPES }).then(function (h) {
      st.handle = h; st.perm = 'granted';
      return idbPut('handle', h).catch(function () {}).then(writeDisk);
    }).catch(cancelled);
  }

  function openFile() {
    var h;
    return window.showOpenFilePicker({ types: FILE_TYPES, multiple: false }).then(function (list) {
      h = list[0];
      return h.requestPermission({ mode: 'readwrite' });
    }).then(function (p) {
      if (p !== 'granted') { st.error = 'Accès au fichier refusé.'; return render(); }
      return readHandle(h).then(function (file) {
        var replace = file && hasData(file.data) && !same(file.data, mem);
        if (replace && hasData(mem) && !confirm('Remplacer les données de ce navigateur par celles du fichier « ' + h.name + ' » ?\n\nAnnuler : le fichier ne sera pas relié.')) return;
        st.handle = h; st.perm = 'granted';
        return idbPut('handle', h).catch(function () {}).then(function () {
          return replace ? applyAndReload(file, true) : writeDisk();
        });
      });
    }).catch(cancelled);
  }

  function reconnect() {
    if (!st.handle) return Promise.resolve();
    return st.handle.requestPermission({ mode: 'readwrite' }).then(function (p) {
      st.perm = p;
      if (p === 'granted') return syncWithFile();
      st.error = 'Accès au fichier refusé.';
      render();
    }).catch(cancelled);
  }

  function unlink() {
    st.handle = null; st.perm = 'none'; st.diskAt = 0; st.error = '';
    return idbDel('handle').catch(function () {}).then(render);
  }

  function cancelled(e) {
    if (e && e.name === 'AbortError') return;   // sélecteur fermé
    st.error = (e && e.message) || String(e);
    render();
  }

  // ---------- copie manuelle (tous navigateurs) ----------
  function exportCopy() {
    var d = new Date();
    var name = 'SGOS-sauvegarde-' + d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2) + '.json';
    // Application Android : la WebView ignore les téléchargements, le module natif écrit dans Téléchargements/SGOS.
    if (window.__sgosNative) {
      window.__sgosNative.saveFile({ name: name, content: serialize(), mime: 'application/json' }).then(function (r) {
        st.error = ''; lsSet('sgos.lastExport', String(Date.now())); render();
        alert('Copie enregistrée : ' + r.path);
      }, function (e) { st.error = 'Copie impossible (' + (e && e.message || e) + ').'; render(); });
      return;
    }
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([serialize()], { type: 'application/json' }));
    a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 5000);
    lsSet('sgos.lastExport', String(Date.now()));
    render();
  }

  function importText(text, skipConfirm) {
    var snap;
    try { snap = parseBackup(text); } catch (e) { st.error = e.message; render(); return Promise.resolve(false); }
    if (!snap || !hasData(snap.data)) { st.error = 'Ce fichier est vide.'; render(); return Promise.resolve(false); }
    if (!skipConfirm && hasData(mem) && !confirm('Remplacer toutes les données actuelles par cette copie ?')) return Promise.resolve(false);
    snap.savedAt = Date.now();   // la copie importée devient la plus récente partout
    return applyAndReload(snap, false).then(function () { return true; });
  }

  function importCopy() {
    var i = document.createElement('input');
    i.type = 'file';
    i.accept = '.json,application/json';
    i.onchange = function () {
      if (i.files && i.files[0]) i.files[0].text().then(function (t) { importText(t); });
    };
    i.click();
  }

  // ---------- démarrage ----------
  function boot() {
    var local = readLocal();
    mem = Object.assign({}, local.data);
    st.savedAt = local.savedAt;
    if (hasData(mem) && !st.savedAt) { st.savedAt = Date.now(); lsSet(STAMP, String(st.savedAt)); }

    var persist = (navigator.storage && navigator.storage.persist)
      ? navigator.storage.persist().then(function (ok) { st.persisted = !!ok; }, function () {})
      : Promise.resolve();

    var snapP = idbGet('snapshot').catch(function () { return null; });
    var handleP = hasFS ? idbGet('handle').catch(function () { return null; }) : Promise.resolve(null);

    return Promise.all([snapP, handleP, persist, readAuto()]).then(function (r) {
      var snap = r[0];
      var auto = r[3];
      st.handle = r[1] || null;
      return queryPerm(st.handle).then(function (perm) {
        st.perm = st.handle ? perm : 'none';
        var fileP = st.perm === 'granted' ? readHandle(st.handle).catch(function () { return null; }) : Promise.resolve(null);
        return fileP.then(function (file) {
          var best = { savedAt: st.savedAt, data: mem };
          if (snap && hasData(snap.data) && snap.savedAt > best.savedAt) best = snap;
          if (file && hasData(file.data) && file.savedAt > best.savedAt) best = file;
          if (auto && hasData(auto.data) && auto.savedAt > best.savedAt) best = auto;
          if (best.data !== mem && !same(best.data, mem) && !recentlyReloaded()) {
            return applyAndReload(best, best === file);
          }
          st.ready = true;
          var jobs = [];
          if (hasData(mem) && (!snap || snap.savedAt !== st.savedAt)) jobs.push(idbPut('snapshot', snapshot()).catch(function () {}));
          if (st.perm === 'granted' && hasData(mem) && (!file || file.savedAt < st.savedAt)) jobs.push(writeDisk());
          if (st.perm === 'granted' && file && file.savedAt === st.savedAt) st.diskAt = st.savedAt;
          if (tauri && hasData(mem)) jobs.push(auto && auto.savedAt === st.savedAt ? (st.diskAt = st.savedAt, Promise.resolve()) : autoSave());
          return Promise.all(jobs).then(render);
        });
      });
    }).catch(function (e) {
      st.ready = true;
      st.error = 'Coffre : ' + ((e && e.message) || e);
      render();
    });
  }

  window.addEventListener('pagehide', flush);
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') flush(); });

  // ---------- interface ----------
  var CSS = [
    '#sgos-coffre{position:fixed;left:0;bottom:0;z-index:4;width:288px;max-width:100vw;font-family:Inter,system-ui,sans-serif;color:var(--sg-ink,#02181E);background:var(--sg-surface,#fff);border-top:1px solid var(--sg-line,#E5E8EA);border-right:1px solid var(--sg-line,#E5E8EA);font-variant-numeric:tabular-nums}',
    '#sgos-coffre *{box-sizing:border-box}',
    '#sgos-coffre .cf-row{display:flex;align-items:center;gap:9px;width:100%;padding:12px 20px;border:none;background:transparent;color:inherit;cursor:pointer;text-align:left;font:inherit}',
    '#sgos-coffre .cf-dot{width:7px;height:7px;flex:0 0 7px;background:var(--sg-notag,#C8CDD1)}',
    '#sgos-coffre .cf-dot.ok{background:var(--sg-accent2,#00A8E8)}',
    '#sgos-coffre .cf-dot.warn{background:transparent;border:1px solid var(--sg-accent,#0080A7)}',
    '#sgos-coffre .cf-lab{font-weight:700;font-size:10.5px;letter-spacing:.16em;text-transform:uppercase}',
    '#sgos-coffre .cf-st{font-size:11px;color:var(--sg-muted2,#7A8792);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1;min-width:0}',
    '#sgos-coffre .cf-st.warn{color:var(--sg-accent,#0080A7)}',
    '#sgos-coffre .cf-pane{padding:16px 20px 6px;border-bottom:1px solid var(--sg-line,#E5E8EA)}',
    '#sgos-coffre .cf-txt{margin:0 0 12px;font-size:11.5px;line-height:1.6;color:var(--sg-muted,#5A646B)}',
    '#sgos-coffre .cf-txt b{font-weight:600;color:var(--sg-ink,#02181E)}',
    '#sgos-coffre .cf-err{margin:0 0 12px;font-size:11.5px;line-height:1.5;color:var(--sg-accent,#0080A7)}',
    '#sgos-coffre .cf-btns{display:flex;flex-direction:column;gap:6px;margin-bottom:12px}',
    '#sgos-coffre .cf-btn{padding:9px 12px;border:1px solid var(--sg-border,#DCE0E2);border-radius:10px;background:transparent;color:var(--sg-ink,#02181E);cursor:pointer;text-align:left;font:inherit;font-size:12.5px}',
    '#sgos-coffre .cf-btn:hover{border-color:var(--sg-accent,#0080A7)}',
    '#sgos-coffre .cf-btn.main{border-color:var(--sg-accent,#0080A7);color:var(--sg-accent,#0080A7);font-weight:600}',
    '#sgos-coffre .cf-sep{height:1px;background:var(--sg-line2,#EFF1F2);margin:4px 0 12px}',
    '#sgos-coffre .cf-foot{font-size:10.5px;color:var(--sg-dim,#8A949B);line-height:1.6;margin:0 0 10px}'
  ].join('');

  function status() {
    if (tauri) {
      if (st.error) return { dot: 'warn', warn: true, text: 'Sauvegarde à vérifier' };
      return { dot: 'ok', warn: false, text: st.diskAt ? 'Sauvegardé · ' + hhmms(st.diskAt) : 'Sauvegarde automatique' };
    }
    if (st.handle && st.perm === 'granted') {
      return { dot: 'ok', warn: false, text: st.diskAt ? 'Sur le disque · ' + hhmm(st.diskAt) : 'Fichier relié · ' + st.handle.name };
    }
    if (st.handle) return { dot: 'warn', warn: true, text: 'Cliquez pour reconnecter le fichier' };
    return { dot: '', warn: false, text: st.savedAt ? 'Enregistré · ' + hhmms(st.savedAt) : (hasFS ? 'Dans ce navigateur seulement' : 'Dans ce navigateur · exportez une copie') };
  }

  function btn(label, fn, main) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'cf-btn' + (main ? ' main' : '');
    b.textContent = label;
    b.onclick = function (e) { e.stopPropagation(); st.error = ''; fn(); };
    return b;
  }
  function para(cls, html) { var p = document.createElement('p'); p.className = cls; p.innerHTML = html; return p; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function render() {
    notify();
    var root = document.getElementById('sgos-coffre');
    if (!root) return;
    root.innerHTML = '';
    var s = status();

    if (st.open) {
      var pane = document.createElement('div');
      pane.className = 'cf-pane';
      if (tauri) {
        pane.appendChild(para('cf-txt', 'Chaque ajout ou modification est <b>enregistré automatiquement</b> sur votre disque, sans rien faire : <b>' +
          esc(st.autoPath || 'Documents\\SGOS\\SGOS-donnees.json') + '</b>. Une copie de chaque journée est gardée dans <b>Documents\\SGOS\\historique</b> (120 derniers jours).'));
      } else if (st.handle && st.perm === 'granted') {
        pane.appendChild(para('cf-txt', 'Chaque modification est enregistrée dans <b>' + esc(st.handle.name) + '</b> sur votre disque. Même si le navigateur est vidé, rouvrez SGOS et reconnectez ce fichier : tout revient.'));
      } else if (st.handle) {
        pane.appendChild(para('cf-txt', 'Le fichier <b>' + esc(st.handle.name) + '</b> est relié, mais le navigateur demande votre accord à chaque ouverture. Choisissez « Autoriser à chaque visite » pour ne plus le voir.'));
      } else if (hasFS) {
        pane.appendChild(para('cf-txt', 'Vos données sont dans ce navigateur, avec une copie de secours interne. Pour qu\'elles ne puissent <b>jamais</b> se perdre, reliez un fichier de données sur votre disque : il est mis à jour à chaque modification.'));
      } else {
        pane.appendChild(para('cf-txt', 'Ce navigateur ne permet pas d\'écrire directement sur le disque. Vos données y sont gardées avec une copie de secours interne ; <b>exportez une copie</b> régulièrement, ou ouvrez SGOS avec Chrome ou Edge pour relier un fichier.'));
      }
      if (st.error) pane.appendChild(para('cf-err', esc(st.error)));

      var box = document.createElement('div');
      box.className = 'cf-btns';
      if (hasFS) {
        if (!st.handle) {
          box.appendChild(btn('Créer le fichier de données…', createFile, true));
          box.appendChild(btn('Ouvrir un fichier existant…', openFile));
        } else if (st.perm !== 'granted') {
          box.appendChild(btn('Reconnecter « ' + st.handle.name + ' »', reconnect, true));
          box.appendChild(btn('Choisir un autre fichier…', openFile));
          box.appendChild(btn('Délier le fichier', unlink));
        } else {
          box.appendChild(btn('Choisir un autre fichier…', openFile));
          box.appendChild(btn('Délier le fichier', unlink));
        }
      }
      pane.appendChild(box);
      var pwa = window.__sgosPwa;
      if (pwa && pwa.prompt) {
        var sep0 = document.createElement('div'); sep0.className = 'cf-sep'; pane.appendChild(sep0);
        var box0 = document.createElement('div');
        box0.className = 'cf-btns';
        box0.appendChild(btn('Installer SGOS sur cet appareil', pwa.install, true));
        pane.appendChild(box0);
      }
      var sep = document.createElement('div'); sep.className = 'cf-sep'; pane.appendChild(sep);
      var box2 = document.createElement('div');
      box2.className = 'cf-btns';
      box2.appendChild(btn('Exporter une copie', exportCopy, !hasFS));
      box2.appendChild(btn('Importer une copie…', importCopy));
      pane.appendChild(box2);
      var last = +localStorage.getItem('sgos.lastExport') || 0;
      pane.appendChild(para('cf-foot',
        'Dernière modification : ' + (st.savedAt ? new Date(st.savedAt).toLocaleString('fr-FR') : '—') + '<br>' +
        'Dernière copie exportée : ' + (last ? new Date(last).toLocaleDateString('fr-FR') : 'jamais') + '<br>' +
        'Stockage protégé par le navigateur : ' + (st.persisted ? 'oui' : 'non')));
      root.appendChild(pane);
    }

    var row = document.createElement('button');
    row.type = 'button';
    row.className = 'cf-row';
    row.title = 'Coffre des données';
    row.innerHTML = '<span class="cf-dot ' + s.dot + '"></span><span class="cf-lab">Données</span><span class="cf-st' + (s.warn ? ' warn' : '') + '">' + esc(s.text) + '</span>';
    row.onclick = function () {
      if (!st.open && st.handle && st.perm !== 'granted') { reconnect(); return; }
      st.open = !st.open;
      render();
    };
    root.appendChild(row);
  }

  // Le bundler remplace le document : on (re)monte l'interface dès que l'app est là,
  // et on la masque quand un panneau de l'app (voile) est ouvert.
  function mount() {
    if (!document.body || document.getElementById('__bundler_loading') || !st.ready) return;
    if (!document.getElementById('sgos-coffre-css')) {
      var css = document.createElement('style');
      css.id = 'sgos-coffre-css';
      css.textContent = CSS;
      (document.head || document.body).appendChild(css);
    }
    var root = document.getElementById('sgos-coffre');
    if (!root) {
      root = document.createElement('div');
      root.id = 'sgos-coffre';
      document.body.appendChild(root);
      render();
    }
    if (window.__sgosPwa && !window.__sgosPwa.onchange) window.__sgosPwa.onchange = render;
    var overlay = document.querySelector('[style*="--sg-scrim"]');
    root.style.display = overlay ? 'none' : '';
  }
  setInterval(mount, 400);

  window.__sgosCoffre = {
    state: st,
    flush: flush,
    subscribe: function (f) { listeners.push(f); },
    exportCopy: exportCopy,
    importText: importText,
    _useHandle: function (h) { st.handle = h; st.perm = 'granted'; return idbPut('handle', h).then(syncWithFile); }
  };

  // ---------- mise à jour en direct ----------
  // Un agent IA (serveur MCP SGOS) ou un autre appareil peut modifier le fichier sur le disque :
  // s'il devient plus récent que ce qui est affiché, l'application le recharge.
  // Pas pendant une saisie ni un glisser, pour ne pas couper l'utilisateur.
  var pointerDown = false;
  window.addEventListener('mousedown', function () { pointerDown = true; }, true);
  window.addEventListener('mouseup', function () { pointerDown = false; }, true);
  window.addEventListener('dragend', function () { pointerDown = false; }, true);
  var watching = false;
  function watchDisk() {
    if (watching || !st.ready || pointerDown) return;
    var a = document.activeElement;
    if (a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) return;
    var read = tauri ? readAuto()
      : (st.handle && st.perm === 'granted' ? readHandle(st.handle).catch(function () { return null; }) : null);
    if (!read) return;
    watching = true;
    read.then(function (f) {
      watching = false;
      if (f && hasData(f.data) && f.savedAt > st.savedAt && !same(f.data, mem) && !pointerDown) applyAndReload(f, true);
    }, function () { watching = false; });
  }
  setInterval(watchDisk, 2000);

  boot();
})();
