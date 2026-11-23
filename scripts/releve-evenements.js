// Relève automatiquement les groupes de parole publiés par trois associations
// et met à jour data/evenements.json.
//
// Sources :
//  - CAIIP (caiip.group)            : groupes de parole victimes d'inceste et de pédocriminalité
//  - En Parler (associationenparler.com) : « rendez-vous » pour les victimes de violences sexuelles
//  - Pas de Secret (pas-de-secret.fr)    : groupe de parole mensuel à Nîmes
//
// Utilisation :  node scripts/releve-evenements.js
// Lancé automatiquement chaque semaine par .github/workflows/releve-evenements.yml
//
// Règles :
//  - Rien n'est inventé : un champ que la source ne donne pas reste vide.
//  - Chaque événement garde sa source et la date du relevé (affichées dans la fiche).
//  - Si une source ne répond pas ou a changé de forme, ses événements déjà connus
//    sont conservés tels quels (on ne vide pas l'agenda à cause d'une panne).
//  - Les événements ajoutés à la main ou par la veille (autres identifiants) ne sont pas touchés.
//  - Les événements passés sont retirés.

const fs = require("fs");
const path = require("path");

const FILE = path.join(__dirname, "..", "data", "evenements.json");
const USER_AGENT = "BiblioVSS-agenda/1.0 (releve hebdomadaire des groupes de parole)";
const MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const DAYS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];

const pad = (n) => String(n).padStart(2, "0");
const isoDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const TODAY = isoDate(new Date());

