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
  function quickExit() {
    document.body.innerHTML = "";
    if (isNative()) {
      // Dans l'application : page neutre locale, puis fermeture sur Android
      // (iOS n'autorise pas une application à se fermer elle-même).
      window.location.replace("neutre.html");
      const App = window.Capacitor.Plugins && window.Capacitor.Plugins.App;
      if (App && window.Capacitor.getPlatform() === "android") App.exitApp();
      return;
    }
    window.location.replace(CONFIG.exitUrl);
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

  function renderCategories() {
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
          ? [`Date : ${data.date || "-"}`, `Ville : ${data.ville || "-"}`]
          : [`Auteur·rice : ${data.auteur || "-"}`, `Année : ${data.annee || "-"}`]),
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
      if (go.dataset.suggestType) $("#suggest-form").setType(go.dataset.suggestType);
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
    if (tab) showView(tab.dataset.view);
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
