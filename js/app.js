(() => {
  "use strict";

  const CONFIG = Object.assign(
    { suggestionEndpoint: "", suggestionEmail: "", exitUrl: "https://www.google.com/search?q=m%C3%A9t%C3%A9o" },
    window.BIBLIO_CONFIG || {}
  );

  // Les couleurs des couvertures sont dans css/style.css (.cover-livre…), selon la charte.
  const CATEGORIES = {
    tout: { label: "Tout" },
    livre: { label: "Livres", one: "Livre", icon: "livre" },
    film: { label: "Films", one: "Film", icon: "film" },
    serie: { label: "Séries", one: "Série", icon: "serie" },
    documentaire: { label: "Documentaires", one: "Documentaire", icon: "documentaire" },
    podcast: { label: "Podcasts", one: "Podcast", icon: "podcast" },
    article: { label: "Articles & rapports", one: "Article / rapport", icon: "article" },
    bd: { label: "BD", one: "BD", icon: "bulle" },
  };

  // Petites icônes dessinées (traits), à la place des émojis : la charte les interdit,
  // et un émoji s'affiche différemment sur chaque téléphone.
  const UI_ICONS = {
    livre: '<path d="M5 4h11a2 2 0 0 1 2 2v14H7a2 2 0 0 1-2-2z"/><path d="M5 18a2 2 0 0 1 2-2h11"/>',
    film: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 5v14M17 5v14M3 9.5h4M3 14.5h4M17 9.5h4M17 14.5h4"/>',
    serie: '<rect x="3" y="7" width="18" height="12" rx="2"/><path d="m8 3 4 4 4-4"/>',
    documentaire: '<rect x="3" y="7" width="13" height="11" rx="2"/><path d="m16 11 5-3v9l-5-3"/>',
    podcast: '<path d="M4 15v-3a8 8 0 0 1 16 0v3"/><rect x="3" y="14" width="4" height="6" rx="1.5"/><rect x="17" y="14" width="4" height="6" rx="1.5"/>',
    article: '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 12h7M9 16h7"/>',
    bulle: '<path d="M4 5h16v11H10l-5 4v-4H4z"/>',
    lieu: '<path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>',
    date: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    groupe: '<circle cx="9" cy="8" r="3"/><path d="M3 20a6 6 0 0 1 12 0M16 5a3 3 0 0 1 0 6M21 20a6 6 0 0 0-4-5.6"/>',
    euro: '<path d="M17 6.5a6.5 6.5 0 1 0 0 11"/><path d="M4 10h9M4 14h9"/>',
    tel: '<path d="M6 3h3l1.5 4.5-2 1.5a11 11 0 0 0 6.5 6.5l1.5-2L21 15v3a2 2 0 0 1-2 2A17 17 0 0 1 4 5a2 2 0 0 1 2-2z"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
    web: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
    heure: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    // Même tracé que l'onglet « Favoris » de la navigation : un seul cœur dans toute l'appli.
    coeur: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
  };
  const ui = (name) => UI_ICONS[name]
    ? `<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${UI_ICONS[name]}</svg>`
    : "";

  const LEVELS = {
    1: "Intensité modérée",
    2: "Intensité forte",
    3: "Intensité très forte",
  };
  // Pastille d'intensité : 3 barres, dont 1, 2 ou 3 pleines (le niveau se lit sans la couleur).
  const levelHtml = (n) => LEVELS[n]
    ? `<span class="level level-${n}"><span class="level-bars" aria-hidden="true"><i></i><i></i><i></i></span>${LEVELS[n]}</span>`
    : "";

  const AIDE_CATEGORIES = {
    tout: "Tout",
    ecoute: "Lignes d'écoute",
    jeunes: "Enfants & jeunes",
    groupes: "Groupes de parole",
    associations: "Associations",
    soins: "Soins",
    demarches: "Démarches & plainte",
    prevention: "Prévention",
    infos: "S'informer",
    applis: "Applications utiles",
  };
  const MONTHS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

  // Date du relevé SensCritique ("AAAA-MM"), mise à jour chaque mois par
  // scripts/maj-notes-senscritique.js
  const scDate = (it) => {
    const m = /^(\d{4})-(\d{2})$/.exec((it.senscritique && it.senscritique.releve) || "");
    return m ? new Date(+m[1], +m[2] - 1, 1).toLocaleDateString("fr-FR", { month: "long", year: "numeric" }) : "";
  };
  const scNote = (it) => it.senscritique && typeof it.senscritique.note === "number"
    ? it.senscritique.note.toFixed(1).replace(".", ",") : null;
  const scBadge = (it) => scNote(it)
    ? `<span class="sc-badge" title="Note moyenne SensCritique">SC ${scNote(it)}</span>` : "";

  const FAV_KEY = "biblio-vss:favoris";
  const CITY_KEY = "biblio-vss:ville";
  const WELCOME_KEY = "biblio-vss:accueil-vu";

  const state = {
    items: [], lists: [], list: null, category: "tout", theme: "", query: "", gentle: false,
    events: [], eventCity: store0("biblio-vss:ville"), eventType: "",
    aide: [], aideCat: "tout", aideQuery: "",
    learn: null, learnQuery: "", learnRub: "",
  };
  function store0(key) { try { return JSON.parse(localStorage.getItem(key)) || ""; } catch { return ""; } }

  const $ = (sel) => document.querySelector(sel);
  const isNative = () => !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());

  // ---------- Stockage local (protégé si indisponible) ----------
  const store = {
    get(key, fallback) {
      try {
        const v = localStorage.getItem(key);
        return v === null ? fallback : JSON.parse(v);
      } catch { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignoré */ }
    },
  };
  const favorites = new Set(store.get(FAV_KEY, []));
  const saveFavorites = () => store.set(FAV_KEY, [...favorites]);

  // ---------- Utilitaires ----------
  const normalize = (s) =>
    String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

  const escapeHtml = (s) =>
    String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const safeUrl = (u) => (/^https:\/\//i.test(u || "") ? u : null);
  // Image : lien https ou fichier local du dossier images/
  const safeImage = (u) => (/^(https:\/\/|images\/)[^"'<>\s]+$/i.test(u || "") ? u : null);

  // ---------- Sortie rapide ----------
  // Remplace immédiatement l'écran par une page neutre (un bloc-notes vide),
  // puis ouvre un site neutre sans laisser l'application dans l'historique
  // (le bouton Retour ne ramène pas ici). Si la redirection est bloquée,
  // l'écran reste neutre.
  function quickExit() {
    document.querySelectorAll("dialog[open]").forEach((d) => d.close());
    document.title = "Notes";
    document.body.className = "neutral";
    document.body.innerHTML = '<div class="neutral-page"><h1>Notes</h1><textarea placeholder="Nouvelle note…" aria-label="Note"></textarea></div>';
    try { sessionStorage.clear(); } catch { /* ignoré */ }
    if (isNative()) {
      // Dans l'application : fermeture sur Android (iOS n'autorise pas une
      // application à se fermer elle-même : la page neutre reste affichée).
      const App = window.Capacitor.Plugins && window.Capacitor.Plugins.App;
      if (App && window.Capacitor.getPlatform() === "android") App.exitApp();
      return;
    }
    try { window.location.replace(CONFIG.exitUrl); } catch { /* bloqué : la page neutre reste */ }
  }
  $("#quick-exit").addEventListener("click", quickExit);

  // ---------- Mode clair / sombre ----------
  // Par défaut, l'appli suit le réglage du téléphone. L'interrupteur impose l'autre mode,
  // et ce choix est retenu sur cet appareil uniquement.
  const THEME_KEY = "biblio-vss:theme";
  const darkQuery = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : { matches: false };
  const THEME_ICONS = {
    // Soleil : affiché en mode sombre, pour revenir au clair
    light: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>',
    // Lune : affichée en mode clair, pour passer au sombre
    dark: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
  };
  const currentTheme = () => document.documentElement.dataset.theme || (darkQuery.matches ? "dark" : "light");
  function renderThemeToggle() {
    const next = currentTheme() === "dark" ? "light" : "dark";
    const btn = $("#theme-toggle");
    if (!btn) return;
    btn.innerHTML = `<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${THEME_ICONS[next]}</svg>`;
    btn.setAttribute("aria-label", next === "dark" ? "Passer en mode sombre" : "Passer en mode clair");
    btn.title = btn.getAttribute("aria-label");
  }
  const savedTheme = store.get(THEME_KEY, null);
  if (savedTheme === "light" || savedTheme === "dark") document.documentElement.dataset.theme = savedTheme;
  renderThemeToggle();
  $("#theme-toggle")?.addEventListener("click", () => {
    const next = currentTheme() === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    store.set(THEME_KEY, next);
    renderThemeToggle();
  });
  if (darkQuery.addEventListener) darkQuery.addEventListener("change", renderThemeToggle);
  let lastEsc = 0;
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    const now = Date.now();
    if (now - lastEsc < 600) quickExit();
    lastEsc = now;
  });

  // ---------- Couvertures ----------
  // Si la ressource a un champ "image", on l'affiche ; sinon on génère
  // une couverture typographique (aucune requête externe, aucun droit d'image).
  function coverHtml(it, size) {
    const cat = CATEGORIES[it.categorie] || {};
    const img = safeImage(it.image);
    if (img) {
      return `<div class="cover cover-${size}"><img src="${escapeHtml(img)}" alt="" loading="lazy"
        onerror="this.parentNode.classList.add('cover-fallback');this.remove()"></div>`;
    }
    const catClass = CATEGORIES[it.categorie] ? ` cover-${it.categorie}` : "";
    return `<div class="cover cover-${size} cover-gen${catClass}" aria-hidden="true">
        <span class="cover-icon">${ui(cat.icon)}</span>
        ${size === "s" ? "" : `<span class="cover-title">${escapeHtml(it.titre)}</span>
        <span class="cover-author">${escapeHtml(it.auteur)}</span>`}
      </div>`;
  }

  // ---------- Filtres ----------
  const hasFilters = () => state.list || state.category !== "tout" || state.theme || state.query.trim() || state.gentle;

  function filtered() {
    const q = normalize(state.query.trim());
    let items = state.items;
    if (state.list) {
      const byId = new Map(state.items.map((it) => [it.id, it]));
      items = state.list.ressources.map((id) => byId.get(id)).filter(Boolean);
    }
    return items.filter((it) => {
      if (state.category !== "tout" && !catsOf(it).includes(state.category)) return false;
      if (state.theme && !it.themes.includes(state.theme)) return false;
      if (state.gentle && it.intensite >= 3) return false;
      if (q) {
        const hay = normalize([it.titre, it.auteur, it.annee, it.resume, ...it.themes].join(" "));
        if (!q.split(/\s+/).every((w) => hay.includes(w))) return false;
      }
      return true;
    });
  }

  // ---------- Rendu ----------
  function cardHtml(it) {
    const cat = CATEGORIES[it.categorie] || { label: it.categorie };
    const isFav = favorites.has(it.id);
    return `
      <li class="card" tabindex="0" data-id="${escapeHtml(it.id)}">
        ${coverHtml(it, "s")}
        <div class="card-main">
          <p class="card-title">${escapeHtml(it.titre)}</p>
          <p class="card-meta">${[...catsOf(it).map((c) => CATEGORIES[c].one || CATEGORIES[c].label), it.auteur, it.annee].filter(Boolean).map(escapeHtml).join(" · ")}</p>
          <div class="tags">
            ${levelHtml(it.intensite)}
            ${scBadge(it)}
          </div>
          <div class="tags tags-themes">
            ${it.themes.map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join("")}
          </div>
        </div>
        <button class="fav-btn" type="button" data-fav="${escapeHtml(it.id)}"
          aria-pressed="${isFav}" aria-label="${isFav ? "Retirer des" : "Ajouter aux"} favoris">${ui("coeur")}</button>
      </li>`;
  }

  function renderLists() {
    // 3 tons qui alternent : vert d'eau (la première liste, « Pour commencer »), lavande, prune.
    $("#lists").innerHTML = state.lists.map((l, i) => {
      const n = l.ressources.filter((id) => state.items.some((it) => it.id === id)).length;
      return `<button class="list-card list-tone-${i % 3}" type="button" data-list="${escapeHtml(l.id)}">
          <span class="list-name">${escapeHtml(l.titre)}</span>
          <span class="list-desc">${escapeHtml(l.description)}</span>
          <span class="list-count">${n} ressource${n > 1 ? "s" : ""}</span>
        </button>`;
    }).join("");
  }

  function renderList() {
    const items = filtered();
    // Les listes thématiques s'affichent sur l'accueil, quand aucun filtre n'est actif.
    $("#lists-section").hidden = !!hasFilters() || !state.lists.length;
    const banner = $("#list-banner");
    banner.hidden = !state.list;
    if (state.list) {
      banner.innerHTML = `<div><strong>${escapeHtml(state.list.titre)}</strong><br><small>${escapeHtml(state.list.description)}</small></div>
        <button class="btn" type="button" data-list-close aria-label="Fermer la liste">✕</button>`;
    }
    $("#count").textContent = `${items.length} ressource${items.length > 1 ? "s" : ""}`;
    $("#list").innerHTML = items.length
      ? items.map(cardHtml).join("")
      : `<li class="empty">Aucun résultat. Essayez un autre mot-clé ou une autre catégorie.</li>`;
  }

  function renderFavorites() {
    const items = state.items.filter((it) => favorites.has(it.id));
    $("#fav-list").innerHTML = items.length
      ? items.map(cardHtml).join("")
      : `<li class="empty">Aucun favori pour l'instant. Appuyez sur ${ui("coeur")} pour en ajouter.</li>`;
  }

  // Catégorie ouverte dans la bibliothèque (pour pré-remplir « Proposer »)
  const libraryType = () => (state.category !== "tout" && CATEGORIES[state.category] ? state.category : "");

  function renderSuggestCta() {
    const t = libraryType();
    const art = { livre: "un", film: "un", serie: "une", documentaire: "un", podcast: "un", article: "un", bd: "une" };
    document.querySelectorAll(".suggest-cta").forEach((btn) => {
      const small = btn.classList.contains("btn-small");
      btn.textContent = t
        ? `＋ Proposer ${art[t]} ${CATEGORIES[t].one.toLowerCase()}`
        : small ? "＋ Proposer" : "＋ Proposer un livre, un film, un événement…";
    });
  }

  // Une ressource peut avoir plusieurs formats : « categorie » (le principal) + « aussi »
  // (ex. un livre que l'autrice présente dans un podcast). Elle apparaît sous chaque filtre.
  const catsOf = (it) => [it.categorie, ...(Array.isArray(it.aussi) ? it.aussi : [])].filter((c, i, a) => CATEGORIES[c] && a.indexOf(c) === i);

  function renderCategories() {
    renderSuggestCta();
    const counts = state.items.reduce((acc, it) => (catsOf(it).forEach((c) => (acc[c] = (acc[c] || 0) + 1)), acc), {});
    $("#categories").innerHTML = Object.entries(CATEGORIES)
      .filter(([key]) => key === "tout" || counts[key])
      .map(([key, c]) =>
        `<button class="chip${key === state.category ? " active" : ""}" type="button" aria-pressed="${key === state.category}" data-cat="${key}">${ui(c.icon)}${c.label}</button>`)
      .join("");
  }

  function renderThemes() {
    const themes = [...new Set(state.items.flatMap((it) => it.themes))].sort((a, b) => a.localeCompare(b, "fr"));
    $("#theme-filter").insertAdjacentHTML(
      "beforeend",
      themes.map((t) => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join("")
    );
  }

  function openDetail(id) {
    const it = state.items.find((x) => x.id === id);
    if (!it) return;
    const cat = CATEGORIES[it.categorie] || { label: it.categorie };
    const isFav = favorites.has(it.id);
    const strong = it.intensite >= 3;
    const link = safeUrl(it.lien);
    // Livres et BD : achat chez un libraire indépendant, page du livre trouvée par son ISBN.
    const isbn = /^97[89]\d{10}$/.test(it.isbn || "") ? it.isbn : null;
    const buy = isbn ? `https://www.librairiesindependantes.com/product/${isbn}/` : null;
    // Le lien mène à un autre format (ex. le podcast où l'autrice présente son livre) ?
    const listen = catsOf(it).includes("podcast") && it.categorie !== "podcast";
    // Un livre qu'on peut acheter en librairie n'a pas besoin, en plus, du lien vers la page de l'éditeur.
    const showLink = link && (!buy || listen);
    const inLists = state.lists.filter((l) => l.ressources.includes(it.id));
    const sc = it.senscritique && safeUrl(it.senscritique.url);
    const scHtml = sc ? `<a class="sc-row" href="${escapeHtml(sc)}" target="_blank" rel="noopener">
        ${scNote(it) ? `<span class="sc-badge sc-badge-l">${scNote(it)}<small>/10</small></span>
        <span>Note moyenne SensCritique<br>
        <small>${scDate(it) ? `Relevée en ${scDate(it)} · ` : ""}Voir sur SensCritique ↗</small></span>`
        : `<span>Pas encore assez de notes sur SensCritique<br><small>Voir la page ↗</small></span>`}
      </a>` : "";
    const dlg = $("#detail");
    dlg.querySelector(".sheet-body").innerHTML = `
      <button class="quick-exit sheet-exit" type="button" data-exit>Sortie rapide</button>
      <div class="detail-head">
        ${coverHtml(it, "l")}
        <div>
          <p class="card-meta cat-line">${(catsOf(it).length ? catsOf(it) : [it.categorie]).map((c) => {
            const k = CATEGORIES[c] || { label: c };
            return `<span>${ui(k.icon)} ${escapeHtml(k.one || k.label)}</span>`;
          }).join("")}</p>
          <h2 id="detail-title">${escapeHtml(it.titre)}</h2>
          <p class="card-meta">${[it.auteur, it.annee].filter(Boolean).map(escapeHtml).join(" · ")}</p>
        </div>
        <button class="fav-btn detail-fav" type="button" data-fav="${escapeHtml(it.id)}"
          aria-pressed="${isFav}" aria-label="${isFav ? "Retirer des" : "Ajouter aux"} favoris" title="${isFav ? "Retirer des" : "Ajouter aux"} favoris">${ui("coeur")}</button>
      </div>
      ${scHtml}
      ${it.image && it.image_credit ? `<p class="img-credit">Image : ${escapeHtml(it.image_credit)}</p>` : ""}
      <div class="warning">
        ${levelHtml(it.intensite)}<br>
        Thèmes abordés : ${it.themes.map(escapeHtml).join(", ")}.
        ${strong ? "<br>Ce contenu peut être particulièrement éprouvant. Le résumé est masqué : appuyez dessus pour l'afficher." : ""}
      </div>
      <p class="reveal${strong ? "" : " shown"}" id="detail-resume" tabindex="0">${escapeHtml(it.resume)}</p>
      ${inLists.length ? `<p class="card-meta">Dans les listes : ${inLists
        .map((l) => `<button class="link-btn" type="button" data-list="${escapeHtml(l.id)}">${escapeHtml(l.titre)}</button>`)
        .join(", ")}</p>` : ""}
      ${showLink ? `<div class="btn-row">
        <a class="btn" href="${escapeHtml(link)}" target="_blank" rel="noopener">${listen ? "Écouter le podcast" : "Consulter"} ↗</a>
      </div>` : ""}
      ${buy ? `<a class="btn btn-buy" href="${buy}" target="_blank" rel="noopener">Acheter en librairie indépendante ↗</a>
      <p class="buy-note">Sur librairiesindependantes.com : vous choisissez une librairie près de chez vous. Aucun lien commercial avec Biblio VSS.</p>` : ""}
      <div class="btn-row">
        <button class="btn" type="button" data-close>Fermer</button>
      </div>`;
    if (!dlg.open) dlg.showModal();
  }

  // Zones de texte qui s'agrandissent avec le contenu (pour les navigateurs
  // qui ne gèrent pas encore « field-sizing: content »).
  if (!CSS.supports || !CSS.supports("field-sizing", "content")) {
    document.addEventListener("input", (e) => {
      const t = e.target;
      if (t.tagName !== "TEXTAREA" || !t.closest(".form")) return;
      t.style.height = "auto";
      t.style.height = Math.min(t.scrollHeight + 2, window.innerHeight * 0.6) + "px";
    });
  }

  // ---------- Événements ----------
  const todayIso = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };
  const validDate = (d) => /^\d{4}-\d{2}-\d{2}$/.test(d || "");
  const validTime = (t) => /^\d{2}:\d{2}$/.test(t || "");

  function upcomingEvents() {
    const today = todayIso();
    return state.events
      .filter((ev) => validDate(ev.date) && (ev.fin && validDate(ev.fin) ? ev.fin : ev.date) >= today)
      .sort((a, b) => (a.date + (a.heure || "")).localeCompare(b.date + (b.heure || "")));
  }

  function formatDate(ev) {
    const [y, m, d] = ev.date.split("-").map(Number);
    const date = new Date(y, m - 1, d).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    return date + (validTime(ev.heure) ? ` à ${ev.heure.replace(":", "h")}` : "");
  }

  function renderEventFilters() {
    const events = upcomingEvents();
    const fill = (sel, values, current, first) => {
      sel.innerHTML = `<option value="">${first}</option>` +
        values.map((v) => `<option value="${escapeHtml(v)}"${v === current ? " selected" : ""}>${escapeHtml(v)}</option>`).join("");
    };
    const cities = [...new Set(events.map((ev) => ev.ville).filter(Boolean))].sort((a, b) => a.localeCompare(b, "fr"));
    const types = [...new Set(events.map((ev) => ev.type).filter(Boolean))].sort((a, b) => a.localeCompare(b, "fr"));
    if (state.eventCity && !cities.includes(state.eventCity)) state.eventCity = "";
    fill($("#event-city"), cities, state.eventCity, "Toutes les villes");
    fill($("#event-type"), types, state.eventType, "Tous les types");
  }

  function renderEvents() {
    const events = upcomingEvents().filter((ev) =>
      (!state.eventCity || ev.ville === state.eventCity) && (!state.eventType || ev.type === state.eventType));
    $("#event-count").textContent = events.length ? `${events.length} événement${events.length > 1 ? "s" : ""} à venir` : "";
    $("#event-list").innerHTML = events.length ? events.map((ev) => {
      const [, m, d] = ev.date.split("-").map(Number);
      return `<li class="card event-card" tabindex="0" data-event="${escapeHtml(ev.id)}">
          <div class="date-badge" aria-hidden="true"><span>${d}</span>${MONTHS[m - 1]}</div>
          <div class="card-main">
            ${ev.ville ? `<p class="event-city">${ui("lieu")} ${escapeHtml(ev.ville)}</p>` : ""}
            <p class="card-title">${escapeHtml(ev.titre)}</p>
            <p class="card-meta">${escapeHtml(ev.type || "Événement")}${validTime(ev.heure) ? " · " + ev.heure.replace(":", "h") : ""}</p>
            ${ev.lieu ? `<p class="card-meta">${escapeHtml(ev.lieu)}</p>` : ""}
            ${ev.gratuit ? `<div class="tags"><span class="tag">Gratuit</span></div>` : ""}
          </div>
        </li>`;
    }).join("") : `<li class="empty">${state.events.length && (state.eventCity || state.eventType)
      ? "Aucun événement à venir pour ce filtre."
      : "Aucun événement à venir pour le moment."}<br><br>
      Vous organisez un groupe de parole, une conférence, une projection ?<br>
      <button class="btn" type="button" data-goto="suggest" data-suggest-type="evenement">Proposer un événement</button></li>`;
  }

  // « Relevé le 23 novembre 2026 sur caiip.group » : d'où vient l'information, et de quand.
  function sourceLine(ev) {
    const src = safeUrl(ev.source);
    if (!src || !validDate(ev.releve)) return "";
    const [y, m, d] = ev.releve.split("-").map(Number);
    const when = new Date(y, m - 1, d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
    const host = new URL(src).hostname.replace(/^www\./, "");
    return `<p class="hint small-print">Relevé le ${escapeHtml(when)} sur ${escapeHtml(host)}. Vérifiez auprès de l'organisateur avant de vous déplacer.</p>`;
  }

  function openEvent(id) {
    const ev = state.events.find((x) => x.id === id);
    if (!ev) return;
    const link = safeUrl(ev.lien);
    const dlg = $("#detail");
    dlg.querySelector(".sheet-body").innerHTML = `
      <button class="quick-exit sheet-exit" type="button" data-exit>Sortie rapide</button>
      <p class="card-meta">${ui("date")} ${escapeHtml(ev.type || "Événement")}</p>
      <h2 id="detail-title">${escapeHtml(ev.titre)}</h2>
      <ul class="event-facts">
        <li>${ui("date")} ${escapeHtml(formatDate(ev))}</li>
        <li>${ui("lieu")} ${escapeHtml([ev.lieu, ev.ville].filter(Boolean).join(", "))}</li>
        ${ev.organisateur ? `<li>${ui("groupe")} ${escapeHtml(ev.organisateur)}</li>` : ""}
        ${ev.gratuit ? `<li>${ui("euro")} Gratuit</li>` : ""}
      </ul>
      ${ev.description ? `<p>${escapeHtml(ev.description)}</p>` : ""}
      ${sourceLine(ev)}
      <div class="btn-row">
        <button class="btn" type="button" data-ics="${escapeHtml(ev.id)}">Ajouter à mon agenda</button>
        ${link ? `<a class="btn" href="${escapeHtml(link)}" target="_blank" rel="noopener">En savoir plus ↗</a>` : ""}
      </div>
      <div class="btn-row">
        <button class="btn" type="button" data-close>Fermer</button>
      </div>`;
    if (!dlg.open) dlg.showModal();
  }

  // Fichier .ics : s'ouvre dans l'agenda du téléphone.
  function downloadIcs(id) {
    const ev = state.events.find((x) => x.id === id);
    if (!ev) return;
    const esc = (t) => String(t || "").replace(/[\\;,]/g, (c) => "\\" + c).replace(/\n/g, "\\n");
    const day = ev.date.replace(/-/g, "");
    let start, end;
    if (validTime(ev.heure)) {
      const [h, mi] = ev.heure.split(":").map(Number);
      start = `DTSTART:${day}T${String(h).padStart(2, "0")}${String(mi).padStart(2, "0")}00`;
      end = `DTEND:${day}T${String(Math.min(h + 2, 23)).padStart(2, "0")}${String(mi).padStart(2, "0")}00`;
    } else {
      const [y, m, d] = ev.date.split("-").map(Number);
      const next = new Date(y, m - 1, d + 1);
      start = `DTSTART;VALUE=DATE:${day}`;
      end = `DTEND;VALUE=DATE:${next.getFullYear()}${String(next.getMonth() + 1).padStart(2, "0")}${String(next.getDate()).padStart(2, "0")}`;
    }
    const ics = [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Biblio VSS//FR", "BEGIN:VEVENT",
      `UID:${esc(ev.id)}@biblio-vss`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`,
      start, end, `SUMMARY:${esc(ev.titre)}`,
      `LOCATION:${esc([ev.lieu, ev.ville].filter(Boolean).join(", "))}`,
      `DESCRIPTION:${esc([ev.description, ev.lien].filter(Boolean).join("\n"))}`,
      "END:VEVENT", "END:VCALENDAR",
    ].join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
    a.download = `${ev.id}.ics`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  // ---------- Annuaire d'aide ----------
  function contactHtml(c) {
    const label = c.label || c.valeur;
    if (c.type === "tel" && /^\+?\d{3,15}$/.test(c.valeur)) return `<a class="contact" href="tel:${c.valeur}">${ui("tel")} ${escapeHtml(label)}</a>`;
    if (c.type === "sms" && /^\+?\d{3,15}$/.test(c.valeur)) return `<a class="contact" href="sms:${c.valeur}">${ui("bulle")} SMS ${escapeHtml(label)}</a>`;
    if (c.type === "email" && /^[^@\s"<>]+@[^@\s"<>]+\.[a-z]{2,}$/i.test(c.valeur))
      return `<a class="contact" href="mailto:${escapeHtml(c.valeur)}">${ui("mail")} ${escapeHtml(label)}</a>`;
    const url = safeUrl(c.valeur);
    if (!url) return "";
    const text = c.label || (c.type === "tchat" ? "Tchat" : "Site web");
    return `<a class="contact" href="${escapeHtml(url)}" target="_blank" rel="noopener">${ui(c.type === "tchat" ? "bulle" : "web")} ${escapeHtml(text)}</a>`;
  }

  function renderAide() {
    const present = new Set(state.aide.map((a) => a.categorie));
    $("#aide-cats").innerHTML = Object.entries(AIDE_CATEGORIES)
      .filter(([k]) => k === "tout" || present.has(k))
      .map(([k, label]) => `<button class="chip${k === state.aideCat ? " active" : ""}" type="button" aria-pressed="${k === state.aideCat}" data-aide-cat="${k}">${label}</button>`)
      .join("");
    const q = normalize(state.aideQuery.trim());
    const items = state.aide.filter((a) => {
      if (state.aideCat !== "tout" && a.categorie !== state.aideCat) return false;
      if (!q) return true;
      const hay = normalize([a.nom, a.description, a.ville, a.horaires, AIDE_CATEGORIES[a.categorie]].join(" "));
      return q.split(/\s+/).every((w) => hay.includes(w));
    });
    $("#aide-list").innerHTML = items.length ? items.map((a) => `
      <li class="help-entry">
        <p class="card-title">${escapeHtml(a.nom)}</p>
        <p class="card-meta">${ui("lieu")} ${escapeHtml(a.ville || "")}${a.horaires ? ` · ${ui("heure")} ${escapeHtml(a.horaires)}` : ""}</p>
        <p class="help-desc">${escapeHtml(a.description)}</p>
        <div class="contacts">${(a.contacts || []).map(contactHtml).join("")}</div>
      </li>`).join("") : `<li class="empty">Aucun résultat dans l'annuaire.</li>`;
  }

  // ---------- Comprendre : définitions et questions fréquentes ----------
  const paragraphs = (t) => String(t || "").split(/\n\n+/)
    .map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br>")}</p>`).join("");

  // Icônes au trait des rubriques et des tuiles
  const ICONS = {
    balance: '<path d="M12 4v16M7 20h10M5 8h14M5 8l-2.5 6a3 3 0 0 0 5 0L5 8zM19 8l-2.5 6a3 3 0 0 0 5 0L19 8z"/>',
    cerveau: '<path d="M9 4a3 3 0 0 0-3 3 3 3 0 0 0-2 5 3 3 0 0 0 2 5 3 3 0 0 0 6 1V5a2 2 0 0 0-3-1zM15 4a3 3 0 0 1 3 3 3 3 0 0 1 2 5 3 3 0 0 1-2 5 3 3 0 0 1-6 1"/>',
    coeur: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
    enfant: '<circle cx="12" cy="6" r="2.5"/><path d="M8 21v-6l-2-3 3-3h6l3 3-2 3v6M10 21v-4h4v4"/>',
    soleil: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    document: '<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4M9.5 12h6M9.5 16h6"/>',
    bulle: '<path d="M5 5h14a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H10l-4 3v-3H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z"/><path d="M10 9.2a2 2 0 1 1 2.6 1.9c-.4.2-.6.5-.6.9M12 14h.01"/>',
    temps: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    oeil: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.8"/>',
    corps: '<circle cx="12" cy="4.5" r="2"/><path d="M12 7v7M7 9.5h10M12 14l-3 7M12 14l3 7"/>',
    intime: '<path d="M8 13a4 4 0 1 1 0-8 4 4 0 0 1 0 8zM16 19a4 4 0 1 1 0-8 4 4 0 0 1 0 8z"/>',
    liens: '<circle cx="7" cy="8" r="2.5"/><circle cx="17" cy="8" r="2.5"/><path d="M3 19a4 4 0 0 1 8 0M13 19a4 4 0 0 1 8 0"/>',
    bouclier: '<path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z"/>',
    fil: '<path d="M4 18c3-6 6 0 9-6s5-4 7-6"/><circle cx="4" cy="18" r="1.5"/><circle cx="20" cy="6" r="1.5"/>',
    cercle: '<path d="M20 12a8 8 0 1 1-2.3-5.7M20 4v4h-4"/>',
    honte: '<circle cx="12" cy="10" r="6.5"/><path d="M9 9.5h1.5M13.5 9.5H15M10 13.2c1.2.6 2.8.6 4 0M7 20.5c1.5-1.6 3.2-2.4 5-2.4s3.5.8 5 2.4"/>',
  };
  const icon = (name, cls = "rub-icon") => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${ICONS[name] || ICONS.bulle}</svg>`;

  const reflexionHtml = (d) => d.reflexion ? `<div class="reflexion">
      <p class="reflexion-title">${icon("bulle", "inline-icon")} Pour réfléchir ou en parler</p>
      ${d.reflexion.parties.map((pt) => `<p class="reflexion-part">${escapeHtml(pt.titre)}</p>
        <ul>${pt.questions.map((q) => `<li>${escapeHtml(q)}</li>`).join("")}</ul>`).join("")}
      <p class="reflexion-note">${escapeHtml(d.reflexion.origine || "")} Prenez-les à votre rythme : vous pouvez y répondre sur papier, ou en parler avec quelqu'un de confiance ou en groupe de parole. Rien n'est enregistré dans l'application.</p>
    </div>` : "";

  const defBody = (d) => {
    const src = d.source && safeUrl(d.source.url);
    return `${paragraphs(d.texte)}${reflexionHtml(d)}
      ${src ? `<p class="acc-source">Source : <a href="${escapeHtml(src)}" target="_blank" rel="noopener">${escapeHtml(d.source.label)} ↗</a></p>` : ""}`;
  };

  function defHtml(d) {
    return `<details class="acc" id="def-${escapeHtml(d.id)}" data-def="${escapeHtml(d.id)}">
        <summary><strong>${escapeHtml(d.terme)}</strong><span>${escapeHtml(d.court)}</span>${d.reflexion ? `<em class="acc-badge">Questions pour réfléchir</em>` : ""}</summary>
        <div class="acc-body">${defBody(d)}</div>
      </details>`;
  }

  // Schéma en étapes, à faire défiler
  const stepsHtml = (r) => !r.etapes ? "" : `<div class="steps" data-steps>
      <div class="steps-track">${r.etapes.map((e, i) => `<div class="step">
          <span class="step-num">${i + 1} / ${r.etapes.length}</span>
          <p class="step-title">${escapeHtml(e.titre)}</p>
          <p>${escapeHtml(e.texte)}</p>
        </div>`).join("")}</div>
      <div class="steps-nav">
        <button class="btn btn-small" type="button" data-step="-1" aria-label="Étape précédente">←</button>
        <span class="steps-dots">${r.etapes.map((_, i) => `<i${i === 0 ? ' class="on"' : ""}></i>`).join("")}</span>
        <button class="btn btn-small" type="button" data-step="1" aria-label="Étape suivante">→</button>
      </div>
      ${r.etapes_source && safeUrl(r.etapes_source.url) ? `<p class="acc-source"><a href="${escapeHtml(r.etapes_source.url)}" target="_blank" rel="noopener">${escapeHtml(r.etapes_source.label)} ↗</a></p>` : ""}
    </div>`;

  function renderRubrique(r) {
    const L = state.learn;
    const defs = L.definitions.filter((d) => d.rubrique === r.id);
    let content;
    if (r.format === "tuiles") {
      content = `<div class="tiles">${defs.map((d) => `<button class="tile" type="button" data-def-sheet="${escapeHtml(d.id)}">
          ${icon(d.icone || "coeur", "tile-icon")}<strong>${escapeHtml(d.terme)}</strong><span>${escapeHtml(d.court)}</span>
        </button>`).join("")}</div>`;
    } else if (r.format === "reflexion") {
      const sets = L.definitions.filter((d) => d.reflexion);
      content = `<div class="acc-list">${sets.map((d) => `<div class="reflexion-card">
          <p class="step-title">${escapeHtml(d.terme)}</p>${reflexionHtml(d)}
          <button class="link-btn" type="button" data-def-open="${escapeHtml(d.id)}">Lire la fiche « ${escapeHtml(d.terme)} »</button>
        </div>`).join("")}</div>
        <p class="hint">D'autres séries de questions pourront être ajoutées au fil des ateliers.</p>`;
    } else {
      content = `<div class="acc-list">${defs.map(defHtml).join("")}</div>`;
    }
    const extra = r.id === "mieux" ? `<p><button class="btn" type="button" data-goto="help">Trouver de l'aide et des soins</button></p>` : "";
    $("#learn-rub").innerHTML = `<button class="link-btn back-link" type="button" data-rub-back>← Comprendre</button>
      <div class="rub-head">${icon(r.icone)}<div><h3>${escapeHtml(r.titre)}</h3><p class="hint">${escapeHtml(r.description)}</p></div></div>
      ${stepsHtml(r)}${content}${extra}`;
  }

  function renderLearn() {
    const L = state.learn;
    if (!L) return;
    $("#learn-maj").textContent = (() => {
      const m = /^(\d{4})-(\d{2})$/.exec(L.maj || "");
      return m ? new Date(+m[1], +m[2] - 1, 1).toLocaleDateString("fr-FR", { month: "long", year: "numeric" }) : "";
    })();
    const q = normalize(state.learnQuery.trim());
    const match = (...parts) => !q || q.split(/\s+/).every((w) => normalize(parts.join(" ")).includes(w));
    const byId = new Map(L.definitions.map((d) => [d.id, d]));
    const rub = state.learnRub && L.rubriques.find((r) => r.id === state.learnRub);

    // Page d'une rubrique
    $("#learn-top").hidden = !!rub && !q;
    $("#learn-rub").hidden = !rub || !!q;
    if (rub && !q) { renderRubrique(rub); $("#def-list").innerHTML = ""; return; }

    // Sources d'une réponse : celles indiquées dans la question (« sources »), sinon celles
    // des articles vers lesquels elle renvoie (« voir »), sans doublon.
    const faqSourcesHtml = (f, byId) => {
      const list = Array.isArray(f.sources) ? f.sources
        : (f.voir || []).map((id) => byId.get(id) && byId.get(id).source).filter(Boolean);
      const seen = new Set();
      const uniq = list.filter((src) => src && src.label && !seen.has(src.url || src.label) && seen.add(src.url || src.label));
      if (!uniq.length) return "";
      return `<p class="acc-source">Sources : ${uniq.map((src) => safeUrl(src.url)
        ? `<a href="${escapeHtml(src.url)}" target="_blank" rel="noopener">${escapeHtml(src.label)}</a>`
        : escapeHtml(src.label)).join(" · ")}</p>`;
    };

    // Questions fréquentes
    const faqs = L.questions_frequentes.filter((f) => match(f.question, f.reponse));
    $("#faq-list").innerHTML = faqs.length ? faqs.map((f) => `<details class="acc">
        <summary><strong>${escapeHtml(f.question)}</strong></summary>
        <div class="acc-body">${paragraphs(f.reponse)}
          ${(f.voir || []).filter((id) => byId.has(id)).length ? `<p class="acc-source">Lire les articles : ${f.voir.filter((id) => byId.has(id))
            .map((id) => `<button class="link-btn" type="button" data-def-open="${escapeHtml(id)}">${escapeHtml(byId.get(id).terme)}</button>`).join(", ")}</p>` : ""}
          ${faqSourcesHtml(f, byId)}
        </div>
      </details>`).join("") : `<p class="hint">Aucune question ne correspond.</p>`;

    // Recherche : résultats à plat ; sinon, sommaire des rubriques
    $("#learn-home").hidden = !!q;
    $("#learn-home").previousElementSibling.hidden = !!q;
    if (q) {
      const defs = L.definitions.filter((d) => match(d.terme, d.court, d.texte, JSON.stringify(d.reflexion || "")));
      $("#def-list").innerHTML = defs.length ? `<h3 class="section-title">Définitions</h3><div class="acc-list">${defs.map(defHtml).join("")}</div>`
        : `<p class="hint">Aucune définition ne correspond à « ${escapeHtml(state.learnQuery)} ».</p>`;
      return;
    }
    $("#def-list").innerHTML = "";
    $("#learn-home").innerHTML = L.rubriques.map((r) => {
      const n = r.format === "reflexion" ? L.definitions.filter((d) => d.reflexion).length : L.definitions.filter((d) => d.rubrique === r.id).length;
      return `<button class="rub-tile" type="button" data-rub="${escapeHtml(r.id)}">
          ${icon(r.icone)}<strong>${escapeHtml(r.titre)}</strong>
          <span>${r.format === "reflexion" ? `${n} série${n > 1 ? "s" : ""} de questions` : `${n} fiche${n > 1 ? "s" : ""}`}${r.etapes ? " · schéma" : ""}</span>
        </button>`;
    }).join("");
  }

  function openRubrique(id) {
    state.learnRub = id;
    if (state.learnQuery) { state.learnQuery = ""; $("#learn-search").value = ""; }
    renderLearn();
    window.scrollTo(0, 0);
  }

  // Fiche en panneau (format « tuiles »)
  function openDefSheet(id) {
    const d = state.learn.definitions.find((x) => x.id === id);
    if (!d) return;
    const dlg = $("#detail");
    dlg.querySelector(".sheet-body").innerHTML = `
      <button class="quick-exit sheet-exit" type="button" data-exit>Sortie rapide</button>
      <div class="rub-head">${icon(d.icone || "coeur")}<h2 id="detail-title">${escapeHtml(d.terme)}</h2></div>
      <p class="hint">${escapeHtml(d.court)}</p>
      <div class="sheet-text">${defBody(d)}</div>
      <div class="btn-row"><button class="btn" type="button" data-close>Fermer</button></div>`;
    if (!dlg.open) dlg.showModal();
  }

  function openDefinition(id) {
    const d = state.learn && state.learn.definitions.find((x) => x.id === id);
    if (!d) return;
    document.querySelectorAll("dialog[open]").forEach((x) => x.close());
    showView("learn");
    const rub = state.learn.rubriques.find((r) => r.id === d.rubrique);
    openRubrique(d.rubrique);
    if (rub && rub.format === "tuiles") { openDefSheet(id); return; }
    const el = document.getElementById(`def-${id}`);
    if (el) { el.open = true; setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "start" }), 50); }
  }

  // ---------- Questionnaire « Faire le point » ----------
  // Les réponses restent en mémoire le temps du questionnaire, puis sont effacées.
  const quiz = { step: -1, answers: {} };
  const ANSWERS = [["oui", "Oui"], ["non", "Non"], ["nsp", "Je ne sais pas"]];

  function quizQuestions() {
    // Si moins de 15 ans, inutile de demander « moins de 18 ans »
    return state.learn.questionnaire.questions.filter((q) => !(q.id === "moins18" && quiz.answers.moins15 === "oui"));
  }

  function renderQuiz() {
    const Q = state.learn.questionnaire;
    const body = $("#quiz-body");
    const qs = quizQuestions();
    if (quiz.step < 0) {
      body.innerHTML = `<div class="warning">${escapeHtml(Q.intro)}</div>
        <p class="hint">${escapeHtml(Q.avertissement)}</p>
        <div class="btn-row"><button class="btn primary" type="button" data-quiz-next>Commencer</button></div>
        <div class="btn-row"><button class="btn" type="button" data-quiz-close>Pas maintenant</button></div>`;
      return;
    }
    if (quiz.step >= qs.length) { renderQuizResult(); return; }
    const q = qs[quiz.step];
    const cur = quiz.answers[q.id];
    body.innerHTML = `<p class="quiz-progress">Question ${quiz.step + 1} sur ${qs.length}</p>
      <div class="quiz-bar"><span style="width:${Math.round((quiz.step / qs.length) * 100)}%"></span></div>
      <p class="quiz-question">${escapeHtml(q.texte)}</p>
      <div class="quiz-answers">${ANSWERS.map(([v, l]) =>
        `<button class="btn quiz-answer${cur === v ? " selected" : ""}" type="button" data-quiz-answer="${v}">${l}</button>`).join("")}
      </div>
      <div class="quiz-nav">
        <button class="link-btn" type="button" data-quiz-back>${quiz.step === 0 ? "Retour" : "← Question précédente"}</button>
        <button class="link-btn" type="button" data-quiz-skip>Passer cette question</button>
      </div>`;
  }

  function renderQuizResult() {
    const a = quiz.answers;
    const yes = (k) => a[k] === "oui";
    const maybe = (k) => a[k] === "oui" || a[k] === "nsp";
    const acte = maybe("penetration") || maybe("attouchements");
    // Absence d'accord claire (non, incapacité, pression) ou simple doute (« je ne sais pas »)
    const pasConsentClair = a.envie === "non" || maybe("incapable") || maybe("pression");
    const doute = a.envie === "nsp";
    const pasConsent = pasConsentClair || doute;
    const moins15 = yes("moins15");
    const mineur = moins15 || yes("moins18");
    const famille = maybe("famille");
    const sansAccordPossible = pasConsent || moins15 || (mineur && famille);
    const sansAccordClair = pasConsentClair || moins15 || (mineur && famille);
    const mots = [];
    const add = (id) => { if (!mots.includes(id)) mots.push(id); };
    if (maybe("penetration") && sansAccordPossible) add("viol");
    if (maybe("attouchements") && sansAccordPossible) add("agression-sexuelle");
    if (moins15 && acte) add("mineur-15-ans");
    if (famille && acte) add("inceste");
    if (mineur && acte) add("pedocriminalite");
    if (pasConsent) add("consentement");
    if (maybe("incapable")) { add("sidération"); add("soumission-chimique"); }
    if (maybe("memoire")) { add("amnesie-traumatique"); add("dissociation"); }
    if (acte) { add("plainte"); add("prescription"); }

    let message;
    if (acte && sansAccordClair) {
      message = "Ce que vous décrivez peut correspondre à des violences sexuelles. Ce n'est pas de votre faute, et vous avez le droit d'être écouté·e et aidé·e.";
    } else if (acte && doute) {
      message = "Vous ne savez pas si vous étiez vraiment d'accord. Ce doute est fréquent, et il est important : le consentement doit être libre, éclairé et donné pour chaque acte. Lire la définition ci-dessous, ou en parler à quelqu'un de confiance ou à une ligne d'écoute, peut vous aider à y voir plus clair.";
    } else if (acte) {
      message = "Vos réponses ne disent pas clairement si vous étiez d'accord. Si vous vous posez la question, c'est que quelque chose vous a mis·e mal à l'aise : cela mérite d'être entendu par quelqu'un de confiance ou un·e professionnel·le.";
    } else {
      message = "Vos réponses ne correspondent pas aux situations décrites ici. Mais les violences prennent beaucoup de formes, et votre ressenti compte : si quelque chose vous pèse, vous pouvez en parler.";
    }
    const extras = [];
    if (yes("couple") && acte) extras.push("Être en couple, même marié·e, ne veut jamais dire avoir donné son accord : la loi le précise.");
    if (famille && acte) extras.push("Si la personne est un·e cousin·e, le mot « inceste » ne s'applique pas juridiquement, mais ce sont bien des violences sexuelles, punies par la loi.");
    if (maybe("incapable")) extras.push("Si cela vient d'arriver et que vous pensez avoir été drogué·e, allez vite aux urgences : certaines substances disparaissent en quelques heures.");

    const byId = new Map(state.learn.definitions.map((d) => [d.id, d]));
    $("#quiz-body").innerHTML = `<div class="quiz-result">
        <p class="quiz-message">${escapeHtml(message)}</p>
        ${extras.map((t) => `<p>${escapeHtml(t)}</p>`).join("")}
      </div>
      ${mots.some((id) => byId.has(id)) ? `<h3 class="section-title">Des mots qui peuvent vous aider</h3>
      <div class="chips-wrap">${mots.filter((id) => byId.has(id)).map((id) =>
        `<button class="chip" type="button" data-def-open="${escapeHtml(id)}">${escapeHtml(byId.get(id).terme)}</button>`).join("")}</div>`
        : `<p><button class="link-btn" type="button" data-goto="learn">Parcourir toutes les définitions</button></p>`}
      <h3 class="section-title">En parler, gratuitement et anonymement</h3>
      <ul class="help-list compact">
        ${mineur ? `<li><a href="tel:119"><strong>119</strong> Allô Enfance en Danger</a><small>Si vous avez moins de 18 ans, 24h/24</small></li>` : ""}
        <li><a href="tel:0800059595"><strong>0 800 05 95 95</strong> Viols Femmes Informations</a><small>Pour toutes les victimes de violences sexuelles</small></li>
        <li><a href="tel:3919"><strong>3919</strong> Violences Femmes Info</a><small>24h/24, 7j/7</small></li>
        <li><a href="tel:116006"><strong>116 006</strong> France Victimes</a><small>Démarches, plainte, accompagnement</small></li>
      </ul>
      <p class="hint">En danger maintenant : appelez le <a href="tel:17">17</a> ou envoyez un SMS au <a href="sms:114">114</a>. D'autres contacts, associations et groupes de parole sont dans l'onglet Aide.</p>
      <p class="hint small-print">${escapeHtml(state.learn.questionnaire.avertissement)} Vos réponses viennent d'être effacées.</p>
      <div class="btn-row"><button class="btn" type="button" data-goto="help">Voir toute l'aide</button>
        <button class="btn primary" type="button" data-quiz-close>Fermer</button></div>`;
    quiz.answers = {}; // rien n'est conservé
  }

  function openQuiz() {
    if (!state.learn) return;
    quiz.step = -1; quiz.answers = {};
    renderQuiz();
    $("#quiz").showModal();
  }

  // ---------- Remplissage automatique depuis un lien ----------
  // Les navigateurs interdisent de lire directement une autre page web : on passe
  // par Microlink (service gratuit qui lit les métadonnées publiques d'une page).
  // Seul le lien lui est envoyé. Si le service ne répond pas, on devine ce qu'on
  // peut à partir de l'adresse elle-même.
  const METADATA_API = "https://api.microlink.io/?url=";
  const SC_TYPES = { film: "film", serie: "serie", livre: "livre", bd: "bd" };
  const capitalize = (t) => t.charAt(0).toUpperCase() + t.slice(1);

  function guessFromUrl(url) {
    let u;
    try { u = new URL(url); } catch { return null; }
    const host = u.hostname.replace(/^www\./, "");
    const parts = u.pathname.split("/").filter(Boolean);
    const out = {};
    if (host === "senscritique.com" && SC_TYPES[parts[0]]) {
      out.categorie = SC_TYPES[parts[0]];
      if (parts[1]) out.titre = capitalize(decodeURIComponent(parts[1]).replace(/_/g, " "));
    } else if (/(^|\.)(spotify\.com|ausha\.co|podcasters\.spotify\.com)$/.test(host) && /show|episode|podcast/.test(u.pathname)) {
      out.categorie = "podcast";
    } else if (host === "podcasts.apple.com" || (host === "deezer.com" && /show|episode/.test(u.pathname))) {
      out.categorie = "podcast";
    } else if (host === "radiofrance.fr" && parts.includes("podcasts")) {
      out.categorie = "podcast";
    } else if (host === "allocine.fr") {
      if (parts[0] === "film") out.categorie = "film";
      if (parts[0] === "series") out.categorie = "serie";
    } else if (host === "babelio.com" && parts[0] === "livres") {
      out.categorie = "livre";
    } else if (/(^|\.)(helloasso\.com|openagenda\.com|eventbrite\.(fr|com)|billetreduc\.com|weezevent\.com|festik\.net|shotgun\.live|billetweb\.fr|fnacspectacles\.com|ticketmaster\.fr)$/.test(host)
      || (host === "facebook.com" && parts[0] === "events")) {
      out.categorie = "evenement";
      // Titre lisible dans l'adresse (HelloAsso, Eventbrite)
      const slug = host === "helloasso.com" && parts[2] === "evenements" ? parts[3]
        : /eventbrite/.test(host) && parts[0] === "e" ? (parts[1] || "").replace(/-(tickets|billets)-\d+$/, "") : "";
      if (slug) out.titre = capitalize(decodeURIComponent(slug).replace(/-/g, " "));
    }
    return out;
  }

  function parseMetadata(url, d) {
    const out = {};
    const title = String(d.title || "").trim();
    const desc = String(d.description || "").trim();
    // SensCritique : « Festen - Film (1998) - SensCritique » et « … est un film de Thomas Vinterberg. »
    const sc = /^(.*?) - (Film|Série|Livre|BD|Documentaire(?: TV)?|Court-métrage)(?: \((\d{4})\))? - SensCritique$/.exec(title);
    if (sc) {
      out.titre = sc[1];
      if (sc[3]) out.annee = sc[3];
      if (/^Documentaire/.test(sc[2])) out.categorie = "documentaire";
      const by = /est une? (?:film|série|livre|bd|documentaire)[^.]*? de (.+?)\.(?:\s|$)/i.exec(desc);
      if (by) out.auteur = by[1].replace(/ et /g, ", ");
    } else if (title) {
      // Retire le nom du site en fin de titre (« Titre | Site », « Titre - Site »)
      let t = title;
      const site = String(d.publisher || "").trim();
      if (site) t = t.replace(new RegExp(`\\s*[|–—-]\\s*${site.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`, "i"), "");
      const y = /\((19|20)\d{2}\)/.exec(t);
      if (y) { out.annee = y[0].slice(1, 5); t = t.replace(y[0], "").trim(); }
      out.titre = t;
      if (d.author && !/^https?:/.test(d.author)) out.auteur = String(d.author);
    }
    return out;
  }

  async function getJson(url, ms = 8000, headers) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), ms);
    try {
      const res = await fetch(url, { signal: ctrl.signal, headers });
      return res.ok ? await res.json() : null;
    } catch { return null; } finally { clearTimeout(timer); }
  }

  async function fetchMetadata(url, withJsonLd) {
    // withJsonLd : demande aussi les blocs schema.org de la page (date, lieu d'un événement)
    const rule = withJsonLd ? "&data.jsonld.selectorAll=" + encodeURIComponent('script[type="application/ld+json"]') + "&data.jsonld.attr=text" : "";
    let json = await getJson(METADATA_API + encodeURIComponent(url) + rule);
    if (withJsonLd && !(json && json.status === "success")) json = await getJson(METADATA_API + encodeURIComponent(url));
    return json && json.status === "success" ? json.data : null;
  }

  // ---------- Événements : lecture des données schema.org « Event » ----------
  const EVENT_TYPES = [
    [/groupe[s]? de parole/i, "Groupe de parole"],
    [/table[- ]ronde/i, "Table ronde"],
    [/conf[ée]rence/i, "Conférence"],
    [/projection|cin[ée][- ]d[ée]bat|ScreeningEvent/i, "Projection"],
    [/th[ée][âa]tre|spectacle|pi[èe]ce|TheaterEvent|seule? en sc[èe]ne/i, "Spectacle / théâtre"],
    [/marche/i, "Marche"],
    [/rassemblement/i, "Rassemblement"],
    [/atelier/i, "Atelier"],
    [/exposition|ExhibitionEvent/i, "Exposition"],
    [/formation|EducationEvent/i, "Formation"],
  ];
  const decodeEntities = (t) => { const el = document.createElement("textarea"); el.innerHTML = String(t || ""); return el.value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(); };

  function parseEventJsonLd(blocks) {
    const nodes = [];
    for (const raw of [].concat(blocks || [])) {
      let d;
      try { d = typeof raw === "string" ? JSON.parse(raw) : raw; } catch { continue; }
      const walk = (n) => {
        if (!n || typeof n !== "object") return;
        if (Array.isArray(n)) { n.forEach(walk); return; }
        nodes.push(n);
        if (n["@graph"]) walk(n["@graph"]);
      };
      walk(d);
    }
    const ev = nodes.find((n) => [].concat(n["@type"] || []).some((t) => /Event$/.test(t)) && n.startDate);
    if (!ev) return null;
    const out = { categorie: "evenement" };
    if (ev.name) out.titre = decodeEntities(ev.name);
    const m = /^(\d{4}-\d{2}-\d{2})(?:T(\d{2}:\d{2}))?/.exec(String(ev.startDate));
    if (m) { out.date = m[1]; if (m[2] && m[2] !== "00:00") out.heure = m[2]; }
    const loc = [].concat(ev.location || [])[0];
    if (loc && typeof loc === "object") {
      if (loc.name) out.lieu = decodeEntities(loc.name);
      const addr = loc.address;
      if (addr && typeof addr === "object") {
        if (addr.addressLocality) out.ville = decodeEntities(addr.addressLocality);
        if (addr.streetAddress && out.lieu) out.lieu += `, ${decodeEntities(addr.streetAddress)}`;
      } else if (typeof addr === "string") out.lieu = [out.lieu, decodeEntities(addr)].filter(Boolean).join(", ");
    }
    const org = [].concat(ev.organizer || [])[0];
    if (org) out.organisateur = decodeEntities(typeof org === "string" ? org : org.name);
    const hay = `${[].concat(ev["@type"]).join(" ")} ${ev.name || ""} ${decodeEntities(ev.description || "").slice(0, 300)}`;
    const t = EVENT_TYPES.find(([re]) => re.test(hay));
    if (t) out.type_evenement = t[1];
    return out;
  }

  // Wikidata : base de données ouverte de Wikipédia (titre exact, auteur·rice, année).
  const WD = "https://www.wikidata.org/w/api.php?format=json&origin=*&uselang=fr&";
  // Identification demandée par Wikimedia aux applications web
  const wdJson = (q) => getJson(WD + q, 8000, { "Api-User-Agent": "BiblioVSS/1.0 (application de ressources sur les violences sexuelles)" });
  const WD_DESC = {
    film: /film|documentaire|long métrage/i,
    documentaire: /documentaire/i,
    serie: /série|feuilleton|mini-série/i,
    livre: /livre|roman|essai|récit|autobiograph|œuvre littéraire|ouvrage/i,
    bd: /bande dessinée|roman graphique|\bBD\b|comics/i,
    podcast: /podcast/i,
  };
  const WD_AUTHOR = { film: ["P57"], documentaire: ["P57"], serie: ["P170", "P57"], livre: ["P50"], bd: ["P50", "P170"], podcast: ["P170", "P50"] };
  const claimIds = (ent, prop) => ((ent.claims || {})[prop] || [])
    .map((c) => c.mainsnak && c.mainsnak.datavalue && c.mainsnak.datavalue.value)
    .filter(Boolean);

  async function fromWikidata(title, type) {
    if (!title) return null;
    const search = await wdJson(`action=wbsearchentities&type=item&language=fr&limit=8&search=${encodeURIComponent(title)}`);
    const hits = (search && search.search) || [];
    const re = WD_DESC[type] || /./;
    const hit = hits.find((h) => re.test(h.description || ""));
    if (!hit) return null;
    const ents = await wdJson(`action=wbgetentities&props=labels|claims&languages=fr|en&ids=${hit.id}`);
    const ent = ents && ents.entities && ents.entities[hit.id];
    if (!ent) return null;
    const out = { titre: (ent.labels.fr || ent.labels.en || {}).value || hit.label };
    if (/documentaire/i.test(hit.description || "") && (type === "film" || type === "documentaire")) out.categorie = "documentaire";
    // Année : date de sortie en France si elle est indiquée (qualificatif
    // « lieu de publication » = France), sinon la plus ancienne date de
    // publication (P577) ou de début (P580).
    const yearOf = (v) => { const m = /([+-]\d{4})/.exec((v && v.time) || ""); return m ? +m[1] : null; };
    const pub = (ent.claims && ent.claims.P577) || [];
    const fr = pub.find((c) => ((c.qualifiers || {}).P291 || [])
      .some((q) => q.datavalue && q.datavalue.value && q.datavalue.value.id === "Q142"));
    const years = [...claimIds(ent, "P577"), ...claimIds(ent, "P580")].map(yearOf).filter(Boolean);
    const frYear = fr && fr.mainsnak && fr.mainsnak.datavalue && yearOf(fr.mainsnak.datavalue.value);
    if (frYear) out.annee = String(frYear);
    else if (years.length) out.annee = String(Math.min(...years));
    const peopleIds = [];
    for (const prop of WD_AUTHOR[type] || ["P50", "P57"]) {
      peopleIds.push(...claimIds(ent, prop).map((v) => v.id).filter(Boolean));
      if (peopleIds.length) break;
    }
    if (peopleIds.length) {
      const ppl = await wdJson(`action=wbgetentities&props=labels&languages=fr|en&ids=${peopleIds.slice(0, 4).join("|")}`);
      const names = peopleIds.slice(0, 4).map((id) => {
        const e = ppl && ppl.entities && ppl.entities[id];
        return e && ((e.labels.fr || e.labels.en || {}).value);
      }).filter(Boolean);
      if (names.length) out.auteur = names.join(", ");
    }
    return out;
  }

  // Podcasts : services officiels de Spotify et d'Apple
  async function fromPodcastUrl(url) {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    if (host === "open.spotify.com") {
      const o = await getJson(`https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`);
      return o && o.title ? { titre: o.title, categorie: "podcast" } : null;
    }
    if (host === "podcasts.apple.com") {
      const id = /\/id(\d+)/.exec(u.pathname);
      if (!id) return null;
      const r = await getJson(`https://itunes.apple.com/lookup?id=${id[1]}&entity=podcast`);
      const x = r && r.results && r.results.find((it) => it.kind === "podcast" || it.wrapperType === "podcast");
      if (!x) return null;
      // Pas d'année : Apple donne la date du dernier épisode, pas celle du lancement.
      return { titre: x.collectionName || x.trackName, auteur: x.artistName, categorie: "podcast" };
    }
    return null;
  }

  // Combine les sources, de la plus fiable à la plus générale.
  async function resolveUrl(url, wantEvent) {
    const guess = guessFromUrl(url) || {};
    let found = { ...guess };
    const podcast = await fromPodcastUrl(url);
    if (podcast) found = { ...found, ...podcast };
    const host = new URL(url).hostname.replace(/^www\./, "");
    if (!podcast && host !== "senscritique.com") {
      // SensCritique bloque les lecteurs automatiques : on passe directement à Wikidata.
      const maybeEvent = !found.categorie || found.categorie === "evenement" || wantEvent;
      const meta = await fetchMetadata(url, maybeEvent);
      if (meta) {
        const ev = maybeEvent && parseEventJsonLd(meta.jsonld);
        found = ev ? { ...found, ...ev } : { ...found, ...parseMetadata(url, meta) };
      }
    }
    if (found.titre && WD_DESC[found.categorie] && (!found.auteur || !found.annee || host === "senscritique.com")) {
      const wd = await fromWikidata(found.titre, found.categorie);
      if (wd) {
        // Le titre Wikidata a les accents corrects ; pour le reste, on complète.
        found = { ...found, ...wd, ...(found.auteur ? { auteur: found.auteur } : {}), ...(found.annee ? { annee: found.annee } : {}) };
        if (host === "senscritique.com") found.titre = wd.titre || found.titre;
      }
    }
    return found;
  }

  function setupUrlFill(form, say, syncFields) {
    const input = form.lien;
    const btn = $("#url-fill-btn");
    let lastUrl = "";
    const LABELS = { categorie: "type", titre: "titre", auteur: "auteur", annee: "année",
      date: "date", heure: "heure", ville: "ville", lieu: "lieu", organisateur: "organisateur", type_evenement: "type d'événement" };

    async function fill() {
      const url = input.value.trim();
      if (!safeUrl(url)) { say("Collez un lien complet qui commence par https://", "error"); return; }
      if (url === lastUrl) return;
      lastUrl = url;
      btn.disabled = true;
      say("Lecture de la page…");
      let found = {};
      try { found = await resolveUrl(url, form.categorie.value === "evenement"); } catch { found = guessFromUrl(url) || {}; }
      const filled = [];
      if (found.categorie && form.categorie.value !== found.categorie) {
        form.categorie.value = found.categorie;
        syncFields();
      }
      if (found.categorie) filled.push(LABELS.categorie);
      for (const k of ["titre", "auteur", "annee", "date", "heure", "ville", "lieu", "organisateur", "type_evenement"]) {
        // On ne remplace jamais ce que la personne a déjà écrit.
        if (found[k] && form[k] && !form[k].value.trim()) { form[k].value = found[k]; filled.push(LABELS[k]); }
      }
      btn.disabled = false;
      const past = form.categorie.value === "evenement" && validDate(form.date.value) && form.date.value < todayIso();
      if (filled.length && past) say(`Rempli à partir du lien, mais attention : cet événement semble déjà passé (${form.date.value.split("-").reverse().join("/")}).`, "error");
      else if (filled.length) say(`Rempli à partir du lien : ${filled.join(", ")}. Vérifiez avant d'envoyer.`, "ok");
      else if (form.categorie.value === "evenement") say("Impossible de lire cette page, mais le lien sera envoyé avec votre proposition. Complétez ce que vous pouvez.", "ok");
      else say("Impossible de lire cette page. Complétez les champs à la main.", "error");
    }

    btn.addEventListener("click", () => { lastUrl = ""; fill(); });
    input.addEventListener("paste", () => setTimeout(fill, 0));
    input.addEventListener("change", fill);
  }

  // ---------- Code-barres et ISBN ----------
  // Recherche d'un livre par son ISBN sur Open Library (sinon Google Livres).
  const cleanIsbn = (v) => String(v || "").replace(/[^0-9Xx]/g, "").toUpperCase();
  function validIsbn(isbn) {
    if (/^97[89]\d{10}$/.test(isbn)) {
      const sum = [...isbn].reduce((a, d, i) => a + (+d) * (i % 2 ? 3 : 1), 0);
      return sum % 10 === 0;
    }
    if (/^\d{9}[\dX]$/.test(isbn)) {
      const sum = [...isbn].reduce((a, d, i) => a + (d === "X" ? 10 : +d) * (10 - i), 0);
      return sum % 11 === 0;
    }
    return false;
  }

  async function lookupIsbn(isbn) {
    const ol = await getJson(`https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&jscmd=data&format=json`);
    const b = ol && ol[`ISBN:${isbn}`];
    if (b && b.title) {
      const out = { titre: b.subtitle ? `${b.title} : ${b.subtitle}` : b.title };
      if (b.authors && b.authors.length) out.auteur = b.authors.map((a) => a.name).join(", ");
      const y = /(\d{4})/.exec(b.publish_date || "");
      if (y) out.annee = y[1];
      return out;
    }
    const gb = await getJson(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`);
    const v = gb && gb.items && gb.items[0] && gb.items[0].volumeInfo;
    if (v && v.title) {
      const out = { titre: v.title };
      if (v.authors) out.auteur = v.authors.join(", ");
      const y = /(\d{4})/.exec(v.publishedDate || "");
      if (y) out.annee = y[1];
      return out;
    }
    return null;
  }

  // Lecture du code-barres : détecteur intégré du navigateur s'il existe,
  // sinon la bibliothèque ZXing (chargée seulement à ce moment-là).
  let zxingLoading = null;
  function loadZxing() {
    if (window.ZXing) return Promise.resolve(window.ZXing);
    zxingLoading = zxingLoading || new Promise((resolve, reject) => {
      const sc = document.createElement("script");
      sc.src = "js/vendor/zxing.min.js";
      sc.onload = () => resolve(window.ZXing);
      sc.onerror = reject;
      document.head.appendChild(sc);
    });
    return zxingLoading;
  }

  async function makeDecoder() {
    if ("BarcodeDetector" in window) {
      try {
        const formats = await window.BarcodeDetector.getSupportedFormats();
        if (formats.includes("ean_13")) {
          const det = new window.BarcodeDetector({ formats: ["ean_13", "ean_8", "upc_a"] });
          return async (source) => {
            const codes = await det.detect(source);
            return codes.length ? codes[0].rawValue : null;
          };
        }
      } catch { /* on passe à ZXing */ }
    }
    const Z = await loadZxing();
    const reader = new Z.MultiFormatReader();
    const hints = new Map();
    hints.set(Z.DecodeHintType.POSSIBLE_FORMATS, [Z.BarcodeFormat.EAN_13, Z.BarcodeFormat.EAN_8, Z.BarcodeFormat.UPC_A]);
    hints.set(Z.DecodeHintType.TRY_HARDER, true);
    reader.setHints(hints);
    const canvas = document.createElement("canvas");
    return async (source) => {
      const w = source.videoWidth || source.naturalWidth || source.width;
      const h = source.videoHeight || source.naturalHeight || source.height;
      if (!w || !h) return null;
      const scale = Math.min(1, 1280 / Math.max(w, h));
      canvas.width = Math.round(w * scale);
      canvas.height = Math.round(h * scale);
      canvas.getContext("2d", { willReadFrequently: true }).drawImage(source, 0, 0, canvas.width, canvas.height);
      try {
        const bmp = new Z.BinaryBitmap(new Z.HybridBinarizer(new Z.HTMLCanvasElementLuminanceSource(canvas)));
        return reader.decode(bmp).getText();
      } catch { return null; }
    };
  }

  function setupScanner(onIsbn) {
    const dlg = $("#scan-dialog");
    const video = $("#scan-video");
    const status = $("#scan-status");
    let stream = null, timer = null, decode = null, done = false;

    const stop = () => {
      clearTimeout(timer);
      if (stream) stream.getTracks().forEach((t) => t.stop());
      stream = null;
      video.srcObject = null;
    };
    const found = (code) => {
      const isbn = cleanIsbn(code);
      if (!validIsbn(isbn)) return false;
      done = true;
      stop();
      dlg.close();
      onIsbn(isbn);
      return true;
    };
    const loop = async () => {
      if (done || !stream) return;
      try { const code = await decode(video); if (code && found(code)) return; } catch { /* image suivante */ }
      timer = setTimeout(loop, 250);
    };

    async function open() {
      done = false;
      status.textContent = "Placez le code-barres au dos du livre dans le cadre.";
      $("#scan-view").hidden = false;
      dlg.showModal();
      try { decode = await makeDecoder(); } catch {
        status.textContent = "La lecture de code-barres n'est pas disponible ici. Tapez l'ISBN à la main.";
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
        video.srcObject = stream;
        await video.play();
        loop();
      } catch {
        // Caméra refusée ou indisponible : on propose une photo à la place.
        $("#scan-view").hidden = true;
        status.textContent = "La caméra n'est pas accessible. Prenez une photo du code-barres, ou tapez l'ISBN.";
      }
    }

    $("#scan-file").addEventListener("change", async (e) => {
      const file = e.target.files && e.target.files[0];
      e.target.value = "";
      if (!file) return;
      status.textContent = "Lecture de la photo…";
      try {
        decode = decode || await makeDecoder();
        const img = new Image();
        img.src = URL.createObjectURL(file);
        await img.decode();
        const code = await decode(img);
        URL.revokeObjectURL(img.src);
        if (!(code && found(code))) status.textContent = "Code-barres illisible. Réessayez de plus près, bien à plat, ou tapez l'ISBN.";
      } catch {
        status.textContent = "Code-barres illisible. Réessayez, ou tapez l'ISBN.";
      }
    });
    dlg.addEventListener("close", stop);
    dlg.addEventListener("click", (e) => { if (e.target.closest("[data-scan-close]") || e.target === dlg) dlg.close(); });
    return open;
  }

  // ---------- Proposer une ressource ----------
  const isPlaceType = (t) => t === "evenement" || t === "association";

  function setupSuggestForm() {
    const form = $("#suggest-form");
    const status = $("#suggest-status");
    const say = (msg, kind) => { status.textContent = msg; status.className = `form-status ${kind || ""}`; };

    const syncFields = () => {
      const type = form.categorie.value;
      form.querySelectorAll("[data-only]").forEach((el) => { el.hidden = !el.dataset.only.split(" ").includes(type); });
      form.querySelectorAll("[data-not]").forEach((el) => { el.hidden = el.dataset.not.split(" ").includes(type); });
      $("#titre-label").textContent = type === "association" ? "Nom" : type === "evenement" ? "Nom de l'événement" : "Titre";
    };
    form.categorie.addEventListener("change", syncFields);
    syncFields();
    form.setType = (type) => { form.categorie.value = type; syncFields(); };
    setupUrlFill(form, say, syncFields);

    // ISBN : saisi à la main ou scanné
    const isbnInput = form.isbn;
    async function fillFromIsbn(raw) {
      const isbn = cleanIsbn(raw);
      if (!isbn) return;
      if (!validIsbn(isbn)) { say("Ce numéro ISBN ne semble pas valide. Vérifiez les chiffres.", "error"); return; }
      isbnInput.value = isbn;
      say("Recherche du livre…");
      const b = await lookupIsbn(isbn);
      if (!b) { say("Livre introuvable avec cet ISBN. Complétez les champs à la main.", "error"); return; }
      const filled = [];
      for (const [k, label] of [["titre", "titre"], ["auteur", "auteur"], ["annee", "année"]]) {
        if (b[k] && !form[k].value.trim()) { form[k].value = b[k]; filled.push(label); }
      }
      say(filled.length ? `Livre trouvé : ${filled.join(", ")} rempli${filled.length > 1 ? "s" : ""}. Vérifiez avant d'envoyer.` : "Livre trouvé : les champs étaient déjà remplis.", "ok");
    }
    isbnInput.addEventListener("change", () => fillFromIsbn(isbnInput.value));
    const openScanner = setupScanner(fillFromIsbn);
    $("#isbn-scan-btn").addEventListener("click", openScanner);

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(form).entries());
      for (const k of Object.keys(data)) data[k] = String(data[k]).trim();
      if (!data.titre) { say("Merci d'indiquer au moins le titre.", "error"); form.titre.focus(); return; }
      if (data.lien && !safeUrl(data.lien)) { say("Le lien doit commencer par https://", "error"); form.lien.focus(); return; }
      if (!isPlaceType(data.categorie) && data.annee && !/^\d{4}$/.test(data.annee)) { say("L'année doit comporter 4 chiffres.", "error"); form.annee.focus(); return; }

      const isPlace = data.categorie === "evenement" || data.categorie === "association";
      const text = [
        "Nouvelle proposition pour Biblio VSS",
        `Type : ${data.categorie}`,
        `Titre / nom : ${data.titre}`,
        ...(isPlace
          ? (data.categorie === "evenement"
            ? [`Type d'événement : ${data.type_evenement || "-"}`, `Date : ${data.date || "-"}${data.heure ? " à " + data.heure : ""}`,
               `Lieu : ${data.lieu || "-"}`, `Ville : ${data.ville || "-"}`, `Organisateur : ${data.organisateur || "-"}`]
            : [`Ville : ${data.ville || "-"}`])
          : [`Auteur·rice : ${data.auteur || "-"}`, `Année : ${data.annee || "-"}`, ...(data.isbn ? [`ISBN : ${data.isbn}`] : [])]),
        `Lien : ${data.lien || "-"}`,
        "",
        `Pourquoi : ${data.pourquoi || "-"}`,
      ].join("\n");

      const btn = form.querySelector("[type=submit]");
      if (CONFIG.suggestionEndpoint) {
        btn.disabled = true;
        say("Envoi en cours…");
        try {
          const res = await fetch(CONFIG.suggestionEndpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify({ ...data, _subject: `Biblio VSS : ${data.titre}`, message: text }),
          });
          if (!res.ok) throw new Error(res.status);
          form.reset();
          syncFields();
          renderSuggestCta();
          say("Merci ! Votre proposition a bien été envoyée.", "ok");
        } catch {
          say("L'envoi n'a pas fonctionné. Vérifiez votre connexion et réessayez.", "error");
        } finally {
          btn.disabled = false;
        }
      } else if (CONFIG.suggestionEmail) {
        const href = `mailto:${encodeURIComponent(CONFIG.suggestionEmail)}?subject=${encodeURIComponent(
          `Biblio VSS : ${data.titre}`)}&body=${encodeURIComponent(text)}`;
        window.location.href = href;
        say("Votre application mail va s'ouvrir avec le message prêt à envoyer.", "ok");
      } else {
        say("L'envoi des propositions n'est pas encore configuré (voir js/config.js).", "error");
      }
    });
  }

  // ---------- Événements ----------
  function toggleFavorite(id) {
    favorites.has(id) ? favorites.delete(id) : favorites.add(id);
    saveFavorites();
    renderList();
    renderFavorites();
    if ($("#detail").open) {
      openDetail(id);
      $("#detail .detail-fav")?.focus(); // garder le focus clavier sur le cœur
    }
  }

  function openList(id) {
    state.list = state.lists.find((l) => l.id === id) || null;
    state.category = "tout";
    renderCategories();
    renderList();
    if ($("#detail").open) $("#detail").close();
    showView("library");
  }

  document.addEventListener("click", (e) => {
    if (e.target.closest("[data-exit]")) { quickExit(); return; }

    if (e.target.closest("[data-quiz-open]")) { openQuiz(); return; }
    if (e.target.closest("[data-quiz-close]")) { quiz.answers = {}; $("#quiz").close(); return; }
    const qa = e.target.closest("[data-quiz-answer]");
    if (qa) {
      const qs = quizQuestions();
      quiz.answers[qs[quiz.step].id] = qa.dataset.quizAnswer;
      quiz.step++; renderQuiz(); return;
    }
    if (e.target.closest("[data-quiz-next]") || e.target.closest("[data-quiz-skip]")) { quiz.step++; renderQuiz(); return; }
    if (e.target.closest("[data-quiz-back]")) { quiz.step = Math.max(-1, quiz.step - 1); renderQuiz(); return; }
    const rubBtn = e.target.closest("[data-rub]");
    if (rubBtn) { openRubrique(rubBtn.dataset.rub); return; }
    if (e.target.closest("[data-rub-back]")) { state.learnRub = ""; renderLearn(); window.scrollTo(0, 0); return; }
    const sheetBtn = e.target.closest("[data-def-sheet]");
    if (sheetBtn) { openDefSheet(sheetBtn.dataset.defSheet); return; }
    const stepBtn = e.target.closest("[data-step]");
    if (stepBtn) {
      const track = stepBtn.closest("[data-steps]").querySelector(".steps-track");
      track.scrollBy({ left: Number(stepBtn.dataset.step) * track.clientWidth, behavior: "smooth" });
      return;
    }
    const defOpen = e.target.closest("[data-def-open]");
    if (defOpen) { openDefinition(defOpen.dataset.defOpen); return; }

    const fav = e.target.closest("[data-fav]");
    if (fav) { e.stopPropagation(); toggleFavorite(fav.dataset.fav); return; }

    const evCard = e.target.closest("[data-event]");
    if (evCard) { openEvent(evCard.dataset.event); return; }

    const ics = e.target.closest("[data-ics]");
    if (ics) { downloadIcs(ics.dataset.ics); return; }

    const aideCat = e.target.closest("[data-aide-cat]");
    if (aideCat) { state.aideCat = aideCat.dataset.aideCat; renderAide(); return; }

    const go = e.target.closest("[data-goto]");
    if (go) {
      document.querySelectorAll("dialog[open]").forEach((d) => { if (d.id === "quiz") { quiz.answers = {}; d.close(); } });
      const type = go.dataset.suggestType || (go.dataset.goto === "suggest" ? libraryType() : "");
      if (type) $("#suggest-form").setType(type);
      showView(go.dataset.goto);
      return;
    }

    const list = e.target.closest("[data-list]");
    if (list) { openList(list.dataset.list); return; }

    if (e.target.closest("[data-list-close]")) { state.list = null; renderList(); return; }

    const chip = e.target.closest("[data-cat]");
    if (chip) { state.category = chip.dataset.cat; renderCategories(); renderList(); return; }

    const card = e.target.closest(".card");
    if (card) { openDetail(card.dataset.id); return; }

    if (e.target.closest("[data-close]")) { $("#detail").close(); return; }

    const reveal = e.target.closest(".reveal");
    if (reveal) reveal.classList.add("shown");

    const tab = e.target.closest(".tab");
    if (tab) {
      if (tab.dataset.view === "learn" && state.learnRub) { state.learnRub = ""; renderLearn(); }
      if (tab.dataset.view === "suggest" && libraryType()) $("#suggest-form").setType(libraryType());
      showView(tab.dataset.view);
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    const card = e.target.closest && e.target.closest(".card");
    if (card && e.target === card) {
      e.preventDefault();
      card.dataset.event ? openEvent(card.dataset.event) : openDetail(card.dataset.id);
    }
    if (e.target.classList && e.target.classList.contains("reveal")) e.target.classList.add("shown");
  });

  // Fermer la fiche en touchant le fond
  $("#detail").addEventListener("click", (e) => { if (e.target.id === "detail") e.currentTarget.close(); });

  $("#search").addEventListener("input", (e) => { state.query = e.target.value; renderList(); });
  $("#theme-filter").addEventListener("change", (e) => { state.theme = e.target.value; renderList(); });
  $("#gentle").addEventListener("change", (e) => { state.gentle = e.target.checked; renderList(); });
  $("#event-city").addEventListener("change", (e) => {
    state.eventCity = e.target.value;
    store.set(CITY_KEY, state.eventCity); // ville mémorisée sur l'appareil uniquement
    renderEvents();
  });
  $("#event-type").addEventListener("change", (e) => { state.eventType = e.target.value; renderEvents(); });
  $("#learn-search").addEventListener("input", (e) => { state.learnQuery = e.target.value; renderLearn(); });
  document.addEventListener("scroll", (e) => {
    const track = e.target.classList && e.target.classList.contains("steps-track") ? e.target : null;
    if (!track) return;
    const i = Math.round(track.scrollLeft / track.clientWidth);
    track.parentNode.querySelectorAll(".steps-dots i").forEach((dot, k) => dot.classList.toggle("on", k === i));
  }, true);
  $("#quiz").addEventListener("close", () => { quiz.answers = {}; });
  $("#aide-search").addEventListener("input", (e) => { state.aideQuery = e.target.value; renderAide(); });

  function showView(name) {
    const update = () => {
      document.querySelectorAll(".view").forEach((v) => v.classList.toggle("active", v.id === `view-${name}`));
      document.querySelectorAll(".tab").forEach((t) => {
        const on = t.dataset.view === name;
        t.classList.toggle("active", on);
        // aria-current : les lecteurs d'écran annoncent l'onglet affiché (la couleur seule ne suffit pas).
        if (on) t.setAttribute("aria-current", "page"); else t.removeAttribute("aria-current");
      });
      if (name === "favorites") renderFavorites();
      window.scrollTo(0, 0);
    };
    // Fondu entre les onglets si le navigateur sait le faire ; sinon changement immédiat.
    if (document.startViewTransition) document.startViewTransition(update); else update();
  }

  // ---------- Démarrage ----------
  async function loadJson(url, fallback) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(res.status);
      return await res.json();
    } catch { return fallback; }
  }

  async function init() {
    const [items, lists, events, aide, learn] = await Promise.all([
      loadJson("data/ressources.json", null),
      loadJson("data/listes.json", []),
      loadJson("data/evenements.json", []),
      loadJson("data/aide.json", []),
      loadJson("data/comprendre.json", null),
    ]);
    state.learn = learn && learn.definitions ? learn : null;
    renderLearn();
    state.events = Array.isArray(events) ? events : [];
    state.aide = Array.isArray(aide) ? aide : [];
    renderEventFilters();
    renderEvents();
    renderAide();
    if (!items) {
      $("#list").innerHTML = `<li class="empty">Impossible de charger la bibliothèque. Vérifiez votre connexion.</li>`;
      return;
    }
    state.items = items.sort((a, b) => a.titre.localeCompare(b.titre, "fr"));
    state.lists = lists;
    renderCategories();
    renderThemes();
    renderLists();
    renderList();
    setupSuggestForm();

    if (!store.get(WELCOME_KEY, false)) {
      const w = $("#welcome");
      w.showModal();
      $("#welcome-ok").addEventListener("click", () => { store.set(WELCOME_KEY, true); w.close(); });
    }
  }

  // Le service worker (mode hors-ligne) ne sert que dans le navigateur :
  // dans l'application native, les fichiers sont déjà sur le téléphone.
  if ("serviceWorker" in navigator && !isNative()) {
    window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
  }

  init();
})();
