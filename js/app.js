(() => {
  "use strict";

  const CONFIG = Object.assign(
    { suggestionEndpoint: "", suggestionEmail: "", exitUrl: "https://www.google.com/search?q=m%C3%A9t%C3%A9o" },
    window.BIBLIO_CONFIG || {}
  );

  const CATEGORIES = {
    tout: { label: "Tout", icon: "✦" },
    livre: { label: "Livres", one: "Livre", icon: "📖", color: "#7a4fb5" },
    film: { label: "Films", one: "Film", icon: "🎬", color: "#b23b5a" },
    serie: { label: "Séries", one: "Série", icon: "📺", color: "#2f7fb5" },
    documentaire: { label: "Documentaires", one: "Documentaire", icon: "🎥", color: "#2d8a7a" },
    podcast: { label: "Podcasts", one: "Podcast", icon: "🎧", color: "#c06a2b" },
    article: { label: "Articles & rapports", one: "Article / rapport", icon: "📰", color: "#4a5568" },
    bd: { label: "BD", one: "BD", icon: "💬", color: "#b5892f" },
  };

  const LEVELS = {
    1: "Intensité modérée",
    2: "Intensité forte",
    3: "Intensité très forte",
  };

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
    const cat = CATEGORIES[it.categorie] || { icon: "•", color: "#5b3a8c" };
    const img = safeImage(it.image);
    if (img) {
      return `<div class="cover cover-${size}"><img src="${escapeHtml(img)}" alt="" loading="lazy"
        onerror="this.parentNode.classList.add('cover-fallback');this.remove()"></div>`;
    }
    return `<div class="cover cover-${size} cover-gen" style="--c:${cat.color}" aria-hidden="true">
        <span class="cover-icon">${cat.icon}</span>
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
      if (state.category !== "tout" && it.categorie !== state.category) return false;
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
          <p class="card-meta">${escapeHtml(cat.one || cat.label)} · ${escapeHtml(it.auteur)} · ${escapeHtml(it.annee)}</p>
          <div class="tags">
            <span class="level level-${it.intensite}">${LEVELS[it.intensite] || ""}</span>
            ${scBadge(it)}
          </div>
          <div class="tags tags-themes">
            ${it.themes.map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join("")}
          </div>
        </div>
        <button class="fav-btn" type="button" data-fav="${escapeHtml(it.id)}"
          aria-pressed="${isFav}" aria-label="${isFav ? "Retirer des" : "Ajouter aux"} favoris">${isFav ? "♥" : "♡"}</button>
      </li>`;
  }

  function renderLists() {
    $("#lists").innerHTML = state.lists.map((l) => {
      const n = l.ressources.filter((id) => state.items.some((it) => it.id === id)).length;
      return `<button class="list-card" type="button" data-list="${escapeHtml(l.id)}" style="--c:${escapeHtml(l.couleur || "#5b3a8c")}">
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
      : `<li class="empty">Aucun favori pour l'instant. Appuyez sur ♡ pour en ajouter.</li>`;
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

  function renderCategories() {
    renderSuggestCta();
    const counts = state.items.reduce((acc, it) => ((acc[it.categorie] = (acc[it.categorie] || 0) + 1), acc), {});
    $("#categories").innerHTML = Object.entries(CATEGORIES)
      .filter(([key]) => key === "tout" || counts[key])
      .map(([key, c]) =>
        `<button class="chip${key === state.category ? " active" : ""}" type="button" data-cat="${key}">${c.icon} ${c.label}</button>`)
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
    const cat = CATEGORIES[it.categorie] || { icon: "•", label: it.categorie };
    const isFav = favorites.has(it.id);
    const strong = it.intensite >= 3;
    const link = safeUrl(it.lien);
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
          <p class="card-meta">${cat.icon} ${escapeHtml(cat.one || cat.label)}</p>
          <h2 id="detail-title">${escapeHtml(it.titre)}</h2>
          <p class="card-meta">${escapeHtml(it.auteur)} · ${escapeHtml(it.annee)}</p>
        </div>
      </div>
      ${scHtml}
      ${it.image && it.image_credit ? `<p class="img-credit">Image : ${escapeHtml(it.image_credit)}</p>` : ""}
      <div class="warning">
        <span class="level level-${it.intensite}">${LEVELS[it.intensite] || ""}</span><br>
        Thèmes abordés : ${it.themes.map(escapeHtml).join(", ")}.
        ${strong ? "<br>Ce contenu peut être particulièrement éprouvant. Le résumé est masqué : appuyez dessus pour l'afficher." : ""}
      </div>
      <p class="reveal${strong ? "" : " shown"}" id="detail-resume" tabindex="0">${escapeHtml(it.resume)}</p>
      ${inLists.length ? `<p class="card-meta">Dans les listes : ${inLists
        .map((l) => `<button class="link-btn" type="button" data-list="${escapeHtml(l.id)}">${escapeHtml(l.titre)}</button>`)
        .join(", ")}</p>` : ""}
      <div class="btn-row">
        <button class="btn" type="button" data-fav="${escapeHtml(it.id)}">${isFav ? "♥ Retirer des favoris" : "♡ Ajouter aux favoris"}</button>
        ${link ? `<a class="btn" href="${escapeHtml(link)}" target="_blank" rel="noopener">Consulter ↗</a>` : ""}
      </div>
      <div class="btn-row">
        <button class="btn primary" type="button" data-close>Fermer</button>
      </div>`;
    if (!dlg.open) dlg.showModal();
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
            <p class="card-title">${escapeHtml(ev.titre)}</p>
            <p class="card-meta">${escapeHtml(ev.type || "Événement")} · ${escapeHtml(ev.ville || "")}${validTime(ev.heure) ? " · " + ev.heure.replace(":", "h") : ""}</p>
            ${ev.lieu ? `<p class="card-meta">📍 ${escapeHtml(ev.lieu)}</p>` : ""}
            ${ev.gratuit ? `<div class="tags"><span class="tag">Gratuit</span></div>` : ""}
          </div>
        </li>`;
    }).join("") : `<li class="empty">${state.events.length && (state.eventCity || state.eventType)
      ? "Aucun événement à venir pour ce filtre."
      : "Aucun événement à venir pour le moment."}<br><br>
      Vous organisez un groupe de parole, une conférence, une projection ?<br>
      <button class="btn" type="button" data-goto="suggest" data-suggest-type="evenement">Proposer un événement</button></li>`;
  }

  function openEvent(id) {
    const ev = state.events.find((x) => x.id === id);
    if (!ev) return;
    const link = safeUrl(ev.lien);
    const dlg = $("#detail");
    dlg.querySelector(".sheet-body").innerHTML = `
      <button class="quick-exit sheet-exit" type="button" data-exit>Sortie rapide</button>
      <p class="card-meta">📅 ${escapeHtml(ev.type || "Événement")}</p>
      <h2 id="detail-title">${escapeHtml(ev.titre)}</h2>
      <ul class="event-facts">
        <li>🗓 ${escapeHtml(formatDate(ev))}</li>
        <li>📍 ${escapeHtml([ev.lieu, ev.ville].filter(Boolean).join(", "))}</li>
        ${ev.organisateur ? `<li>👥 ${escapeHtml(ev.organisateur)}</li>` : ""}
        ${ev.gratuit ? "<li>💶 Gratuit</li>" : ""}
      </ul>
      ${ev.description ? `<p>${escapeHtml(ev.description)}</p>` : ""}
      <div class="btn-row">
        <button class="btn" type="button" data-ics="${escapeHtml(ev.id)}">Ajouter à mon agenda</button>
        ${link ? `<a class="btn" href="${escapeHtml(link)}" target="_blank" rel="noopener">En savoir plus ↗</a>` : ""}
      </div>
      <div class="btn-row">
        <button class="btn primary" type="button" data-close>Fermer</button>
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
    if (c.type === "tel" && /^\+?\d{3,15}$/.test(c.valeur)) return `<a class="contact" href="tel:${c.valeur}">📞 ${escapeHtml(label)}</a>`;
    if (c.type === "sms" && /^\+?\d{3,15}$/.test(c.valeur)) return `<a class="contact" href="sms:${c.valeur}">✉️ SMS ${escapeHtml(label)}</a>`;
    if (c.type === "email" && /^[^@\s"<>]+@[^@\s"<>]+\.[a-z]{2,}$/i.test(c.valeur))
      return `<a class="contact" href="mailto:${escapeHtml(c.valeur)}">✉️ ${escapeHtml(label)}</a>`;
    const url = safeUrl(c.valeur);
    if (!url) return "";
    const text = c.label || (c.type === "tchat" ? "Tchat" : "Site web");
    return `<a class="contact" href="${escapeHtml(url)}" target="_blank" rel="noopener">${c.type === "tchat" ? "💬" : "🌐"} ${escapeHtml(text)}</a>`;
  }

  function renderAide() {
    const present = new Set(state.aide.map((a) => a.categorie));
    $("#aide-cats").innerHTML = Object.entries(AIDE_CATEGORIES)
      .filter(([k]) => k === "tout" || present.has(k))
      .map(([k, label]) => `<button class="chip${k === state.aideCat ? " active" : ""}" type="button" data-aide-cat="${k}">${label}</button>`)
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
        <p class="card-meta">📍 ${escapeHtml(a.ville || "")}${a.horaires ? ` · 🕒 ${escapeHtml(a.horaires)}` : ""}</p>
        <p class="help-desc">${escapeHtml(a.description)}</p>
        <div class="contacts">${(a.contacts || []).map(contactHtml).join("")}</div>
      </li>`).join("") : `<li class="empty">Aucun résultat dans l'annuaire.</li>`;
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
    if ($("#detail").open) openDetail(id);
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
  $("#aide-search").addEventListener("input", (e) => { state.aideQuery = e.target.value; renderAide(); });

  function showView(name) {
    document.querySelectorAll(".view").forEach((v) => v.classList.toggle("active", v.id === `view-${name}`));
    document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t.dataset.view === name));
    if (name === "favorites") renderFavorites();
    window.scrollTo(0, 0);
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
    const [items, lists, events, aide] = await Promise.all([
      loadJson("data/ressources.json", null),
      loadJson("data/listes.json", []),
      loadJson("data/evenements.json", []),
      loadJson("data/aide.json", []),
    ]);
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
