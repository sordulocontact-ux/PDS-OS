#!/usr/bin/env node
// Extracts the design tokens of app/globals.css into design-system/tokens.json
// (W3C Design Tokens format). No dependency.
//   node scripts/design-tokens.mjs           write the file
//   node scripts/design-tokens.mjs --check   exit 1 if the file is stale
// Source of truth stays globals.css; never edit tokens.json by hand.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CSS = resolve(root, "app/globals.css");
const OUT = resolve(root, "design-system/tokens.json");
const check = process.argv.includes("--check");

// ---------------------------------------------------------------- parsing

/** Top-level blocks `selector { body }` (comments kept inside the body). */
function topLevelBlocks(css) {
  const blocks = [];
  let depth = 0;
  let start = 0;
  let selStart = 0;
  for (let i = 0; i < css.length; i++) {
    if (css.startsWith("/*", i)) {
      i = css.indexOf("*/", i) + 1;
      continue;
    }
    const c = css[i];
    if (c === "{") {
      if (depth === 0) {
        start = i + 1;
        blocks.push({
          selector: css
            .slice(selStart, i)
            .replace(/\/\*[\s\S]*?\*\//g, "")
            .trim(),
        });
      }
      depth++;
    } else if (c === "}") {
      depth--;
      if (depth === 0) {
        blocks[blocks.length - 1].body = css.slice(start, i);
        selStart = i + 1;
      }
    } else if (c === ";" && depth === 0) {
      selStart = i + 1;
    }
  }
  return blocks;
}

/** Declarations of a block body, with the comment that precedes each one. */
function declarations(body) {
  const out = [];
  const re = /\/\*([\s\S]*?)\*\/|(--[\w-]+)\s*:\s*([^;]+);/g;
  let comment = null;
  let m;
  while ((m = re.exec(body))) {
    if (m[1] !== undefined) {
      const text = m[1].replace(/\s+/g, " ").trim();
      // "--- Section ---" banners are headings, not descriptions.
      comment = text.startsWith("---") ? null : text;
    } else {
      out.push({
        name: m[2],
        value: m[3].replace(/\s+/g, " ").trim(),
        comment,
      });
      comment = null;
    }
  }
  return out;
}

// ---------------------------------------------------------------- naming

const strip = (s, prefix) => s.slice(prefix.length);
const tail = (n) => n.split("-");

/** CSS custom property -> DTCG path, or null when not a token. */
function pathOf(name) {
  const n = name.slice(2);
  let m;
  if (n === "error") return ["color", "error"];
  if (n === "po-black" || n === "po-white") return ["color", "po", n.slice(3)];
  if ((m = n.match(/^po-([a-z]+)-(\d+)$/))) return ["color", "po", m[1], m[2]];
  if (n.startsWith("text-") && !n.startsWith("text-display"))
    return ["color", "text", strip(n, "text-")];
  if (n === "surface-glass") return ["color", "glass", "surface"];
  if (n.startsWith("surface-"))
    return ["color", "surface", strip(n, "surface-")];
  if (n === "hairline" || n === "hairline-strong")
    return ["border", "line", n === "hairline" ? "hairline" : "strong"];
  if (n.startsWith("border-")) return ["color", "border", strip(n, "border-")];
  if (n === "scrollbar-size") return ["layout", "scrollbar-size"];
  if (n.startsWith("scrollbar-"))
    return ["color", "scrollbar", strip(n, "scrollbar-")];
  if (n === "nav-shadow") return ["elevation", "nav"];
  if (n === "nav-width" || n === "nav-width-collapsed") return ["layout", n];
  if (n.startsWith("nav-")) return ["color", "nav", strip(n, "nav-")];
  if ((m = n.match(/^(tone|hue)-([a-z]+)-(bg|fg)$/)))
    return ["color", m[1], m[2], m[3]];
  if (n === "selection") return ["color", "selection", "default"];
  if (n.startsWith("selection-"))
    return ["color", "selection", strip(n, "selection-")];
  if (n.startsWith("meter-") && !n.endsWith("-h"))
    return ["color", "meter", strip(n, "meter-")];
  if (n === "focus-ring") return ["color", "control", "focus-ring"];
  if (n.startsWith("control-"))
    return ["color", "control", strip(n, "control-")];
  if (n === "overlay-scrim") return ["color", "glass", "overlay-scrim"];
  if (n === "glass-scrim") return ["color", "glass", "scrim"];
  if (n === "glass-blur" || n === "glass-panel-blur") return ["layout", n];
  if (n === "toast-shadow") return ["elevation", "toast"];
  if (n === "toast-ease") return ["motion", "ease", "toast"];
  if (/^toast-(width|gap|peek)$/.test(n)) return ["layout", n];
  if (n.startsWith("toast-")) return ["color", "toast", strip(n, "toast-")];
  if (
    /^(dialog-width|content-width|page-gutter|page-max|project-nav-width|project-bar-height|shell-inset|calendar-)/.test(
      n,
    )
  )
    return ["layout", n];
  if (n.startsWith("fw-")) return ["font", "weight", strip(n, "fw-")];
  if (n.startsWith("type-")) {
    const r = strip(n, "type-");
    if (r.endsWith("-lh")) return ["type", r.slice(0, -3), "lineHeight"];
    if (r.endsWith("-tracking")) return ["type", r.slice(0, -9), "tracking"];
    return ["type", r, "size"];
  }
  if (n.startsWith("space-")) return ["space", strip(n, "space-")];
  if (n.startsWith("stack-") || n === "section-gap") return ["space", n];
  if (n === "radius") return ["radius", "base"];
  if (n.startsWith("radius-")) return ["radius", strip(n, "radius-")];
  if (n.startsWith("elevation-")) return ["elevation", strip(n, "elevation-")];
  if (n.startsWith("duration-"))
    return ["motion", "duration", strip(n, "duration-")];
  if (n.startsWith("delay-")) return ["motion", "delay", strip(n, "delay-")];
  if (n.startsWith("ease-")) return ["motion", "ease", strip(n, "ease-")];
  if (n === "transition-control") return ["motion", "transition", "control"];
  if (n.startsWith("density-")) return ["density", strip(n, "density-")];
  return null;
}

// ---------------------------------------------------------------- values

const hasVar = (v) => /var\(/.test(v);
const wholeVar = (v) => v.match(/^var\((--[\w-]+)\)$/);

function splitTop(s, sep = ",") {
  const parts = [];
  let depth = 0;
  let cur = "";
  for (const ch of s) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === sep && depth === 0) {
      parts.push(cur.trim());
      cur = "";
    } else cur += ch;
  }
  parts.push(cur.trim());
  return parts;
}