async function get(url, as = "text") {
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, "Accept-Language": "fr-FR" },
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} sur ${url}`);
  return as === "json" ? res.json() : res.text();
}

const NAMED = {
  eacute: "é", egrave: "è", ecirc: "ê", euml: "ë", agrave: "à", acirc: "â", ccedil: "ç", icirc: "î", iuml: "ï",
  ocirc: "ô", ugrave: "ù", ucirc: "û", Eacute: "É", rsquo: "’", lsquo: "‘", laquo: "«", raquo: "»", hellip: "…", ndash: "–",
};

function decodeEntities(s) {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z]+);/gi, (all, name) => NAMED[name] || all)
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"')
    .replace(/&#039;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
}

// Texte d'une page HTML, une ligne par bloc.
function htmlToLines(html) {
  const text = html
    .replace(/<(script|style|noscript)[\s\S]*?<\/\1>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h\d|li|span|section)>/gi, "\n")
    .replace(/<[^>]+>/g, "");
  return decodeEntities(text).split("\n").map((l) => l.replace(/[​\s]+/g, " ").trim()).filter(Boolean);
}

// ---------------------------------------------------------------- CAIIP
// Le site utilise le module de réservation Amelia, qui publie les groupes à venir
// au format JSON (c'est ce que lit la page elle-même pour les afficher).
const CAIIP_PAGE = "https://caiip.group/groupes-de-parole/";
const CAIIP_API = "https://caiip.group/wp-admin/admin-ajax.php?action=wpamelia_api&call=";
const CAIIP_CITY = { LYON: "Lyon", PARIS: "Paris", RENNES: "Rennes", LILLE: "Lille", NEVERS: "Nevers", "EN LIGNE": "En ligne" };

async function releveCaiip() {
  const ent = await get(`${CAIIP_API}/entities&types=tags,locations&lite=true`, "json");
  const tags = ent.data.tags.filter((t) => t.eventId === null).map((t) => t.name);
  const locations = new Map(ent.data.locations.map((l) => [l.id, l]));
  if (!tags.length) throw new Error("aucune ville trouvée");
  const out = [];
  for (const tag of tags) {
    const ville = CAIIP_CITY[tag] || tag.charAt(0) + tag.slice(1).toLowerCase();
    const data = await get(`${CAIIP_API}/events&bookings=false&tag%5B%5D=${encodeURIComponent(tag)}&range=future&page=1`, "json");
    for (const e of data.data.events) {
      const loc = locations.get(e.locationId);
      if (e.status !== "approved" || e.show === false) continue;
      if (/test/i.test(e.name) || (loc && /test/i.test(loc.name))) continue;
      const theme = (/Session\s*"([^"]+)"/.exec(e.name) || [])[1];
      const proches = loc && /proches/i.test(loc.name);
      const groupe = (/Groupe\s+(\d+)\s*$/i.exec(e.name) || [])[1];
      const visio = /en visio/i.test(e.name);
      const enLigne = ville === "En ligne";
      const complet = e.full === true || e.places === 0;
      for (const p of e.periods || []) {
        const [date, time] = String(p.periodStart).split(" ");
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
        out.push({
          id: `caiip-${e.id}-${date}`,
          titre: (enLigne ? "Groupe de parole en ligne" : "Groupe de parole") +
            (proches ? " – proches de victimes d'inceste et de pédocriminalité" : " – victimes d'inceste et de pédocriminalité") +
            (groupe ? ` (groupe ${groupe})` : ""),
          type: "Groupe de parole",
          date,
          heure: (time || "").slice(0, 5),
          ville,
          lieu: enLigne ? "Visioconférence" : (loc ? loc.address || loc.name : "") + (visio ? " (en visio)" : ""),
          organisateur: "CAIIP",
          description:
            (proches ? "Groupe de parole du CAIIP pour les proches de personnes victimes d'inceste ou de pédocriminalité. "
              : "Groupe de parole du CAIIP pour les personnes majeures victimes d'inceste ou de pédocriminalité, et leurs proches. ") +
            (theme ? `Thème du mois : « ${theme} ». ` : "") +
            "Animé par des bénévoles formé·es. Adhésion gratuite à l'association demandée, puis inscription en ligne." +
            (enLigne ? " Les inscriptions ferment le jour même à 12 h." : "") +
            (complet ? ` Complet lors du relevé du ${frDate(TODAY)} : des places peuvent se libérer.` : ""),
          gratuit: true,
          lien: CAIIP_PAGE,
          source: CAIIP_PAGE,
        });
      }
    }
  }
  return out;
}

// ---------------------------------------------------------------- En Parler
// Page Wix : chaque antenne a un titre « Ville : », une adresse e-mail, puis des
// lignes « mardi 8 décembre (femmes) ». L'année n'est pas écrite : on la déduit
// du jour de la semaine (on ne garde la date que si le jour correspond).
const ENP_PAGE = "https://www.associationenparler.com/les-rendez-vous";
const ENP_PUBLIC = {
  femmes: "Réservé aux femmes. ", hommes: "Réservé aux hommes. ", mixte: "Groupe mixte. ",
  proches: "Pour les proches de victimes. ", victimes: "",
};

function guessYear(day, month, weekday) {
  const now = new Date();
  for (const y of [now.getFullYear(), now.getFullYear() + 1]) {
    const d = new Date(y, month, day);
    if (d.getMonth() === month && DAYS[d.getDay()] === weekday && isoDate(d) >= TODAY) return isoDate(d);
  }
  return null;
}

async function releveEnParler() {
  const lines = htmlToLines(await get(ENP_PAGE));
  const out = [];
  let ville = null, mail = null, found = 0;
  const dateRe = new RegExp(`^(${DAYS.join("|")})\\s+(\\d{1,2})(?:er)?\\s+(${MONTHS.join("|")})\\s*(?:\\(\\s*([a-zé]+)\\s*\\))?$`, "i");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const head = /^([A-ZÉÈ][\p{L} -]+?)\s*:$/u.exec(line);
    if (head) { ville = /visio/i.test(head[1]) ? "En ligne" : head[1].trim(); mail = null; continue; }
    if (!ville) continue;
    const m = /^([a-z0-9.-]+@enparler\.org)$/i.exec(line);
    if (m) { mail = m[1].toLowerCase(); continue; }
    const d = dateRe.exec(line);
    if (!d) continue;
    // Le public est parfois écrit sur la ligne suivante : « (femmes) ».
    const next = /^\(\s*([a-zé]+)\s*\)$/i.exec(lines[i + 1] || "");
    if (!d[4] && next) { d[4] = next[1]; i++; }
    found++;
    const date = guessYear(Number(d[2]), MONTHS.indexOf(d[3].toLowerCase()), d[1].toLowerCase());
    if (!date) continue; // passée, ou jour de la semaine incohérent : on ne devine pas
    const pub = (d[4] || "victimes").toLowerCase();
    out.push({
      id: `enparler-${ville.toLowerCase().replace(/[^a-z]/g, "")}-${date}${pub !== "victimes" ? "-" + pub : ""}`,
      titre: "Rendez-vous En Parler – " + (pub === "proches" ? "proches de victimes de violences sexuelles" : "victimes de violences sexuelles"),
      type: "Groupe de parole",
      date,
      ville,
      lieu: ville === "En ligne" ? "Visioconférence" : "Lieu communiqué à l'inscription",
      organisateur: "En Parler",
      description: (ENP_PUBLIC[pub] || "") +
        "Groupe de parole animé par des bénévoles de l'association, souvent d'anciennes victimes, pour échanger, partager son vécu, ou s'informer avant de porter plainte. Pas besoin de donner son identité. " +
        (mail ? `Pour s'inscrire : écrire à ${mail} pour recevoir les invitations, puis répondre à l'invitation. ` : "") +
        "L'heure est indiquée dans l'invitation.",
      lien: ENP_PAGE,
      source: ENP_PAGE,
    });
  }
  // Garde-fou : si la page ne contient plus aucune date lisible, c'est qu'elle a changé de forme.
  if (!found) throw new Error("aucune date lisible sur la page");
  return out;
}

// ---------------------------------------------------------------- Pas de Secret
// L'agenda liste des pages d'événements ; chaque page résume la date dans sa
// description : « 17 décembre 2026 @ 18h30 - 20h30 - … ».
const PDS_AGENDA = "https://www.pas-de-secret.fr/agenda/";

async function relevePasDeSecret() {
  const html = await get(PDS_AGENDA);
  const links = [...new Set([...html.matchAll(/https:\/\/www\.pas-de-secret\.fr\/agenda\/([a-z0-9-]+)\//g)].map((m) => m[0]))]
    .filter((u) => !/\/agenda\/categories\//.test(u));
  const out = [];
  for (const url of links) {
    const page = await get(url);
    const meta = (p) => decodeEntities((new RegExp(`<meta property="og:${p}" content="([^"]*)"`).exec(page) || [])[1] || "");
    const desc = meta("description");
    const m = new RegExp(`^(\\d{1,2}) (${MONTHS.join("|")}) (\\d{4}) @ (\\d{1,2})h(\\d{2})`, "i").exec(desc);
    if (!m) continue;
    const date = `${m[3]}-${pad(MONTHS.indexOf(m[2].toLowerCase()) + 1)}-${pad(m[1])}`;
    if (date < TODAY) continue;
    const titre = meta("title").replace(/\s+-\s+Association PAS DE SECRET.*$/i, "").replace(/\s+(Janvier|Février|Mars|Avril|Mai|Juin|Juillet|Août|Septembre|Octobre|Novembre|Décembre)$/i, "");
    const parole = /groupe de parole/i.test(titre);
    out.push({
      id: `pas-de-secret-${date}`,
      titre: parole ? "Groupe de parole pour adultes victimes d'inceste" : titre,
      type: parole ? "Groupe de parole" : "Atelier",
      date,
      heure: `${pad(m[4])}:${m[5]}`,
      ville: "Nîmes",
      lieu: "Lieu communiqué par e-mail",
      organisateur: "Pas de Secret",
      description: parole
        ? "Groupe de parole mensuel pour les adultes victimes d'inceste, dans un cadre sécurisant et bienveillant, sans jugement et dans la confidentialité. Contacter l'association par e-mail pour l'inscription et le lieu."
        : desc.replace(/^.*?@[^-]+-[^-]+-\s*/, "").replace(/\s*\[\.\.\.\]\s*$/, "…"),
      gratuit: parole || undefined,
      lien: url,
      source: url,
    });
  }
  return out;
}

