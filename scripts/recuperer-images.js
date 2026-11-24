// Récupère l'image de chaque ressource (affiche, couverture, visuel de podcast)
// et l'enregistre, réduite, dans images/<id>.jpg.
//
// Sources :
//   - films, séries, documentaires : l'affiche de la page SensCritique (champ senscritique.url)
//   - livres, BD : la couverture sur Open Library (bibliothèque ouverte)
//   - podcasts : le visuel officiel sur Apple Podcasts
//
// Utilisation :
//   node scripts/recuperer-images.js            seulement les ressources sans image
//   node scripts/recuperer-images.js --force    toutes les ressources
//   node scripts/recuperer-images.js festen     une ressource précise (par son id)
//
// Pour imposer une source, ajoutez à la fiche "image_url" : une page SensCritique
// (le script en extrait l'affiche ou la couverture) ou le lien direct d'une image.
//
// Si aucune image fiable n'est trouvée, la ressource garde sa couverture colorée.

const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const ROOT = path.join(__dirname, "..");
const FILE = path.join(ROOT, "data", "ressources.json");
const DIR = path.join(ROOT, "images");
const WIDTH = 360; // largeur en pixels : net sur téléphone, léger à charger
const UA = "BiblioVSS-images/1.0 (recuperation des couvertures)";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const args = process.argv.slice(2);
const force = args.includes("--force");
const only = args.filter((a) => !a.startsWith("--"));

const norm = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
// Titre sans la traduction entre parenthèses : « Know My Name (Je m'appelle…) » → « Know My Name »
const mainTitle = (t) => String(t).replace(/\s*\(.*\)\s*$/, "").trim();
// Nom de famille de la première personne citée
const lastName = (a) => norm(String(a).split(/,| et /)[0]).split(" ").pop();

async function get(url, as = "json") {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return as === "json" ? res.json() : as === "text" ? res.text() : Buffer.from(await res.arrayBuffer());
}

