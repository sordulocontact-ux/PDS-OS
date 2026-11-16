// Runtime of the Finance prototype: replays the states captured from the
// real app (crawl.cjs). Pages and their variants, overlays (side sheets,
// forms, menus, selects), tooltips, search filtering, columns, toasts.
(async () => {
  const raw = document.getElementById("proto-data").textContent.trim();
  const bin = Uint8Array.from(atob(raw), (c) => c.charCodeAt(0));
  const text = await new Response(
    new Blob([bin]).stream().pipeThrough(new DecompressionStream("gzip")),
  ).text();
  const D = JSON.parse(text);

  const app = document.getElementById("proto-app");
  const layerBox = document.getElementById("proto-layer");
  const tipBox = document.getElementById("proto-tip");
  const toastList = document.getElementById("proto-toasts");
  const HOME = "/app/finance";

  let current = null; // state key shown
  let stack = []; // [{ id, trigger }]

  // ---- routing -------------------------------------------------------------
  const keyOf = (url) => {
    const u = new URL(url, "http://x");
    const params = [...u.searchParams.entries()].filter(([k]) => k !== "ouvrir").sort();
    const s = new URLSearchParams(params).toString();
    return { path: u.pathname, key: u.pathname + (s ? "?" + s : ""), open: u.searchParams.get("ouvrir"), full: u.pathname + u.search };
  };
  function stateFor(url) {
    const k = keyOf(url);
    return D.routes[k.full.replace(/\/$/, "")] || D.routes[k.key] || D.routes[k.path] || null;
  }
  function go(url, { push = true } = {}) {
    const k = keyOf(url);
    const key = stateFor(url);
    if (!key) {
      if (k.path.startsWith(HOME)) toast("Cette page n'est pas encore remplie.");
      else toast("Le prototype montre la Finance.");
      return;
    }
    if (push) history.pushState(null, "", "#" + k.full);
    show(key);
    window.scrollTo(0, 0);
  }
  function show(key) {
    closeAll();
    filters = new Map();
    current = key;
    const st = D.states[key];
    app.innerHTML = st.html;
    document.title = st.title || "Finance";
    if (st.layer) openLayer(st.layer, null);
    hydrate(app);
  }
  window.addEventListener("popstate", () => go(location.hash.slice(1) || HOME, { push: false }));

  // What the captured DOM cannot carry: open <details>, focus rings, etc.
  function hydrate(root) {
    root.querySelectorAll("[data-proto-drop]").forEach((e) => e.remove());
    root.querySelectorAll("input[value]").forEach((i) => { i.value = i.getAttribute("value"); });
  }

  // ---- layers --------------------------------------------------------------
  function openLayer(id, trigger) {
    const L = D.layers[id];
    if (!L) return;
    stack.push({ id, trigger });
    paint();
  }
  function paint() {
    const top = stack[stack.length - 1];
    if (!top) {
      layerBox.innerHTML = "";
      document.documentElement.style.overflow = "";
      return;
    }
    layerBox.innerHTML = D.layers[top.id].html;
    hydrate(layerBox);
    const modal = layerBox.querySelector("[role=dialog],[role=alertdialog]");
    document.documentElement.style.overflow = modal ? "hidden" : "";
    // Floating parts (menus, selects, popovers) sit by their trigger.
    if (top.trigger) place(layerBox, top.trigger);
    const focus = layerBox.querySelector("[autofocus], [role=dialog] input:not([type=hidden]), [role=combobox] input");
    if (focus && /search|Rechercher/i.test(focus.getAttribute("placeholder") || focus.type)) focus.focus();
  }
  function closeTop() { stack.pop(); paint(); }
  function closeAll() { stack = []; paint(); }

  function floats(box) {
    const all = [...box.querySelectorAll("*")].filter((el) => {
      const cs = getComputedStyle(el);
      if (cs.position !== "absolute" && cs.position !== "fixed") return false;
      const b = el.getBoundingClientRect();
      return b.width > 0 && !(b.width >= innerWidth * 0.85 && b.height >= innerHeight * 0.85);
    });
    return all.filter((el) => !all.some((o) => o !== el && o.contains(el)));
  }
  function place(box, trigger) {
    const r = trigger.getBoundingClientRect();
    for (const el of floats(box)) {
      if (el.closest("[role=dialog]") && !el.matches("[data-side]") && !el.querySelector("[role=menu],[role=listbox],[role=tooltip]")) continue;
      const pop = el.querySelector("[data-side]") || el;
      const side = pop.getAttribute("data-side") || "bottom";
      const align = pop.getAttribute("data-align") || "start";
      el.style.position = "fixed";
      el.style.transform = "none";
      el.style.translate = "none";
      el.style.inset = "auto";
      const w = el.offsetWidth, h = el.offsetHeight, gap = 6;
      let top = side === "top" ? r.top - h - gap : side === "bottom" ? r.bottom + gap : r.top;
      let left = side === "left" ? r.left - w - gap : side === "right" ? r.right + gap
        : align === "end" ? r.right - w : align === "center" ? r.left + r.width / 2 - w / 2 : r.left;
      if (top + h > innerHeight - 8 && side === "bottom") top = Math.max(8, r.top - h - gap);
      left = Math.min(Math.max(8, left), innerWidth - w - 8);
      top = Math.min(Math.max(8, top), innerHeight - h - 8);
      el.style.top = top + "px";
      el.style.left = left + "px";
    }
  }

  // ---- tooltips ------------------------------------------------------------
  let tipTimer = null;
  document.addEventListener("pointerover", (e) => {
    const el = e.target.closest?.("[data-p]");
    clearTimeout(tipTimer);
    if (!el || !D.tips[el.dataset.p]) { tipBox.innerHTML = ""; return; }
    tipTimer = setTimeout(() => {
      tipBox.innerHTML = D.tips[el.dataset.p].html;
      place(tipBox, el);
    }, 150);
  });
  document.addEventListener("pointerout", (e) => {
    if (e.target.closest?.("[data-p]")) { clearTimeout(tipTimer); tipBox.innerHTML = ""; }
  });

  // ---- toasts --------------------------------------------------------------
  const CHECK = '<svg aria-hidden="true" class="toast-icon" data-tone="success" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="square"><path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"/><path d="M7.5 12.5L10.5 15.5L16.5 9.5"/></svg>';
  function toast(title, success = false) {
    const li = document.createElement("li");
    li.className = "toast";
    li.setAttribute("role", "status");
    li.style.cssText = "--toast-y:0px;--toast-scale:1;--toast-cut:0px;z-index:10";
    li.innerHTML = `<div class="toast-card" data-state="entering">${success ? CHECK : ""}<div class="flex min-w-0 flex-1 flex-col gap-0.5"><div class="break-words"></div></div><button type="button" class="toast-close" aria-label="Fermer la notification"><svg aria-hidden="true" class="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M18 6 6 18M6 6l12 12"/></svg></button></div>`;
    li.querySelector(".break-words").textContent = title;
    toastList.replaceChildren(li);
    requestAnimationFrame(() => requestAnimationFrame(() => li.firstChild.removeAttribute("data-state")));
    const bye = () => { li.dataset.exit = "fade"; setTimeout(() => li.remove(), 300); };
    li.querySelector(".toast-close").onclick = bye;
    setTimeout(bye, 3500);
  }
  const DONE = [
    [/^enregistrer comme/i, "Modèle enregistré"],
    [/^enregistrer un encaissement/i, "Encaissement enregistré"],
    [/^enregistrer/i, "Enregistré"],
    [/^rattacher/i, "Rattaché"],
    [/^valider/i, "Validé"],
    [/^supprimer/i, "Supprimé"],
    [/^archiver/i, "Archivé"],
    [/^ignorer/i, "Opération ignorée"],
    [/^marquer/i, "C'est noté"],
    [/^défaire/i, "Rattachement défait"],
    [/^retirer/i, "Retiré"],
    [/^envoyer|^relancer/i, "Envoyé"],
    [/^importer/i, "Relevé importé"],
    [/^télécharger|^exporter/i, "Fichier prêt"],
    [/^copier/i, "Copié"],
    [/^annuler l/i, "Annulé"],
    [/^planifier|^ajouter|^créer|^nouveau|^nouvelle/i, "Ajouté"],
  ];
  const doneText = (label) => (DONE.find(([re]) => re.test(label)) || [0, "C'est fait"])[1];

  // ---- clicks --------------------------------------------------------------
  const sigOf = (el) => `${el.tagName}|${((el.innerText || "").trim().replace(/\s+/g, " ").slice(0, 160)) || (el.getAttribute("aria-label") || el.title || "").trim()}`;
  const CLOSE = /^(fermer|close)$/i;
  // The clicks of a path's own page, by element (tag and text), for a page of
  // the same path kept without them.
  const textSig = (el) => `${el.tagName}|${(el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 160)}|${el.getAttribute("aria-label") || ""}`;
  const borrowCache = {};
  function borrowed(key) {
    if (borrowCache[key]) return borrowCache[key];
    const tpl = document.createElement("template");
    tpl.innerHTML = D.states[key].html;
    const map = new Map();
    for (const el of tpl.content.querySelectorAll("[data-p]")) {
      const a = D.actions[el.dataset.p];
      if (a && !a.noop && !map.has(textSig(el))) map.set(textSig(el), a);
    }
    return (borrowCache[key] = map);
  }

  document.addEventListener("click", (e) => {
    const t = e.target;
    if (!(t instanceof Element)) return;
    if (t.closest("#proto-toasts")) return;
    const inLayer = layerBox.contains(t);

    // Fields keep their native behaviour.
    if (t.closest("input,textarea,select,label") && !t.closest("[data-p][role]")) {
      if (t.closest("input[type=file]")) e.preventDefault();
      return;
    }

    // A column of « Colonnes »: tick it and show or hide its column.
    const check = t.closest("[role=menuitemcheckbox]");
    if (check) {
      e.preventDefault();
      const on = check.getAttribute("aria-checked") !== "true";
      check.setAttribute("aria-checked", String(on));
      if (on) check.setAttribute("data-checked", ""); else check.removeAttribute("data-checked");
      check.querySelectorAll("svg").forEach((s) => { s.style.visibility = on ? "" : "hidden"; });
      toggleColumn(check.innerText.trim(), on);
      return;
    }

    // An option of a select: shown in its button, and on a list page the
    // table keeps only the rows of that value.
    const option = inLayer && t.closest("[role=option]");
    if (option && stack.length) {
      e.preventDefault();
      e.stopPropagation();
      choose(option);
      return;
    }

    // Close gestures of an overlay.
    const btn = t.closest("button,a,[role=button],[role=menuitem],[role=option],tr");
    const label = btn ? ((btn.innerText || "").trim() || btn.getAttribute("aria-label") || "") : "";
    if (inLayer && btn && CLOSE.test(label)) { e.preventDefault(); closeAll(); return; }

    // Recorded action, on the element or its nearest recorded ancestor.
    let action = null, el = null;
    for (let x = t; x && x !== document.body; x = x.parentElement) {
      const id = x.dataset?.p;
      if (id && D.actions[id] && !D.actions[id].noop) { action = D.actions[id]; el = x; break; }
    }
    if (!action && btn) {
      const a = D.sigs[sigOf(btn)];
      if (a) { action = a; el = btn; }
    }
    // Phone-only buttons (not on the desktop page captured) do what their
    // desktop twin does.
    if (!action && btn && /^Dépense$/.test(label)) {
      const twin = [...app.querySelectorAll("[data-p]")].find((x) => D.actions[x.dataset.p]?.layer && (x.innerText || "").trim() === "Ajouter une dépense");
      if (twin) { action = D.actions[twin.dataset.p]; el = btn; }
    }
    if (!action && !inLayer && D.primaryOf[current]) {
      const map = borrowed(D.primaryOf[current]);
      for (let x = t; x && x !== app; x = x.parentElement) {
        const a = map.get(textSig(x));
        if (a) { action = a; el = x; break; }
      }
    }

    // Links: routed inside the prototype.
    const link = t.closest("a[href]");
    if (link && !action) {
      e.preventDefault();
      const href = link.getAttribute("href");
      if (href.startsWith("#")) { document.getElementById(href.slice(1))?.scrollIntoView({ behavior: "smooth" }); return; }
      if (link.target === "_blank") { toast("Le document s'ouvre dans un nouvel onglet."); return; }
      go(href);
      return;
    }

    if (action) {
      e.preventDefault();
      e.stopPropagation();
      if (action.layer) {
        if (inLayer) { stack.push({ id: action.layer, trigger: el.isConnected ? el : null }); paint(); }
        else { closeAll(); openLayer(action.layer, el); }
      } else if (action.nav) go(action.nav);
      else if (action.state) { closeAll(); app.innerHTML = D.states[action.state].html; hydrate(app); current = action.state; }
      else if (action.write && /^(joindre|déposer)/i.test(action.write)) pickFile();
      else if (action.write && /^(clair|sombre|système)$/i.test(action.write)) setTheme(action.write.toLowerCase());
      else if (action.write) { closeAll(); toast(doneText(action.write), true); }
      else if (action.file) pickFile();
      return;
    }

    // Unrecorded buttons in an overlay: a submit saves, « Annuler » goes back.
    if (inLayer && btn) {
      if (/^annuler$|^retour/i.test(label)) { e.preventDefault(); closeTop(); return; }
      if (btn.matches("[type=submit]") || btn.closest("form")) { e.preventDefault(); closeAll(); toast(doneText(label), true); return; }
    }
    // A click on the backdrop closes the top overlay.
    if (inLayer && !t.closest("[role=dialog],[role=alertdialog],[role=menu],[role=listbox],[role=tooltip],[data-side],[data-p] button")) {
      closeTop();
    }
  }, true);

  document.addEventListener("submit", (e) => { e.preventDefault(); closeAll(); toast("Enregistré", true); }, true);

  // The theme chips of the account menu work: light, dark or the system's.
  function setTheme(choice) {
    const dark = choice === "sombre" || (choice === "système" && matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", dark);
    document.documentElement.classList.toggle("light", !dark);
    document.documentElement.style.colorScheme = dark ? "dark" : "light";
  }

  function pickFile() {
    const i = document.createElement("input");
    i.type = "file";
    i.onchange = () => { if (i.files?.length) toast("Justificatif ajouté : " + i.files[0].name, true); };
    i.click();
  }

  function choose(option) {
    const value = option.innerText.trim();
    const all = [...option.closest("[role=listbox]")?.querySelectorAll("[role=option]") || []].map((o) => o.innerText.trim());
    const top = stack[stack.length - 1];
    const triggerId = top.trigger?.dataset?.p;
    // The overlay under the list (a form) comes back, the value chosen.
    stack.pop();
    paint();
    const trigger = triggerId ? document.querySelector(`[data-p="${CSS.escape(triggerId)}"]`) : top.trigger;
    if (trigger) {
      const walker = document.createTreeWalker(trigger, NodeFilter.SHOW_TEXT);
      for (let n = walker.nextNode(); n; n = walker.nextNode()) if (n.textContent.trim()) { n.textContent = value; break; }
    }
    if (trigger && app.contains(trigger)) filterBy(value, all);
  }

  // A filter of a list page: the column holding these values keeps the rows
  // of the one chosen; the first option (« Tous… ») shows them all.
  // Filters of the list shown, by column; they add up. Cleared on a new page.
  let filters = new Map();
  function filterBy(value, all) {
    const every = value === all[0] || /^tou(s|tes)\b/i.test(value);
    for (const table of app.querySelectorAll("table")) {
      const rows = [...table.querySelectorAll("tbody tr")];
      if (!rows.length) continue;
      const width = Math.max(...rows.map((r) => r.children.length));
      let col = -1;
      for (let i = 0; i < width && col < 0; i++)
        if (rows.some((r) => all.slice(1).includes((r.children[i]?.innerText || "").trim().split("\n")[0]))) col = i;
      if (col < 0) continue;
      if (every) filters.delete(col); else filters.set(col, value);
      const cellOf = (r, c) => (r.children[c]?.innerText || "").trim().split("\n")[0];
      for (const r of rows) {
        let keep = true;
        for (const [c, v] of filters) {
          // A value no cell says as such (« À refacturer »): the rows that
          // say its stem anywhere (« Refacturable »).
          const exact = rows.some((x) => cellOf(x, c) === v);
          const stem = fold(v).split(/\s+/).sort((a, b) => b.length - a.length)[0].slice(0, 7);
          if (exact ? cellOf(r, c) !== v : !fold(r.innerText).includes(stem)) keep = false;
        }
        r.style.display = keep ? "" : "none";
      }
    }
  }

  function toggleColumn(name, on) {
    for (const table of app.querySelectorAll("table")) {
      const heads = [...table.querySelectorAll("thead th")];
      const idx = heads.findIndex((h) => h.innerText.trim() === name);
      if (idx < 0) continue;
      for (const row of table.querySelectorAll("tr")) {
        const cell = row.children[idx];
        if (cell) cell.style.display = on ? "" : "none";
      }
    }
  }

  // ---- keys and search -----------------------------------------------------
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && stack.length) { e.preventDefault(); closeTop(); return; }
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      const trigger = [...app.querySelectorAll("[data-p]")].find((x) => D.actions[x.dataset.p]?.layer && /^Rechercher/.test((x.innerText || x.getAttribute("aria-label") || "").trim()));
      trigger?.click();
    }
  });
  const fold = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  document.addEventListener("input", (e) => {
    const i = e.target;
    if (!(i instanceof HTMLInputElement) || !/search|text/.test(i.type)) return;
    if (!/^Rechercher/i.test(i.placeholder || i.getAttribute("aria-label") || "")) return;
    const q = fold(i.value.trim());
    const scope = layerBox.contains(i) ? layerBox : app;
    const rows = scope.querySelectorAll("tbody tr, [role=option], [role=listbox] li");
    rows.forEach((r) => { r.style.display = !q || fold(r.innerText).includes(q) ? "" : "none"; });
  });

  go(location.hash.slice(1) || HOME, { push: false });
})();
