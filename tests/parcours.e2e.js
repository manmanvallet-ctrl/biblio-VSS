// Test de parcours (de bout en bout) : un robot utilise l'appli dans un vrai navigateur
// sans fenêtre (Chromium piloté par Playwright), comme le ferait une personne sur son téléphone.
// Lancer : npm run test:parcours   (le test démarre lui-même un petit serveur local)
// Option : CAPTURES=dossier pour enregistrer une capture d'écran à chaque étape.
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright");

const racine = path.join(__dirname, "..");
const CAPTURES = process.env.CAPTURES;
const SORTIE = "https://www.google.com/"; // début de exitUrl (js/config.js)

const ressources = JSON.parse(fs.readFileSync(path.join(racine, "data/ressources.json"), "utf8"));
const sansAccents = (s) => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

// ---------- Petit serveur web local, pour ne dépendre de rien d'autre que Node ----------
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json",
  ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".webmanifest": "application/manifest+json" };
let serveur, navigateur, adresse;

before(async () => {
  serveur = http.createServer((req, res) => {
    const chemin = decodeURIComponent(new URL(req.url, "http://x").pathname);
    const fichier = path.join(racine, chemin.endsWith("/") ? chemin + "index.html" : chemin);
    if (!fichier.startsWith(racine) || !fs.existsSync(fichier) || fs.statSync(fichier).isDirectory()) {
      res.writeHead(404).end("introuvable");
      return;
    }
    res.writeHead(200, { "Content-Type": TYPES[path.extname(fichier)] || "application/octet-stream" });
    fs.createReadStream(fichier).pipe(res);
  });
  await new Promise((ok) => serveur.listen(0, "127.0.0.1", ok));
  adresse = `http://127.0.0.1:${serveur.address().port}/`;
  navigateur = await chromium.launch();
});

after(async () => {
  await navigateur?.close();
  serveur?.close();
});

// Un nouveau « téléphone » vierge (aucun favori, aucune donnée enregistrée).
async function nouveauTelephone() {
  const contexte = await navigateur.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: CAPTURES ? 2 : 1 });
  // Aucune requête vers Internet pendant le test : le résultat ne dépend pas du réseau.
  await contexte.route((url) => !url.href.startsWith(adresse), (route) =>
    route.request().url().startsWith(SORTIE)
      ? route.fulfill({ contentType: "text/html; charset=utf-8", body: "<title>Météo</title>page neutre" })
      : route.fulfill({ status: 204 }));
  const page = await contexte.newPage();
  const erreurs = [];
  page.on("pageerror", (e) => erreurs.push(e.message));
  page.on("console", (m) => {
    if (m.type() !== "error") return;
    // Une couverture absente (hors-ligne) est remplacée par une couverture générée : ce n'est pas un bug.
    if (/^Failed to load resource/.test(m.text()) && /\/images\//.test(m.location().url)) return;
    erreurs.push(`${m.text()} ${m.location().url}`);
  });
  const capture = async (nom) => {
    if (!CAPTURES) return;
    // Attendre la fin des animations (fondu entre onglets) pour une capture nette.
    await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished.catch(() => {}))));
    await page.screenshot({ path: `${CAPTURES}/${nom}.png` });
  };
  return { contexte, page, erreurs, capture };
}

const compteur = (page) => page.locator("#count").textContent();
const pluriel = (n) => `${n} ressource${n > 1 ? "s" : ""}`;

async function ouvrir(page) {
  await page.goto(adresse);
  await page.waitForSelector("#list .card");
}

test("première visite : avertissement, puis il ne revient plus", async () => {
  const { contexte, page, erreurs, capture } = await nouveauTelephone();
  await ouvrir(page);
  const accueil = page.locator("#welcome");
  assert.ok(await accueil.evaluate((d) => d.open), "l'avertissement doit s'afficher à la première ouverture");
  await capture("1-avertissement");
  await page.click("#welcome-ok");
  assert.equal(await accueil.evaluate((d) => d.open), false);
  await page.reload();
  await page.waitForSelector("#list .card");
  assert.equal(await accueil.evaluate((d) => d.open), false, "l'avertissement ne doit pas revenir");
  assert.deepEqual(erreurs, []);
  await contexte.close();
});

test("bibliothèque : recherche sans accents, catégorie, contenus moins durs", async () => {
  const { contexte, page, erreurs, capture } = await nouveauTelephone();
  await ouvrir(page);
  await page.click("#welcome-ok");
  assert.equal(await compteur(page), pluriel(ressources.length));
  await capture("2-bibliotheque");

  // « temoignage » tapé sans accent doit trouver les fiches « témoignage ».
  const attendu = ressources.filter((r) =>
    sansAccents([r.titre, r.auteur, r.annee, r.resume, ...r.themes].join(" ")).includes("temoignage")).length;
  assert.ok(attendu > 0);
  await page.fill("#search", "temoignage");
  assert.equal(await compteur(page), pluriel(attendu));
  await page.fill("#search", "zzzz-introuvable");
  assert.match(await page.textContent("#list"), /Aucun résultat/);
  await page.fill("#search", "");

  // Catégorie « Films » : uniquement des films.
  const films = ressources.filter((r) => r.categorie === "film").length;
  await page.click('[data-cat="film"]');
  assert.equal(await compteur(page), pluriel(films));
  for (const meta of await page.locator("#list .card-meta").allTextContents()) assert.match(meta, /^Film/);
  await page.click('[data-cat="tout"]');

  // « Contenus moins durs » masque les fiches d'intensité 3.
  const doux = ressources.filter((r) => r.intensite < 3).length;
  await page.check("#gentle");
  assert.equal(await compteur(page), pluriel(doux));
  assert.equal(await page.locator("#list .level-3").count(), 0);
  await capture("3-moins-durs");
  assert.deepEqual(erreurs, []);
  await contexte.close();
});