function parseShadow(v) {
  const layers = splitTop(v).map((layer) => {
    const color = layer.match(/(rgba?\([^)]*\)|#[0-9a-f]{3,8})/i)?.[1];
    const nums = layer
      .replace(color ?? "", "")
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (!color || nums.length < 3 || nums.length > 4) return null;
    const [offsetX, offsetY, blur, spread = "0"] = nums;
    const px = (x) => (/^-?0$/.test(x) ? "0px" : x);
    return {
      color,
      offsetX: px(offsetX),
      offsetY: px(offsetY),
      blur: px(blur),
      spread: px(spread),
    };
  });
  if (layers.some((l) => !l)) return null;
  return layers.length === 1 ? layers[0] : layers;
}

const isColor = (v) => /^(#[0-9a-f]{3,8}|rgba?\(|color-mix\()/i.test(v);

/** Literal value -> { $type, $value }. */
function typed(path, raw) {
  const group = path[0];
  if (group === "color") return { $type: "color", $value: raw };
  if (group === "elevation") {
    if (raw === "none") return { $type: "string", $value: raw };
    const s = parseShadow(raw);
    return s
      ? { $type: "shadow", $value: s }
      : { $type: "string", $value: raw };
  }
  if (path[1] === "weight") return { $type: "fontWeight", $value: Number(raw) };
  if (path[0] === "motion" && path[1] === "ease") {
    const m = raw.match(/^cubic-bezier\(([^)]*)\)$/);
    if (m) return { $type: "cubicBezier", $value: m[1].split(",").map(Number) };
  }
  if (/^\d+ms$/.test(raw)) return { $type: "duration", $value: raw };
  if (/^-?\d+(\.\d+)?(px|em)$/.test(raw))
    return { $type: "dimension", $value: raw };
  if (/^-?\d+(\.\d+)?$/.test(raw))
    return { $type: "number", $value: Number(raw) };
  return { $type: "string", $value: raw };
}

function shortDesc(c) {
  if (!c) return undefined;
  const first = c.split(/(?<=[.;:])\s/)[0];
  const t =
    first.length > 160 ? c.slice(0, 157).replace(/\s+\S*$/, "") + "..." : first;
  return t.replace(/[.;:]$/, "").trim();
}

// ---------------------------------------------------------------- build

const css = readFileSync(CSS, "utf8");
const blocks = topLevelBlocks(css);
const light = [];
const dark = [];
const compact = [];
const theme = [];
let bridgeNames = new Set();

for (const b of blocks) {
  const decls = declarations(b.body ?? "");
  if (b.selector === ":root") {
    if (decls.some((d) => d.name === "--background")) {
      // Bridge to shadcn: only --error is a real token.
      decls.forEach((d) => bridgeNames.add(d.name));
      light.push(...decls.filter((d) => d.name === "--error"));
    } else light.push(...decls);
  } else if (b.selector === ":root.dark") dark.push(...decls);
  else if (b.selector === '[data-density="compact"]') compact.push(...decls);
  else if (b.selector === "@theme")
    theme.push(...decls.filter((d) => /^--(radius|ease)-/.test(d.name)));
}

const byName = new Map(); // css name -> { path, raw, comment }
const warnings = [];
for (const d of [...light, ...theme]) {
  const path = pathOf(d.name);
  if (!path) {
    warnings.push(`unmapped token ${d.name}`);
    continue;
  }
  byName.set(d.name, { path, raw: d.value, comment: d.comment });
}
const pathByName = (n) => byName.get(n)?.path;

const root_ = {};
function put(path, token) {
  let o = root_;
  for (const k of path.slice(0, -1)) o = o[k] ??= {};
  const leaf = path[path.length - 1];
  if (o[leaf]) throw new Error(`duplicate token ${path.join(".")}`);
  o[leaf] = token;
}
const get = (path) => path.reduce((o, k) => o?.[k], root_);
const alias = (path) => `{${path.join(".")}}`;

/** CSS value in a mode -> alias or raw string. */
function modeValue(raw) {
  const m = wholeVar(raw);
  if (m) {
    const p = pathByName(m[1]);
    if (p) return alias(p);
  }
  return raw;
}

const modes = { dark: new Map(), compact: new Map() };
for (const d of dark) if (byName.has(d.name)) modes.dark.set(d.name, d.value);
for (const d of compact)
  if (byName.has(d.name)) modes.compact.set(d.name, d.value);
for (const d of dark)
  if (!byName.has(d.name) && !bridgeNames.has(d.name) && pathOf(d.name))
    warnings.push(`dark override without light token ${d.name}`);

// Resolve a token's type through alias chains.
function typeOfRaw(name, seen = new Set()) {
  const t = byName.get(name);
  const m = wholeVar(t.raw);
  if (m && byName.has(m[1]) && !seen.has(m[1]))
    return typeOfRaw(m[1], seen.add(name));
  return typed(t.path, t.raw).$type;
}

for (const [name, t] of byName) {
  const m = wholeVar(t.raw);
  const token = {};
  if (m && byName.has(m[1])) {
    token.$value = alias(pathByName(m[1]));
    token.$type = typeOfRaw(name);
  } else if (hasVar(t.raw) && !isColor(t.raw)) {
    // Composite with var() inside (e.g. "1px solid var(...)"): kept as CSS.
    token.$value = t.raw;
    token.$type = "string";
  } else {
    Object.assign(token, typed(t.path, t.raw));
  }
  const desc = shortDesc(t.comment);
  if (desc) token.$description = desc;
  const ext = { "pds.css": name };
  const ms = {};
  if (modes.dark.has(name)) ms.dark = modeValue(modes.dark.get(name));
  if (modes.compact.has(name)) ms.compact = modeValue(modes.compact.get(name));
  if (Object.keys(ms).length) ext["pds.modes"] = ms;
  token.$extensions = ext;
  put(t.path, token);
}

// Families are declared in app/layout.tsx (next/font), not as CSS literals.
put(["font", "family", "sans"], {
  $type: "fontFamily",
  $value: "Google Sans Flex",
  $description: "Display and text (next/font in app/layout.tsx)",
  $extensions: { "pds.css": "--font-sans" },
});
put(["font", "family", "mono"], {
  $type: "fontFamily",
  $value: "Geist Mono",
  $description: "Ids and figures (next/font in app/layout.tsx)",
  $extensions: { "pds.css": "--font-mono" },
});

// ---------------------------------------------------------------- validate

const isToken = (o) => o && typeof o === "object" && "$value" in o;
const counts = {};
function walk(o, path) {
  if (isToken(o)) {
    if (o.$value === undefined || o.$value === null)
      warnings.push(`no $value: ${path.join(".")}`);
    const refs = JSON.stringify(o.$value).match(/\{[\w.-]+\}/g) ?? [];
    const modeRefs = Object.values(o.$extensions?.["pds.modes"] ?? {}).flatMap(
      (v) => String(v).match(/^\{[\w.-]+\}$/g) ?? [],
    );
    for (const r of [...refs, ...modeRefs]) {
      const target = get(r.slice(1, -1).split("."));
      if (!isToken(target))
        warnings.push(`broken alias ${r} in ${path.join(".")}`);
    }
    const key = path.slice(0, path[0] === "color" ? 2 : 1).join(".");
    counts[key] = (counts[key] ?? 0) + 1;
    return;
  }
  for (const [k, v] of Object.entries(o)) walk(v, [...path, k]);
}
walk(root_, []);

const json =
  JSON.stringify(
    {
      $description:
        "PDS OS design tokens, generated from app/globals.css by scripts/design-tokens.mjs. Do not edit by hand.",
      ...root_,
    },
    null,
    2,
  ) + "\n";

const broken = warnings.filter((w) => /broken|no \$value|unmapped/.test(w));
for (const w of warnings) console.warn(`warning: ${w}`);

if (check) {
  const current = existsSync(OUT) ? readFileSync(OUT, "utf8") : "";
  if (current !== json || broken.length) {
    console.error("design-system/tokens.json is stale: run `pnpm ds:tokens`.");
    process.exit(1);
  }
  console.log("design-system/tokens.json is up to date.");
} else {
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, json);
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  console.log(`wrote ${OUT} (${total} tokens)`);
  for (const [k, v] of Object.entries(counts)) console.log(`  ${k}: ${v}`);
  if (broken.length) process.exit(1);
}
