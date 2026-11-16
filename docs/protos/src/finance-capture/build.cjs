// Packs the crawl (data/crawl.json) into one self-contained HTML file: the
// app's own stylesheets and fonts inlined, every state gzipped, the runtime.
//   node build.cjs <out.html>
const fs = require("fs");
const zlib = require("zlib");
const BASE = process.env.BASE || "http://localhost:3100";
const DATA = process.env.OUT || __dirname + "/data";
const out = process.argv[2] || __dirname + "/finance-proto.html";
// Every crawl file (one per parallel crawler), merged.
const data = { states: {}, layers: {}, actions: {}, tips: {}, sigs: {}, assets: {} };
for (const f of fs.readdirSync(DATA).filter((f) => /^crawl-.*\.json$/.test(f))) {
  const d = JSON.parse(fs.readFileSync(DATA + "/" + f, "utf8"));
  for (const k of ["layers", "actions", "tips", "assets"]) Object.assign(data[k], d[k]);
  // The same page kept by two crawlers: the one that crawled it in full wins.
  for (const [k, st] of Object.entries(d.states)) if (!data.states[k] || st.primary) data.states[k] = st;
  for (const [sig, list] of Object.entries(d.sigs)) data.sigs[sig] = [...new Set([...(data.sigs[sig] || []), ...list])];
  if (d.html) data.html = d.html;
}

(async () => {
  // Partial crawl: the shell read from the login page (same stylesheets).
  if (!data.html) {
    const page = await (await fetch(BASE + "/login")).text();
    data.html = {
      htmlClass: (page.match(/<html[^>]*class="([^"]*)"/) || [])[1]?.replace(/\bdark\b/, "light") || "",
      bodyClass: (page.match(/<body[^>]*class="([^"]*)"/) || [])[1] || "",
      css: [...page.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map((m) => new URL(m[1], BASE).href),
    };
  }
  // Styles: the app's CSS, fonts and url() assets as data URIs.
  let css = "";
  for (const href of data.html.css) {
    let text = await (await fetch(href)).text();
    const urls = [...new Set([...text.matchAll(/url\((["']?)([^)"']+)\1\)/g)].map((m) => m[2]))].filter((u) => !u.startsWith("data:"));
    for (const u of urls) {
      const abs = new URL(u, href).href;
      const r = await fetch(abs);
      if (!r.ok) continue;
      const buf = Buffer.from(await r.arrayBuffer());
      const type = r.headers.get("content-type") || (u.endsWith(".woff2") ? "font/woff2" : "application/octet-stream");
      text = text.split(u).join(`data:${type};base64,${buf.toString("base64")}`);
    }
    css += text + "\n";
  }

  // Ids kept only where something happens.
  const keep = new Set([...Object.keys(data.actions).filter((k) => !data.actions[k].noop), ...Object.keys(data.tips)]);
  const clean = (html) =>
    html
      .replace(/ data-p="([^"]*)"/g, (m, id) => (keep.has(id) ? m : ""))
      .replace(/ data-base="1"/g, "")
      .replace(/<script\b[\s\S]*?<\/script>/g, "")
      .replace(/<next-route-announcer[\s\S]*?<\/next-route-announcer>/g, "")
      .replace(/(src|href|data)="(https?:\/\/[^"]+|\/_next\/image[^"]+|\/api\/[^"]+)"/g, (m, a, u) => {
        const v = data.assets[u.replace(/&amp;/g, "&")];
        return v ? `${a}="${v}"` : m;
      });

  const states = {};
  const routes = {};
  for (const [k, s] of Object.entries(data.states)) {
    states[k] = { html: clean(s.html), layer: s.layer, title: s.title };
    if (!s.clicks) {
      for (const u of [s.url, s.urlKey]) {
        const x = new URL(u, BASE);
        const params = [...x.searchParams.entries()].filter(([p]) => p !== "ouvrir").sort();
        const q = new URLSearchParams(params).toString();
        const full = (x.pathname + x.search).replace(/\/$/, "");
        if (!routes[full]) routes[full] = k;
        const key = x.pathname + (q ? "?" + q : "");
        if (!routes[key] || !x.searchParams.has("ouvrir")) routes[key] = routes[key] || k;
      }
    }
  }
  // A bare path falls back on its state without parameters.
  for (const [k, s] of Object.entries(data.states)) {
    const p = new URL(s.url, BASE).pathname;
    if (!s.clicks && !new URL(s.url, BASE).search && !routes[p]) routes[p] = k;
  }
  const layers = {};
  for (const [k, l] of Object.entries(data.layers)) layers[k] = { html: clean(l.html) };
  const actions = {};
  for (const [k, a] of Object.entries(data.actions)) if (!a.noop) actions[k] = a;
  const tips = {};
  for (const [k, t] of Object.entries(data.tips)) tips[k] = { html: clean(t.html) };
  const sigs = {};
  for (const [sig, set] of Object.entries(data.sigs)) if (set.length === 1) sigs[sig] = JSON.parse(set[0]);

  // A page reached by a filter or a link (same path, other parameters) was
  // kept without its clicks: it borrows those of the path's own page.
  const primaryOf = {};
  for (const [k, s] of Object.entries(data.states)) {
    if (s.primary || s.clicks) continue;
    const path = new URL(s.url, BASE).pathname;
    const base = Object.entries(data.states).find(([, x]) => x.primary && !x.clicks && new URL(x.url, BASE).pathname === path);
    if (base) primaryOf[k] = base[0];
  }
  const payload = zlib.gzipSync(JSON.stringify({ states, layers, actions, tips, sigs, routes, primaryOf }), { level: 9 }).toString("base64");
  const runtime = fs.readFileSync(__dirname + "/runtime.js", "utf8");
  const html = `<!doctype html>
<html lang="fr" class="${data.html.htmlClass}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Finance · PDS OS</title>
<style>${css}</style>
<style>
#proto-app,#proto-layer,#proto-tip{display:contents}
.entry-splash{display:none!important}
#proto-tip *{pointer-events:none}
</style>
</head>
<body class="${data.html.bodyClass}">
<div id="proto-app"></div>
<div id="proto-layer"></div>
<div id="proto-tip"></div>
<section class="toaster" aria-label="Notifications"><ol class="toaster-list" id="proto-toasts" aria-live="polite" style="--toaster-height:64px"></ol></section>
<script id="proto-data" type="application/octet-stream">${payload}</script>
<script>${runtime}</script>
</body>
</html>`;
  fs.writeFileSync(out, html);
  console.log(out, (html.length / 1e6).toFixed(1), "MB", Object.keys(states).length, "states", Object.keys(layers).length, "layers", Object.keys(actions).length, "actions");
})();
