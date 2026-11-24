// Tests des fichiers : rien d'oublié ou de mal nommé ?
// Lancer : npm test
// Pourquoi c'est important : si UN SEUL fichier de la liste du service worker (sw.js)
// manque, le navigateur refuse toute la mise en cache, et l'appli ne marche plus hors-ligne.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const racine = path.join(__dirname, "..");
const lireTexte = (f) => fs.readFileSync(path.join(racine, f), "utf8");
const existe = (f) => fs.existsSync(path.join(racine, f));

// Extrait le tableau « const NOM = [ … ]; » d'un fichier JavaScript.
function tableau(fichier, nom) {
  const m = new RegExp(`const ${nom} = \\[([\\s\\S]*?)\\];`).exec(lireTexte(fichier));
  assert.ok(m, `tableau ${nom} introuvable dans ${fichier}`);
  return [...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]);
}

test("hors-ligne : chaque fichier mis en cache par sw.js existe", () => {
  const manquants = tableau("sw.js", "FILES").filter((f) => f !== "./" && !existe(f));
  assert.deepEqual(manquants, [], "fichiers listés dans sw.js mais absents du dépôt");
});

test("hors-ligne : les données et pages de index.html sont dans le cache", () => {
  const cache = new Set(tableau("sw.js", "FILES"));
  const indispensables = [
    ...fs.readdirSync(path.join(racine, "data")).filter((f) => f.endsWith(".json")).map((f) => `data/${f}`),
    ...[...lireTexte("index.html").matchAll(/(?:src|href)="([^"#:?]+\.(?:js|css|html|webmanifest))"/g)].map((m) => m[1]),
  ];
  const oublies = [...new Set(indispensables)].filter((f) => !f.startsWith("js/vendor/") && !cache.has(f));
  assert.deepEqual(oublies, [], "à ajouter dans FILES de sw.js (et changer VERSION)");
});

test("applis Android et iPhone : chaque fichier à copier existe", () => {
  const manquants = tableau("scripts/build-web.js", "FILES").filter((f) => !existe(f));
  assert.deepEqual(manquants, [], "fichiers listés dans scripts/build-web.js mais absents du dépôt");
});

test("pages HTML : chaque fichier local cité existe", () => {
  const pages = fs.readdirSync(racine).filter((f) => f.endsWith(".html"));
  const casses = pages.flatMap((page) =>
    [...lireTexte(page).matchAll(/(?:src|href)="([^"]+)"/g)]
      .map((m) => m[1].split(/[?#]/)[0])
      // Sur GitHub Pages, le site vit sous /biblio-VSS/ : ce préfixe correspond à la racine du dépôt.
      .map((lien) => lien.replace(/^\/biblio-VSS\//, "./"))
      .filter((lien) => lien && !/^(https?:|mailto:|tel:|sms:|data:|\/\/)/.test(lien) && !existe(lien))
      .map((lien) => `${page} → ${lien}`)
  );
  assert.deepEqual(casses, [], "liens vers des fichiers absents");
});

test("manifeste : les icônes de l'appli installable existent", () => {
  const manifeste = JSON.parse(lireTexte("manifest.webmanifest"));
  const manquantes = (manifeste.icons || []).map((i) => i.src).filter((src) => !existe(src));
  assert.deepEqual(manquantes, [], "icônes du manifeste absentes");
});
