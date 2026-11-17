(() => {
  "use strict";

  const CATEGORIES = {
    tout: { label: "Tout", icon: "✦" },
    livre: { label: "Livres", one: "Livre", icon: "📖" },
    film: { label: "Films", one: "Film", icon: "🎬" },
    serie: { label: "Séries", one: "Série", icon: "📺" },
    documentaire: { label: "Documentaires", one: "Documentaire", icon: "🎥" },
    podcast: { label: "Podcasts", one: "Podcast", icon: "🎧" },
    article: { label: "Articles & rapports", one: "Article / rapport", icon: "📰" },
    bd: { label: "BD", one: "BD", icon: "💬" },
  };

  const LEVELS = {
    1: "Intensité modérée",
    2: "Intensité forte",
    3: "Intensité très forte",
  };

  // Site neutre ouvert par la sortie rapide.
  const EXIT_URL = "https://www.google.com/search?q=m%C3%A9t%C3%A9o";
  const FAV_KEY = "biblio-vss:favoris";
  const WELCOME_KEY = "biblio-vss:accueil-vu";

  const state = { items: [], category: "tout", theme: "", query: "", gentle: false };

  const $ = (sel) => document.querySelector(sel);

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
  let favorites = new Set(store.get(FAV_KEY, []));
  const saveFavorites = () => store.set(FAV_KEY, [...favorites]);

  // ---------- Utilitaires ----------
  const normalize = (s) =>
    String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

  const escapeHtml = (s) =>
    String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const safeUrl = (u) => (/^https:\/\//i.test(u || "") ? u : null);

  // ---------- Sortie rapide ----------
  function quickExit() {
    document.body.innerHTML = "";
    window.location.replace(EXIT_URL);
  }
  $("#quick-exit").addEventListener("click", quickExit);
  let lastEsc = 0;
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    const now = Date.now();
    if (now - lastEsc < 600) quickExit();
    lastEsc = now;
  });

  // ---------- Filtres ----------
  function filtered() {
    const q = normalize(state.query.trim());
    return state.items.filter((it) => {
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
    const cat = CATEGORIES[it.categorie] || { icon: "•", label: it.categorie };
    const isFav = favorites.has(it.id);
    return `
      <li class="card" tabindex="0" data-id="${escapeHtml(it.id)}">
        <div class="card-icon" aria-hidden="true">${cat.icon}</div>
        <div class="card-main">
          <p class="card-title">${escapeHtml(it.titre)}</p>
          <p class="card-meta">${escapeHtml(cat.one || cat.label)} · ${escapeHtml(it.auteur)} · ${escapeHtml(it.annee)}</p>
          <div class="tags">
            <span class="level level-${it.intensite}">${LEVELS[it.intensite] || ""}</span>
          </div>
          <div class="tags" style="margin-top:6px">
            ${it.themes.map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join("")}
          </div>
        </div>
        <button class="fav-btn" type="button" data-fav="${escapeHtml(it.id)}"
          aria-pressed="${isFav}" aria-label="${isFav ? "Retirer des" : "Ajouter aux"} favoris">${isFav ? "♥" : "♡"}</button>
      </li>`;
  }

  function renderList() {
    const items = filtered();
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
    const dlg = $("#detail");
    dlg.querySelector(".sheet-body").innerHTML = `
      <button class="quick-exit sheet-exit" type="button" data-exit>Sortie rapide</button>
      <p class="card-meta">${cat.icon} ${escapeHtml(cat.one || cat.label)}</p>
      <h2 id="detail-title">${escapeHtml(it.titre)}</h2>
      <p class="card-meta">${escapeHtml(it.auteur)} · ${escapeHtml(it.annee)}</p>
      <div class="warning">
        <span class="level level-${it.intensite}">${LEVELS[it.intensite] || ""}</span><br>
        Thèmes abordés : ${it.themes.map(escapeHtml).join(", ")}.
        ${strong ? "<br>Ce contenu peut être particulièrement éprouvant. Le résumé est masqué : appuyez dessus pour l'afficher." : ""}
      </div>
      <p class="reveal${strong ? "" : " shown"}" id="detail-resume" tabindex="0">${escapeHtml(it.resume)}</p>
      <div class="btn-row">
        <button class="btn" type="button" data-fav="${escapeHtml(it.id)}">${isFav ? "♥ Retirer des favoris" : "♡ Ajouter aux favoris"}</button>
        ${link ? `<a class="btn" href="${escapeHtml(link)}" target="_blank" rel="noopener">Consulter ↗</a>` : ""}
      </div>
      <div class="btn-row">
        <button class="btn primary" type="button" data-close>Fermer</button>
      </div>`;
    dlg.showModal();
  }

  // ---------- Événements ----------
  function toggleFavorite(id) {
    favorites.has(id) ? favorites.delete(id) : favorites.add(id);
    saveFavorites();
    renderList();
    renderFavorites();
    if ($("#detail").open) openDetail(id);
  }

  document.addEventListener("click", (e) => {
    if (e.target.closest("[data-exit]")) { quickExit(); return; }

    const fav = e.target.closest("[data-fav]");
    if (fav) { e.stopPropagation(); toggleFavorite(fav.dataset.fav); return; }

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
  async function init() {
    try {
      const res = await fetch("data/ressources.json");
      state.items = await res.json();
    } catch {
      $("#list").innerHTML = `<li class="empty">Impossible de charger la bibliothèque. Vérifiez votre connexion.</li>`;
      return;
    }
    state.items.sort((a, b) => a.titre.localeCompare(b.titre, "fr"));
    renderCategories();
    renderThemes();
    renderList();

    if (!store.get(WELCOME_KEY, false)) {
      const w = $("#welcome");
      w.showModal();
      $("#welcome-ok").addEventListener("click", () => { store.set(WELCOME_KEY, true); w.close(); });
    }
  }

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
  }

  init();
})();