test("fiche très forte : résumé flouté jusqu'à ce qu'on appuie dessus", async () => {
  const { contexte, page, erreurs, capture } = await nouveauTelephone();
  await ouvrir(page);
  await page.click("#welcome-ok");
  const forte = ressources.find((r) => r.intensite === 3);
  await page.click(`#list .card[data-id="${forte.id}"]`);
  const resume = page.locator("#detail-resume");
  assert.equal(await resume.evaluate((p) => p.classList.contains("shown")), false, "le résumé doit être masqué");
  await capture("4-fiche-masquee");
  await resume.click();
  assert.equal(await resume.evaluate((p) => p.classList.contains("shown")), true);
  assert.deepEqual(erreurs, []);
  await contexte.close();
});

test("favoris : enregistrés sur le téléphone, toujours là après rechargement", async () => {
  const { contexte, page, erreurs, capture } = await nouveauTelephone();
  await ouvrir(page);
  await page.click("#welcome-ok");
  const premiere = page.locator("#list .card").first();
  const titre = await premiere.locator(".card-title").textContent();
  await premiere.locator(".fav-btn").click();
  assert.equal(await premiere.locator(".fav-btn").getAttribute("aria-pressed"), "true");
  await page.reload();
  await page.waitForSelector("#list .card");
  await page.click('.tab[data-view="favorites"]');
  await page.locator("#view-favorites.active #fav-list .card").first().waitFor(); // fondu entre onglets
  assert.deepEqual(await page.locator("#fav-list .card-title").allTextContents(), [titre]);
  await capture("5-favoris");
  assert.deepEqual(erreurs, []);
  await contexte.close();
});

test("aide : les numéros d'urgence s'appellent en un appui", async () => {
  const { contexte, page, erreurs, capture } = await nouveauTelephone();
  await ouvrir(page);
  await page.click("#welcome-ok");
  await page.click('.tab[data-view="help"]');
  await page.locator("#view-help.active").waitFor(); // fondu entre onglets
  for (const lien of ["tel:17", "sms:114", "tel:3919", "tel:119"]) {
    assert.ok(await page.locator(`#view-help a[href="${lien}"]`).first().isVisible(), `${lien} doit être visible`);
  }
  assert.ok(await page.locator("#aide-list li").count() > 0, "l'annuaire d'aide doit s'afficher");
  await capture("6-aide");
  assert.deepEqual(erreurs, []);
  await contexte.close();
});

test("sortie rapide : deux appuis sur Échap ouvrent un site neutre, sans retour possible", async () => {
  const { contexte, page, erreurs } = await nouveauTelephone();
  await page.goto("about:blank");
  await ouvrir(page);
  await page.click("#welcome-ok");
  await page.click(`#list .card`); // même avec une fiche ouverte
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
  await page.waitForURL((url) => url.href.startsWith(SORTIE));
  assert.equal(await page.title(), "Météo");
  // location.replace : l'appli n'est plus dans l'historique, « Retour » ne la rouvre pas.
  await page.goBack().catch(() => {});
  assert.ok(!page.url().startsWith(adresse), `le bouton Retour ne doit pas ramener dans l'appli (${page.url()})`);
  assert.deepEqual(erreurs, []);
  await contexte.close();
});

test("sortie rapide : le bouton toujours visible fonctionne aussi", async () => {
  const { contexte, page } = await nouveauTelephone();
  await ouvrir(page);
  await page.click("#welcome-ok");
  await page.click("#quick-exit");
  await page.waitForURL((url) => url.href.startsWith(SORTIE));
  await contexte.close();
});

test("hors-ligne : après une première visite, l'appli s'ouvre sans réseau", async () => {
  const { contexte, page, erreurs, capture } = await nouveauTelephone();
  await ouvrir(page);
  await page.click("#welcome-ok");
  // Attendre que le service worker ait tout mis en cache.
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(async () => {
    const cles = await caches.keys();
    if (!cles.length) return false;
    return !!(await (await caches.open(cles[0])).match("data/ressources.json"));
  });
  await contexte.setOffline(true);
  await page.reload();
  await page.waitForSelector("#list .card");
  assert.equal(await compteur(page), pluriel(ressources.length));
  await capture("7-hors-ligne");
  assert.deepEqual(erreurs, []);
  await contexte.close();
});