// ---------------------------------------------------------------- Assemblage
function frDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

const SOURCES = [
  { nom: "CAIIP", prefixe: "caiip-", relever: releveCaiip },
  { nom: "En Parler", prefixe: "enparler-", relever: releveEnParler },
  { nom: "Pas de Secret", prefixe: "pas-de-secret-", relever: relevePasDeSecret },
];

async function main() {
  const before = JSON.parse(fs.readFileSync(FILE, "utf8"));
  let events = before.slice();
  for (const s of SOURCES) {
    try {
      const fresh = (await s.relever()).map((e) => ({ ...e, releve: TODAY }));
      events = events.filter((e) => !String(e.id).startsWith(s.prefixe)).concat(fresh);
      console.log(`✓ ${s.nom} : ${fresh.length} événement(s) à venir`);
    } catch (err) {
      console.log(`✗ ${s.nom} : ${err.message} (événements déjà connus conservés)`);
    }
  }
  // Retire les événements passés, supprime les doublons d'identifiant, trie par date.
  const seen = new Set();
  events = events
    .filter((e) => (e.fin || e.date) >= TODAY)
    .filter((e) => (seen.has(e.id) ? false : seen.add(e.id)))
    .map((e) => Object.fromEntries(Object.entries(e).filter(([, v]) => v !== undefined && v !== "")))
    .sort((a, b) => (a.date + (a.heure || "") + a.id).localeCompare(b.date + (b.heure || "") + b.id));

  // N'écrit le fichier que si quelque chose a changé en dehors de la date de relevé,
  // pour éviter un enregistrement chaque semaine sans nouveauté.
  const strip = (list) => JSON.stringify(list.map(({ releve, ...rest }) => rest).sort((a, b) => a.id.localeCompare(b.id)));
  if (strip(events) === strip(before)) {
    console.log("Aucun changement dans l'agenda.");
    return;
  }
  fs.writeFileSync(FILE, JSON.stringify(events, null, 2) + "\n");
  console.log(`Agenda mis à jour : ${events.length} événement(s) à venir.`);
}

main().catch((err) => { console.error(err); process.exit(1); });