// L'affiche est dans les données structurées (schema.org) de la page ; l'image
// og:image est souvent une photo de scène, utilisée seulement en dernier recours.
async function fromSensCritique(pageUrl) {
  const html = await get(pageUrl, "text");
  let poster = null;
  for (const [, raw] of html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const d = JSON.parse(raw);
      for (const n of Array.isArray(d) ? d : [d]) {
        const img = n && (typeof n.image === "string" ? n.image : n.image && n.image.url);
        if (img && n.aggregateRating !== undefined || (img && /Movie|TVSeries|Book|CreativeWork/.test(n["@type"]))) poster = poster || img;
      }
    } catch { /* bloc illisible */ }
  }
  if (poster) return { url: poster.replace(/\/media\/(\d+)\/\d+\//, "/media/$1/600/"), credit: "SensCritique" };
  const m = /<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i.exec(html);
  return m && !/missing/.test(m[1]) ? { url: m[1], credit: "SensCritique" } : null;
}

// Couverture d'une édition française sur Open Library (pas de couverture étrangère).
async function fromOpenLibrary(it) {
  const q = `title=${encodeURIComponent(mainTitle(it.titre))}&author=${encodeURIComponent(lastName(it.auteur))}`;
  const r = await get(`https://openlibrary.org/search.json?${q}&fields=key,title,author_name&limit=5`);
  const want = lastName(it.auteur);
  const work = (r.docs || []).find((d) => (d.author_name || []).some((a) => norm(a).includes(want)));
  if (!work) return null;
  const eds = await get(`https://openlibrary.org${work.key}/editions.json?limit=100`);
  const fr = (eds.entries || [])
    .filter((e) => (e.languages || []).some((l) => l.key === "/languages/fre"))
    .filter((e) => (e.covers || []).some((c) => c > 0))
    // la plus ancienne édition française d'abord (souvent l'édition d'origine)
    .sort((a, b) => (parseInt(/\d{4}/.exec(a.publish_date || "") || 9999, 10)) - (parseInt(/\d{4}/.exec(b.publish_date || "") || 9999, 10)));
  const cover = fr.length && fr[0].covers.find((c) => c > 0);
  return cover ? { url: `https://covers.openlibrary.org/b/id/${cover}-L.jpg?default=false`, credit: "Open Library" } : null;
}

// Complément pour les livres : Google Livres, éditions en français (quota limité).
async function fromGoogleBooks(it) {
  const q = `intitle:${mainTitle(it.titre)} inauthor:${lastName(it.auteur)}`;
  const r = await get(`https://www.googleapis.com/books/v1/volumes?langRestrict=fr&maxResults=5&q=${encodeURIComponent(q)}`);
  const v = (r.items || []).find((x) => x.volumeInfo && x.volumeInfo.imageLinks &&
    (x.volumeInfo.authors || []).some((a) => norm(a).includes(lastName(it.auteur))));
  if (!v) return null;
  const url = (v.volumeInfo.imageLinks.thumbnail || "").replace(/^http:/, "https:").replace(/&edge=curl/, "").replace(/zoom=\d/, "zoom=2");
  return url ? { url, credit: "Google Livres" } : null;
}

async function fromApplePodcasts(it) {
  const r = await get(`https://itunes.apple.com/search?media=podcast&country=fr&limit=5&term=${encodeURIComponent(mainTitle(it.titre))}`);
  const want = norm(mainTitle(it.titre));
  const x = (r.results || []).find((p) => norm(p.collectionName) === want);
  return x && x.artworkUrl600 ? { url: x.artworkUrl600, credit: "Apple Podcasts" } : null;
}

// Crédit lisible pour une image directe : le nom du service plutôt que l'adresse technique
// du serveur d'images (ex. « is1-ssl.mzstatic.com » est le serveur d'images d'Apple).
// Pour un site qui n'est pas dans la liste, renseignez « image_credit_source » dans la fiche.
const CREDIT_HOSTS = { "mzstatic.com": "Apple Podcasts", "senscritique.com": "SensCritique", "openlibrary.org": "Open Library", "handicap.fr": "Handicap.fr" };
function creditFromHost(url) {
  const host = new URL(url).hostname.replace(/^www\./, "");
  const known = Object.keys(CREDIT_HOSTS).find((h) => host === h || host.endsWith("." + h));
  return known ? CREDIT_HOSTS[known] : host;
}

async function findSource(it) {
  // Source indiquée à la main : une page SensCritique ou une image directe
  if (it.image_url) {
    if (/^https:\/\/www\.senscritique\.com\//.test(it.image_url)) return fromSensCritique(it.image_url);
    if (/^https:\/\//.test(it.image_url)) return { url: it.image_url, credit: it.image_credit_source || creditFromHost(it.image_url) };
  }
  if (it.senscritique && it.senscritique.url) return fromSensCritique(it.senscritique.url);
  if (it.categorie === "livre" || it.categorie === "bd") {
    return (await fromOpenLibrary(it)) || (await fromGoogleBooks(it).catch(() => null));
  }
  if (it.categorie === "podcast") return fromApplePodcasts(it);
  return null; // articles et rapports : pas d'image
}

async function main() {
  fs.mkdirSync(DIR, { recursive: true });
  const items = JSON.parse(fs.readFileSync(FILE, "utf8"));
  let ok = 0, none = 0, failed = 0;

  for (const it of items) {
    if (only.length && !only.includes(it.id)) continue;
    if (it.image && !force && !only.length) continue;
    try {
      const src = await findSource(it);
      if (!src) { console.log(`–  ${it.titre} : aucune image fiable trouvée`); none++; continue; }
      const buf = await get(src.url, "buffer");
      const out = path.join(DIR, `${it.id}.jpg`);
      await sharp(buf).resize({ width: WIDTH, withoutEnlargement: true }).jpeg({ quality: 78, mozjpeg: true }).toFile(out);
      it.image = `images/${it.id}.jpg`;
      it.image_credit = src.credit;
      console.log(`✔  ${it.titre} (${src.credit}) → ${it.image} (${Math.round(fs.statSync(out).size / 1024)} Ko)`);
      ok++;
    } catch (err) {
      console.log(`✖  ${it.titre} : échec (${err.message})`);
      failed++;
    }
    await sleep(1500);
  }

  fs.writeFileSync(FILE, JSON.stringify(items, null, 2) + "\n");
  console.log(`\n${ok} image(s) enregistrée(s), ${none} sans image, ${failed} échec(s).`);
}

main();
