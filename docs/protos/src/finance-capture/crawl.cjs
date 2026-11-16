// Crawls the real Finance section and records every state for the clickable
// prototype: each page (and its client-side variants: tabs, segments), each
// overlay a click opens (side sheets, forms, menus, selects, tooltips), and
// what each click does. Never clicks a gesture that writes (save, attach,
// delete…): the proto answers those with a toast.
//
//   TAG=a node crawl.cjs ",/tresorerie,/planning,/alertes"   (three in parallel:
//   TAG=b … "/depenses,/rapprochement,/justificatifs,/exports",
//   TAG=c … "/budgets,/encaissements,/financements"), then node build.cjs <out.html>
const { chromium } = require("playwright-core");
// The local app (`pnpm build && PORT=3100 pnpm start`), signed in as the seed's
// business manager (supabase/seed.sql).
const BASE = process.env.BASE || "http://localhost:3100";
async function open(viewport = { width: 1440, height: 1000 }) {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const ctx = await browser.newContext({ viewport });
  const page = await ctx.newPage();
  page.setDefaultTimeout(60000);
  await page.goto(BASE + "/login");
  await page.fill('input[name="email"]', process.env.EMAIL || "glen@pds.test");
  await page.fill('input[name="password"]', process.env.PASSWORD || "pds-local-business");
  await page.keyboard.press("Enter");
  await page.waitForURL((u) => !u.pathname.startsWith("/login"), { waitUntil: "commit", timeout: 300000 });
  return { browser, ctx, page };
}
const fs = require("fs");
const crypto = require("crypto");

const OUT = process.env.OUT || __dirname + "/data";
fs.mkdirSync(OUT, { recursive: true });

const TAG = process.env.TAG || "a";
const ROOTS = (process.argv[2] ? process.argv[2].split(",") : [
  "", "/tresorerie", "/planning", "/depenses", "/rapprochement", "/justificatifs",
  "/encaissements", "/budgets", "/financements", "/alertes", "/exports",
]).map((p) => "/app/finance" + p);

