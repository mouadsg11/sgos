/* SGOS — application installable (PWA)
 * Servi en http(s) : déclare le manifeste, enregistre le service worker (hors ligne)
 * et expose le bouton « Installer ». Ouvert en file:// : ne fait que donner un titre.
 * Remet ses balises dans <head> après le remplacement du document par le bundler.
 */
(function () {
  if (window.__sgosPwa) return;
  // servi en ligne (hors programme de bureau Tauri, qui n'a pas besoin de manifeste ni de service worker)
  // (ni l'application Android Capacitor : elle embarque déjà ses fichiers)
  // window.SGOS_APP est posé par build.py dans la page de l'APK (Capacitor est injecté plus tard que ce script)
  var served = /^https?:$/.test(location.protocol) && location.hostname !== 'tauri.localhost' && !window.SGOS_APP && !window.Capacitor;
  var FAVICON = '__SGOS_FAVICON__';   // remplacé par build.py (icône intégrée pour le mode fichier)

  // Application Android : module natif (impression PDF, enregistrement de fichiers), cherché au moment de
  // l'utiliser — le pont Capacitor n'existe pas encore quand ce script s'exécute. null hors de l'APK.
  var nativeMod = null;
  Object.defineProperty(window, '__sgosNative', { configurable: true, get: function () {
    var C = window.Capacitor;
    // le pont natif expose les greffons dans Capacitor.Plugins (registerPlugin vient du paquet @capacitor/core, absent ici)
    if (!nativeMod && C && C.isNativePlatform && C.isNativePlatform()) nativeMod = (C.Plugins && C.Plugins.SgosNative) || (C.registerPlugin ? C.registerPlugin('SgosNative') : null);
    return nativeMod;
  } });
  // Interface téléphone (classe « sg-app » sur <html>) : seulement dans l'application Android,
  // ou avec ?app=1 dans l'adresse pour la tester dans un navigateur.
  var APP = window.__sgosApp = !!window.SGOS_APP || /[?&]app=1\b/.test(location.search);

  var api = window.__sgosPwa = {
    prompt: null,
    installed: window.matchMedia && matchMedia('(display-mode: standalone)').matches,
    onchange: null,
    install: function () {
      if (!api.prompt) return;
      var p = api.prompt;
      p.prompt();
      p.userChoice.then(function () { api.prompt = null; changed(); });
    }
  };
  function changed() { if (typeof api.onchange === 'function') api.onchange(); }

  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); api.prompt = e; changed(); });
  window.addEventListener('appinstalled', function () { api.prompt = null; api.installed = true; changed(); });

  var HEAD = served ? [
    ['link', { rel: 'manifest', href: 'manifest.webmanifest' }],
    ['meta', { name: 'theme-color', content: '#FFFFFF', media: '(prefers-color-scheme: light)' }],
    ['meta', { name: 'theme-color', content: '#0A0D0E', media: '(prefers-color-scheme: dark)' }],
    ['link', { rel: 'icon', href: 'icons/favicon-32.png', sizes: '32x32' }],
    ['link', { rel: 'apple-touch-icon', href: 'icons/apple-touch-icon.png' }],
    ['meta', { name: 'mobile-web-app-capable', content: 'yes' }],
    ['meta', { name: 'apple-mobile-web-app-capable', content: 'yes' }],
    ['meta', { name: 'apple-mobile-web-app-title', content: 'SGOS' }]
  ] : (FAVICON.indexOf('data:') === 0 ? [['link', { rel: 'icon', href: FAVICON }]] : []);

  function ensureHead() {
    if (APP && !document.documentElement.classList.contains('sg-app')) document.documentElement.classList.add('sg-app');
    var head = document.head;
    if (!head) return;
    if (!document.title) document.title = 'SGOS';
    HEAD.forEach(function (d) {
      var a = d[1];
      var sel = d[0] + Object.keys(a).filter(function (k) { return k !== 'content' && k !== 'href'; })
        .map(function (k) { return '[' + k + '="' + a[k] + '"]'; }).join('');
      if (head.querySelector(sel)) return;
      var el = document.createElement(d[0]);
      Object.keys(a).forEach(function (k) { el.setAttribute(k, a[k]); });
      head.appendChild(el);
    });
  }
  ensureHead();
  setInterval(ensureHead, 1000);
  // le bundler remplace le document au démarrage : remettre vite la classe de l'interface téléphone
  if (APP) setInterval(function () { if (!document.documentElement.classList.contains('sg-app')) document.documentElement.classList.add('sg-app'); }, 150);

  if (served && 'serviceWorker' in navigator) {
    var reg = function () { navigator.serviceWorker.register('sw.js').catch(function () {}); };
    if (document.readyState === 'complete') reg(); else window.addEventListener('load', reg);
  }
})();
