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

  const FAV_KEY = "biblio-vss:favoris";
  const WELCOME_KEY = "biblio-vss:accueil-vu";

  const state = { items: [], lists: [], list: null, category: "tout", theme: "", query: "", gentle: false };

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

  // ---------- Proposer une ressource ----------
  function setupSuggestForm() {
    const form = $("#suggest-form");
    const status = $("#suggest-status");
    const say = (msg, kind) => { status.textContent = msg; status.className = `form-status ${kind || ""}`; };

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(form).entries());
      for (const k of Object.keys(data)) data[k] = String(data[k]).trim();
      if (!data.titre) { say("Merci d'indiquer au moins le titre.", "error"); form.titre.focus(); return; }
      if (data.lien && !safeUrl(data.lien)) { say("Le lien doit commencer par https://", "error"); form.lien.focus(); return; }
      if (data.annee && !/^\d{4}$/.test(data.annee)) { say("L'année doit comporter 4 chiffres.", "error"); form.annee.focus(); return; }

      const text = [
        "Nouvelle proposition pour Biblio VSS",
        `Type : ${data.categorie}`,
        `Titre : ${data.titre}`,
        `Auteur·rice : ${data.auteur || "-"}`,
        `Année : ${data.annee || "-"}`,
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
    if (card && e.target === card) { e.preventDefault(); openDetail(card.dataset.id); }
    if (e.target.classList && e.target.classList.contains("reveal")) e.target.classList.add("shown");
  });

  // Fermer la fiche en touchant le fond
  $("#detail").addEventListener("click", (e) => { if (e.target.id === "detail") e.currentTarget.close(); });

  $("#search").addEventListener("input", (e) => { state.query = e.target.value; renderList(); });
  $("#theme-filter").addEventListener("change", (e) => { state.theme = e.target.value; renderList(); });
  $("#gentle").addEventListener("change", (e) => { state.gentle = e.target.checked; renderList(); });

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
    const [items, lists] = await Promise.all([loadJson("data/ressources.json", null), loadJson("data/listes.json", [])]);
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
