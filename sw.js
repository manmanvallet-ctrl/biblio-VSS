// Service worker : met l'application en cache pour qu'elle fonctionne hors-ligne.
// Pensez à changer VERSION à chaque mise à jour du contenu.
const VERSION = "biblio-vss-v10";
const FILES = [
  "./",
  "index.html",
  "css/style.css",
  "js/config.js",
  "js/app.js",
  "data/listes.json",
  "data/evenements.json",
  "data/aide.json",
  "data/comprendre.json",
  "confidentialite.html",
  "data/ressources.json",
  "manifest.webmanifest",
  "icons/icon.svg",
  "icons/icon-192.png",
  "icons/icon-512.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Réseau d'abord (contenu à jour), cache en secours (hors-ligne).
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET" || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(VERSION).then((c) => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
