// Tests des données : chaque fiche du dossier data/ est-elle complète et cohérente ?
// Lancer : npm test
// Ces tests ne lancent pas de navigateur : ils lisent les fichiers JSON et vérifient
// les règles décrites dans le README (catégories autorisées, intensité 1 à 3, liens https…).
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const racine = path.join(__dirname, "..");
const lire = (fichier) => JSON.parse(fs.readFileSync(path.join(racine, fichier), "utf8"));

const ressources = lire("data/ressources.json");
const listes = lire("data/listes.json");
const evenements = lire("data/evenements.json");
const aide = lire("data/aide.json");
const comprendre = lire("data/comprendre.json");

const CATEGORIES = ["livre", "film", "serie", "documentaire", "podcast", "article", "bd"];
const AIDE_CATEGORIES = ["ecoute", "jeunes", "groupes", "associations", "soins", "demarches", "prevention", "infos", "applis"];
const CONTACTS = ["tel", "web", "email", "tchat"];

const texteRempli = (v) => typeof v === "string" && v.trim().length > 0;
const https = (v) => typeof v === "string" && /^https:\/\/[^\s"'<>]+$/.test(v);
const dateIso = (v) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));

// Rassemble toutes les erreurs avant d'échouer : on voit d'un coup tout ce qui est à corriger.
function verifier(elements, nom, regles) {
  const erreurs = [];
  elements.forEach((el, i) => {
    const qui = `${nom} n°${i + 1} (${el.id ?? "sans id"})`;
    for (const [message, ok] of regles(el)) if (!ok) erreurs.push(`${qui} : ${message}`);
  });
  assert.deepEqual(erreurs, [], `\n${erreurs.join("\n")}`);
}

function sansDoublon(elements, nom) {
  const vus = new Set();
  const doublons = elements.map((e) => e.id).filter((id) => (vus.has(id) ? true : (vus.add(id), false)));
  assert.deepEqual(doublons, [], `identifiants en double dans ${nom}`);
}

test("ressources : chaque fiche a les champs obligatoires", () => {
  const annee = new Date().getFullYear();
  verifier(ressources, "Ressource", (r) => [
    ["id manquant ou mal formé (minuscules, chiffres et tirets)", typeof r.id === "string" && /^[a-z0-9-]+$/.test(r.id)],
    ["titre vide", texteRempli(r.titre)],
    ["auteur vide", texteRempli(r.auteur)],
    ["résumé vide", texteRempli(r.resume)],
    [`catégorie inconnue « ${r.categorie} »`, CATEGORIES.includes(r.categorie)],
    ["thèmes : il faut au moins un thème (liste de textes)", Array.isArray(r.themes) && r.themes.length > 0 && r.themes.every(texteRempli)],
    ["intensité : 1, 2 ou 3", [1, 2, 3].includes(r.intensite)],
    ["année invraisemblable", r.annee === undefined || (Number.isInteger(r.annee) && r.annee > 1800 && r.annee <= annee + 1)],
    ["lien : doit commencer par https://", r.lien === undefined || https(r.lien)],
  ]);
});

test("ressources : pas d'identifiant en double", () => sansDoublon(ressources, "ressources.json"));