const MAX_DEPTH = 3;
const MAX_STATES = 160;
const WRITES = /^(enregistrer|rattacher(?! à…)|valider|supprimer|archiver|ignorer|marquer|défaire|retirer|envoyer|confirmer|importer le|importer \d|annuler l|annuler la|écarter|payer|encaisser|créer|restaurer|dupliquer|se déconnecter|déconnexion|générer|télécharger|copier|relancer|transmettre|signer|accepter|refuser|clôturer|rouvrir|appliquer|ajouter$|oui|lire le pdf|relire|recalculer|thème|mode sombre|mode clair|passer en|clair$|sombre$|système$|revoir la présentation|commencer|activer les notifications|réglages des notifications|remettre|rejeter|joindre|déposer|attacher|lier|délier|terminer|clore|fermer le|solder|régler$|ce n'est pas)/i;
// A label read twice (visible text + the same for screen readers) is read once.
const once = (t) => { const w = t.split(" "); const h = w.length / 2; return w.length % 2 === 0 && w.slice(0, h).join(" ") === w.slice(h).join(" ") ? w.slice(0, h).join(" ") : t; };

const FILE = OUT + `/crawl-${process.env.TAG || "a"}.json`;
const data = fs.existsSync(FILE) ? JSON.parse(fs.readFileSync(FILE, "utf8")) : { states: {}, layers: {}, actions: {}, tips: {}, sigs: {}, assets: {} };
for (const k of Object.keys(data.sigs)) data.sigs[k] = new Set(data.sigs[k]);
const layerByHash = new Map();
let layerSeq = Object.keys(data.layers).length + 1000;
for (const [id, l] of Object.entries(data.layers)) layerByHash.set(crypto.createHash("sha1").update(l.html.replace(/ data-p="[^"]*"/g, "").replace(/\s+/g, " ")).digest("hex").slice(0, 12), id);
const queue = [];
const seenUrl = new Set();

const norm = (html) => html.replace(/ data-p="[^"]*"/g, "").replace(/\s+/g, " ");
const hash = (s) => crypto.createHash("sha1").update(s).digest("hex").slice(0, 12);
const rel = (u) => { const x = new URL(u, BASE); return x.pathname + x.search + x.hash; };
const urlKey = (u) => {
  const x = new URL(u, BASE);
  const params = [...x.searchParams.entries()].sort();
  const s = new URLSearchParams(params).toString();
  return x.pathname + (s ? "?" + s : "");
};

// ---- in-page helpers ------------------------------------------------------
const PAGE = {
  // Ids on every element still without one, in DOM order: deterministic.
  assign: (prefix) => {
    let n = 0;
    const scope = document.body.querySelectorAll("*:not(script):not(style)");
    for (const el of scope) if (!el.dataset.p) el.dataset.p = `${prefix}${n++}`;
    return n;
  },
  baseKids: () => {
    for (const k of document.body.children) k.dataset.base = "1";
  },
  portals: () => [...document.body.children].filter((k) =>
    !k.dataset.base && !["SCRIPT", "STYLE", "TEMPLATE", "NEXT-ROUTE-ANNOUNCER", "IFRAME"].includes(k.tagName)),
  appHtml: () => {
    const c = document.body.cloneNode(true);
    for (const k of [...c.children])
      if (!k.dataset.base || ["SCRIPT", "STYLE", "TEMPLATE", "NEXT-ROUTE-ANNOUNCER", "IFRAME"].includes(k.tagName)) k.remove();
    for (const k of c.querySelectorAll("[data-base]")) k.removeAttribute("data-base");
    return c.innerHTML;
  },
};

async function inPage(page, fn, ...args) {
  return page.evaluate(fn, ...args);
}

async function settle(page, net) {
  const t0 = Date.now();
  // Network quiet (fetches of server actions / RSC) and DOM quiet.
  while (Date.now() - t0 < 3500) {
    await page.evaluate(() => new Promise((res) => {
      let t; const obs = new MutationObserver(() => { clearTimeout(t); t = setTimeout(done, 220); });
      function done() { obs.disconnect(); res(); }
      obs.observe(document.body, { subtree: true, childList: true, attributes: true, characterData: true });
      t = setTimeout(done, 260); setTimeout(done, 2500);
    })).catch(() => {});
    if (net.inflight <= 0) break;
    await page.waitForTimeout(120);
  }
}

async function portalsHtml(page) {
  return page.evaluate(`(${PAGE.portals.toString()})().map(k => k.outerHTML).join("")`);
}
async function appHash(page) {
  return hash(norm(await page.evaluate(`(${PAGE.appHtml.toString()})()`)));
}

// Candidates: what a person can click, visible, not a field.
async function candidates(page, inPortals) {
  return page.evaluate(([inPortals]) => {
    const scope = inPortals
      ? [...document.body.children].filter((k) => !k.dataset.base && k.tagName !== "SCRIPT")
      : [...document.body.children].filter((k) => k.dataset.base && k.tagName !== "SCRIPT");
    const out = [];
    const sel = "a[href],button,[role=button],[role=tab],[role=menuitem],[role=menuitemradio],[role=option],[role=switch],[role=combobox],summary,tr";
    for (const root of scope)
      for (const el of root.querySelectorAll("*")) {
        if (!el.dataset.p) continue;
        const cs = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        if (!r.width || !r.height || cs.visibility === "hidden") continue;
        const own = el.matches(sel);
        const pointer = cs.cursor === "pointer" && el.parentElement && getComputedStyle(el.parentElement).cursor !== "pointer";
        if (!own && !pointer) continue;
        if (el.matches("tr") && cs.cursor !== "pointer") continue;
        if (el.matches("label,input,textarea,select,[role=checkbox],[role=menuitemcheckbox]")) continue;
        if (el.closest("[disabled],[aria-disabled=true],[data-disabled]")) continue;
        const text = (el.innerText || "").trim().replace(/\s+/g, " ");
        const label = (el.getAttribute("aria-label") || el.title || "").trim();
        out.push({
          id: el.dataset.p,
          tag: el.tagName,
          href: el.tagName === "A" ? el.getAttribute("href") : null,
          text: text.slice(0, 160),
          label,
          submit: el.matches("button[type=submit],input[type=submit]") || (el.tagName === "BUTTON" && !el.getAttribute("type") && !!el.closest("form")),
          inForm: !!el.closest("form"),
          alert: !!el.closest("[role=alertdialog]"),
          iconOnly: !text && !!label,
          haspopup: el.getAttribute("aria-haspopup"),
        });
      }
    return out;
  }, [inPortals]);
}

async function escapeAll(page, net) {
  for (let i = 0; i < 4; i++) {
    const n = await page.evaluate(`(${PAGE.portals.toString()})().filter(k => k.innerHTML.trim()).length`);
    if (!n) return true;
    await page.keyboard.press("Escape");
    await settle(page, net);
  }
  return false;
}

// ---- crawl -----------------------------------------------------------------
async function main() {
  const { browser, ctx, page } = await open();
  const net = { inflight: 0 };
  // Only what changes the screen: server actions (POST) and RSC payloads.
  const counts = (r) => r.url().startsWith(BASE) && ["fetch", "xhr"].includes(r.resourceType()) && (r.method() === "POST" || r.url().includes("_rsc=")) && !(r.headers()["next-router-prefetch"]);
  page.on("request", (r) => { if (counts(r)) net.inflight++; });
  const done = (r) => { if (counts(r)) net.inflight = Math.max(0, net.inflight - 1); };
  page.on("requestfinished", done); page.on("requestfailed", done);
  let chooser = false;
  page.on("filechooser", () => { chooser = true; });
  page.on("dialog", (d) => d.dismiss().catch(() => {}));

  const t0 = Date.now();
  let pos = null; // { state, chain }

  async function load(state) {
    await page.goto(BASE + state.url, { waitUntil: "networkidle", timeout: 120000 }).catch((e) => console.log("goto", e.message));
    await settle(page, net);
    // The pre-production bar is not the product: hidden, never clicked.
    await page.evaluate(() => { const b = document.querySelector('[aria-label="Commandes de la pré-prod"]'); if (b) { b.style.display = "none"; b.dataset.protoDrop = "1"; } });
    await inPage(page, PAGE.baseKids);
    await inPage(page, PAGE.assign, (state.base || state.key) + ".");
    for (const [i, id] of (state.clicks || []).entries()) {
      await page.click(`[data-p="${id}"]`, { timeout: 5000 }).catch(() => {});
      await settle(page, net);
      await inPage(page, PAGE.assign, `${state.key}.v${i}.`);
    }
  }

  // Bring the page to `state` with the overlay chain opened.
  async function ensure(state, chain) {
    const same = pos && pos.state === state && pos.chain.join() === chain.join() && !pos.dirty;
    if (same) return true;
    let fresh = false;
    if (pos && pos.state === state) {
      const ok = await escapeAll(page, net);
      if (!ok || (await appHash(page)) !== state.hash || urlKey(page.url()) !== urlKey(BASE + state.url)) fresh = true;
    } else fresh = true;
    if (fresh) { if (process.env.DEBUG) console.log("    (reload)"); await load(state); }
    for (const [i, id] of chain.entries()) {
      await page.click(`[data-p="${id}"]`, { timeout: 5000 }).catch(() => {});
      await settle(page, net);
      await inPage(page, PAGE.assign, chainPrefix(state, chain.slice(0, i + 1)));
    }
    pos = { state, chain: [...chain], dirty: false };
    return true;
  }
  const chainPrefix = (state, chain) => `${state.key}.${hash(chain.join(">")).slice(0, 6)}.`;

  function addLayer(html, rect, url) {
    const h = hash(norm(html));
    if (layerByHash.has(h)) return { id: layerByHash.get(h), fresh: false };
    const id = "L" + TAG + layerSeq++;
    layerByHash.set(h, id);
    data.layers[id] = { html, rect, url };
    return { id, fresh: true };
  }

  async function crawl(state, chain, depth) {
    await ensure(state, chain);
    const list = await candidates(page, chain.length > 0);
    for (const c of list) {
      if (Date.now() - t0 > 100 * 60 * 1000) return;
      const sig = `${c.tag}|${c.text || c.label}`;
      if (c.href) {
        const u = new URL(c.href, BASE + state.url);
        if (u.origin === new URL(BASE).origin && u.pathname.startsWith("/app/finance")) enqueue(rel(u.href), state);
        continue; // anchors are routed by href at runtime
      }
      c.text = once(c.text);
      if (c.submit || c.alert || WRITES.test(c.text) || WRITES.test(c.label)) {
        data.actions[c.id] = { write: c.text || c.label, inForm: c.inForm, alert: c.alert };
        continue;
      }
      if (data.actions[c.id]) continue;
      // A date picker's days and arrows: typing the date is enough.
      if (chain.length && (/^\d{1,2}$/.test(c.text) || /mois (précédent|suivant)|previous|next month/i.test(c.label))) continue;
      await ensure(state, chain);
      const exists = await page.$(`[data-p="${c.id}"]`);
      if (!exists) continue;
      // Tooltip of an icon-only control.
      if (c.iconOnly && !data.tips[c.id]) {
        await page.hover(`[data-p="${c.id}"]`, { timeout: 3000 }).catch(() => {});
        await page.waitForTimeout(450);
        const tip = await page.evaluate(() => { const t = document.querySelector("[role=tooltip]"); return t ? (t.closest("body > *") || t).outerHTML : null; });
        if (tip) {
          const rect = await page.evaluate((id) => { const r = document.querySelector(`[data-p="${id}"]`).getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; }, c.id);
          data.tips[c.id] = { html: tip, rect };
        }
        await page.mouse.move(1, 1);
        await page.waitForTimeout(200);
      }
      const before = { url: urlKey(page.url()), portals: norm(await portalsHtml(page)), app: await appHash(page) };
      const rect = await page.evaluate((id) => { const e = document.querySelector(`[data-p="${id}"]`); if (!e) return null; e.scrollIntoView({ block: "center" }); const r = e.getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; }, c.id);
      chooser = false;
      try { await page.click(`[data-p="${c.id}"]`, { timeout: 4000 }); } catch { pos.dirty = true; continue; }
      await settle(page, net);
      pos.dirty = true;
      if (chooser) { data.actions[c.id] = { file: true }; continue; }
      const afterUrl = urlKey(page.url());
      const ph = await portalsHtml(page);
      const portalsChanged = norm(ph) !== before.portals && ph.trim().length > 0;
      if (portalsChanged) {
        const prefix = chainPrefix(state, [...chain, c.id]);
        await inPage(page, PAGE.assign, prefix);
        const html = await portalsHtml(page);
        const { id, fresh } = addLayer(html, rect, afterUrl);
        data.actions[c.id] = { layer: id };
        (data.sigs[sig] ||= new Set()).add(JSON.stringify(data.actions[c.id]));
        console.log(`  ${"  ".repeat(depth)}[${c.text || c.label}] → layer ${id}${fresh ? "" : " (known)"}`);
        if (fresh && depth < MAX_DEPTH) {
          pos = { state, chain: [...chain, c.id], dirty: false };
          await crawl(state, [...chain, c.id], depth + 1);
        }
        continue;
      }
      if (afterUrl !== before.url) {
        const target = rel(page.url());
        data.actions[c.id] = { nav: target };
        (data.sigs[sig] ||= new Set()).add(JSON.stringify(data.actions[c.id]));
        if (new URL(page.url()).pathname.startsWith("/app/finance")) enqueue(target, state);
        console.log(`  ${"  ".repeat(depth)}[${c.text || c.label}] → nav ${target}`);
        continue;
      }
      if (!chain.length && (await appHash(page)) !== before.app && !state.clicks?.length) {
        // A client-side variant of the page (tab, segment, month…).
        const key = `${state.key}~${Object.keys(data.states).length}`;
        const v = { key, base: state.key, url: state.url, clicks: [c.id], primary: true };
        data.actions[c.id] = { state: key };
        console.log(`  [${c.text || c.label}] → variant ${key}`);
        queue.unshift(v);
        continue;
      }
      data.actions[c.id] = { noop: true };
      if (process.env.DEBUG) console.log(`  noop [${c.text || c.label}]`);
    }
  }

  function enqueue(url, from) {
    if (process.env.ONLY) return;
    const key = urlKey(url);
    if (seenUrl.has(key)) return;
    seenUrl.add(key);
    const path = new URL(url, BASE).pathname;
    // A path is crawled in full by the crawler that owns it (its roots and
    // what is under them); the others only keep its page.
    const ALL = ["/tresorerie", "/planning", "/alertes", "/depenses", "/rapprochement", "/justificatifs", "/exports", "/budgets", "/encaissements", "/financements"].map((p) => "/app/finance" + p);
    const mine = ROOTS.some((r) => path === r || (r !== "/app/finance" && path.startsWith(r + "/")));
    const other = path === "/app/finance" || ALL.some((r) => path === r || path.startsWith(r + "/"));
    const owned = mine || !other;
    const primary = owned && !Object.values(data.states).some((s) => new URL(s.url, BASE).pathname === path) && !queue.some((q) => new URL(q.url, BASE).pathname === path);
    queue.push({ key: "S" + hash(key).slice(0, 6), url: rel(url), primary });
  }

  for (const r of ROOTS) { seenUrl.add(urlKey(r)); queue.push({ key: "S" + hash(urlKey(r)).slice(0, 6), url: r, primary: true }); }
  // Resumed: the links of the pages and overlays already kept are queued again.
  for (const st of Object.values(data.states)) seenUrl.add(urlKey(st.url));
  for (const html of [...Object.values(data.states).map((x) => x.html), ...Object.values(data.layers).map((x) => x.html)])
    for (const m of html.matchAll(/href="(\/app\/finance[^"]*)"/g)) enqueue(m[1].replace(/&amp;/g, "&"));

  while (queue.length && Object.keys(data.states).length < MAX_STATES) {
    const state = queue.shift();
    if (data.states[state.key]) continue;
    console.log(`STATE ${state.key} ${state.url}${state.clicks ? " +" + state.clicks : ""} ${state.primary ? "(primary)" : ""}`);
    await load(state);
    pos = { state, chain: [], dirty: false };
    state.hash = await appHash(page);
    const html = await page.evaluate(`(${PAGE.appHtml.toString()})()`);
    const open = await portalsHtml(page);
    const layer = open.trim() ? addLayer(open, null, urlKey(page.url())).id : null;
    data.states[state.key] = {
      url: state.url, base: state.base || null, clicks: state.clicks || null, primary: state.primary, html, layer,
      title: await page.title(),
      urlKey: urlKey(page.url()),
    };
    // Mirror the live object for ensure().
    Object.assign(state, { hash: state.hash });
    if (state.primary) await crawl(state, [], 1);
    fs.writeFileSync(OUT + `/crawl-${TAG}.json`, JSON.stringify(data, (k, v) => (v instanceof Set ? [...v] : v)));
  }

  // Page shell attributes and stylesheets.
  data.html = await page.evaluate(() => ({
    htmlClass: document.documentElement.className.replace(/\bdark\b/, "light"),
    bodyClass: document.body.className,
    css: [...document.querySelectorAll("link[rel=stylesheet]")].map((l) => l.href),
  }));
  // Assets referenced by captured html (images, previews).
  const all = JSON.stringify(data);
  const urls = new Set([...all.matchAll(/(?:src|data|href)=\\"((?:https?:\/\/|\/_next\/image|\/api\/)[^"\\]+)\\"/g)].map((m) => m[1].replace(/&amp;/g, "&")));
  for (const u of urls) {
    if (u.startsWith(BASE + "/app") || /\.(css|js)(\?|$)/.test(u)) continue;
    try {
      const r = await ctx.request.get(new URL(u, BASE).href);
      if (r.ok()) {
        const b = await r.body();
        if (b.length < 3e6) data.assets[u] = `data:${r.headers()["content-type"] || "application/octet-stream"};base64,${b.toString("base64")}`;
      }
    } catch {}
  }
  fs.writeFileSync(OUT + `/crawl-${TAG}.json`, JSON.stringify(data, (k, v) => (v instanceof Set ? [...v] : v)));
  console.log("done", Object.keys(data.states).length, "states", Object.keys(data.layers).length, "layers", Math.round((Date.now() - t0) / 1000), "s");
  await browser.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
