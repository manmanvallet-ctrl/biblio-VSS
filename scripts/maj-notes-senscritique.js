// Met à jour les notes SensCritique de data/ressources.json.
//
// Pour chaque ressource qui a un champ "senscritique": { "url": ... }, le script
// lit la page SensCritique et en extrait la note moyenne publiée au format
// standard schema.org (AggregateRating), celui que lisent les moteurs de recherche.
//
// Utilisation :  node scripts/maj-notes-senscritique.js
// Lancé automatiquement chaque mois par .github/workflows/notes-senscritique.yml
//
// En cas d'échec sur une page, l'ancienne note est conservée.

const fs = require("fs");
const path = require("path");

const FILE = path.join(__dirname, "..", "data", "ressources.json");
const DELAY_MS = 3000; // une page toutes les 3 secondes, pour ne pas surcharger le site
const USER_AGENT = "BiblioVSS-notes/1.0 (mise a jour mensuelle des notes)";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Cherche un objet AggregateRating dans les blocs JSON-LD de la page.
function extractRating(html) {
  const blocks = [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)];
  for (const [, raw] of blocks) {
    let data;
    try { data = JSON.parse(raw); } catch { continue; }
    const nodes = Array.isArray(data) ? data : data["@graph"] || [data];
    for (const node of nodes) {
      const r = node && node.aggregateRating;
      if (r && r.ratingValue != null) {
        const note = Number(r.ratingValue);
        const count = Number(r.ratingCount || 0);
        const best = Number(r.bestRating || 10);
        if (Number.isFinite(note) && note >= 0 && note <= 10 && best === 10) return { note, count };
      }
    }
  }
  return null;
}

async function main() {
  const items = JSON.parse(fs.readFileSync(FILE, "utf8"));
  const month = new Date().toISOString().slice(0, 7); // AAAA-MM
  let updated = 0, unchanged = 0, failed = 0;

  for (const it of items) {
    const sc = it.senscritique;
    if (!sc || !/^https:\/\/www\.senscritique\.com\//.test(sc.url || "")) continue;
    try {
      const res = await fetch(sc.url, { headers: { "User-Agent": USER_AGENT, "Accept-Language": "fr-FR" } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const rating = extractRating(await res.text());
      if (!rating) {
        // Pas de note publiée (trop peu de votes) : on garde seulement le lien.
        console.log(`–  ${it.titre} : pas de note publiée`);
        unchanged++;
      } else {
        const note = Math.round(rating.note * 10) / 10;
        const changed = note !== sc.note;
        it.senscritique = { note, url: sc.url, releve: month };
        console.log(`${changed ? "✔" : "="}  ${it.titre} : ${sc.note ?? "–"} → ${note}`);
        changed ? updated++ : unchanged++;
      }
    } catch (err) {
      console.log(`✖  ${it.titre} : échec (${err.message}), ancienne note conservée`);
      failed++;
    }
    await sleep(DELAY_MS);
  }

  fs.writeFileSync(FILE, JSON.stringify(items, null, 2) + "\n");
  console.log(`\n${updated} note(s) modifiée(s), ${unchanged} inchangée(s), ${failed} échec(s).`);
  // Échec complet = probablement un changement sur le site : on le signale.
  if (failed && !updated && !unchanged) process.exit(1);
}

main();