test("ressources : chaque image existe et a un crédit", () => {
  verifier(ressources.filter((r) => r.image), "Ressource", (r) => [
    ["image : fichier du dossier images/ ou lien https", /^images\//.test(r.image) || https(r.image)],
    [`image introuvable : ${r.image}`, !/^images\//.test(r.image) || fs.existsSync(path.join(racine, r.image))],
    ["image sans crédit (image_credit)", texteRempli(r.image_credit)],
  ]);
});

test("ressources : notes SensCritique bien formées", () => {
  verifier(ressources.filter((r) => r.senscritique), "Ressource", (r) => [
    ["lien SensCritique en https", https(r.senscritique.url)],
    ["note entre 0 et 10", r.senscritique.note === undefined || r.senscritique.note === null || (r.senscritique.note >= 0 && r.senscritique.note <= 10)],
    ["date de relevé au format AAAA-MM", r.senscritique.releve === undefined || /^\d{4}-\d{2}$/.test(r.senscritique.releve)],
  ]);
});

test("listes thématiques : chaque ressource citée existe", () => {
  sansDoublon(listes, "listes.json");
  const ids = new Set(ressources.map((r) => r.id));
  verifier(listes, "Liste", (l) => [
    ["titre vide", texteRempli(l.titre)],
    ["description vide", texteRempli(l.description)],
    ["couleur au format #RRVVBB", l.couleur === undefined || /^#[0-9a-f]{6}$/i.test(l.couleur)],
    ["liste vide", Array.isArray(l.ressources) && l.ressources.length > 0],
    ...l.ressources.map((id) => [`ressource inexistante « ${id} »`, ids.has(id)]),
  ]);
});

test("agenda : chaque événement a une date valide et un lien https", () => {
  sansDoublon(evenements, "evenements.json");
  verifier(evenements, "Événement", (e) => [
    ["titre vide", texteRempli(e.titre)],
    ["ville vide (le filtre par ville en dépend)", texteRempli(e.ville)],
    ["date au format AAAA-MM-JJ", dateIso(e.date)],
    ["date de fin au format AAAA-MM-JJ, après le début", e.fin === undefined || (dateIso(e.fin) && e.fin >= e.date)],
    ["heure au format HH:MM", e.heure === undefined || /^([01]\d|2[0-3]):[0-5]\d$/.test(e.heure)],
    ["lien : doit commencer par https://", e.lien === undefined || https(e.lien)],
    ["source : doit commencer par https://", e.source === undefined || https(e.source)],
  ]);
});

test("aide : chaque contact est joignable", () => {
  sansDoublon(aide, "aide.json");
  verifier(aide, "Aide", (a) => [
    ["nom vide", texteRempli(a.nom)],
    [`catégorie inconnue « ${a.categorie} »`, AIDE_CATEGORIES.includes(a.categorie)],
    ["au moins un contact", Array.isArray(a.contacts) && a.contacts.length > 0],
    ...(a.contacts || []).flatMap((c) => [
      [`type de contact inconnu « ${c.type} »`, CONTACTS.includes(c.type)],
      [`téléphone mal formé « ${c.valeur} » (chiffres seulement, + autorisé au début)`, c.type !== "tel" || /^\+?\d{3,15}$/.test(c.valeur)],
      [`adresse e-mail mal formée « ${c.valeur} »`, c.type !== "email" || /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(c.valeur)],
      [`lien mal formé « ${c.valeur} » (https:// obligatoire)`, !["web", "tchat"].includes(c.type) || https(c.valeur)],
    ]),
  ]);
});

test("aide : les numéros d'urgence sont présents", () => {
  const numeros = new Set(aide.flatMap((a) => a.contacts.filter((c) => c.type === "tel").map((c) => c.valeur)));
  for (const n of ["3919", "119"]) assert.ok(numeros.has(n), `le ${n} manque dans l'annuaire d'aide`);
});

test("comprendre : définitions, rubriques et questionnaire cohérents", () => {
  sansDoublon(comprendre.definitions, "comprendre.json (définitions)");
  sansDoublon(comprendre.rubriques, "comprendre.json (rubriques)");
  const rubriques = new Set(comprendre.rubriques.map((r) => r.id));
  verifier(comprendre.definitions, "Définition", (d) => [
    ["terme vide", texteRempli(d.terme)],
    ["texte vide", texteRempli(d.texte)],
    [`rubrique inconnue « ${d.rubrique} »`, rubriques.has(d.rubrique)],
  ]);
  const questions = comprendre.questionnaire.questions;
  assert.ok(questions.length > 0, "le questionnaire n'a aucune question");
  sansDoublon(questions, "comprendre.json (questionnaire)");
  verifier(questions, "Question", (q) => [["texte vide", texteRempli(q.texte)]]);
});
