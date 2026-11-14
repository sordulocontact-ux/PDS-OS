// The one renderer of a title's Plan de sortie (lot 14): the shared link
// (/t/[token]), the in-app view of a version and its PDF read the same HTML.
// The design of the plan Jeho (validated by Ibé on 11/11/2026, reference
// docs/pds-mic-plan-jeho.pdf): 16:9 pages of 1440 × 810, black, big condensed
// capitals, the PDS logo top right, one page per part — cover, release date
// and links, the intention, the campaign's phases, the moodboard of the
// contents (light grey), the timeline of the contents, an end page.
//
// Every length is a number of the reference's pixels times --u: 1px in the
// PDF, a 1440th of the page's width on a screen, so a page keeps its layout
// from a phone to a wide screen. Every value is escaped, URLs are https
// only, no script runs (the shared link's CSP forbids any). Client-safe.

import { titleReleasePlans } from "@/lib/i18n/fr/title-release-plans";
import {
  DISPLAY_FONT,
  TEXT_FONT,
  type DeckFont,
} from "@/lib/projects/title-plan/fonts";
import type { TitlePlanContent } from "@/lib/projects/title-plan/model";
import {
  PDS_LOGO_BLACK,
  PDS_LOGO_VIEWBOX,
  PDS_LOGO_WHITE,
} from "@/lib/projects/title-plan/pds-logo";
import { escapeHtml } from "@/lib/strategy/documents/editorial-html";
import type { DocImage } from "@/lib/strategy/documents/release-plan-model";

const fr = { titleReleasePlans };
const t = fr.titleReleasePlans.doc;

// The reference's colours.
const BLACK = "#000000";
const GREY = "#f1f1f1";
const RED = "#f9333f";

/** A length of the reference (in its pixels), scaled by the page. */
const u = (n: number) => `calc(${n} * var(--u))`;

const safeUrl = (url: string) =>
  /^https:\/\/[^\s"'<>]+$/i.test(url) ||
  /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?\/[^\s"'<>]*$/i.test(url)
    ? escapeHtml(url)
    : null;

const MONTHS = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];

/** « 28.11.2025 », as the reference writes the release date. */
const dottedDate = (iso: string) => {
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
};
/** « 23 Novembre », as the timeline writes its dates. */
const dayMonth = (iso: string) => {
  const [, m, d] = iso.split("-");
  return `${Number(d)} ${MONTHS[Number(m) - 1] ?? ""}`;
};

const chunks = <T>(list: T[], size: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
};

const paragraphs = (text: string) =>
  text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${escapeHtml(p).replaceAll("\n", "<br>")}</p>`)
    .join("");

// `alt`: the cover is named by the title; a page's shots and the
// timeline's thumbnails illustrate the text beside them (alt="").
function img(
  image: DocImage | null,
  className: string,
  style: string,
  alt = "",
) {
  const url = image ? safeUrl(image.url) : null;
  return url
    ? `<img class="${className}" style="${style}" src="${url}" alt="${escapeHtml(alt)}">`
    : "";
}

const box = (x: number, y: number, w: number, h: number) =>
  `left:${u(x)};top:${u(y)};width:${u(w)};height:${u(h)}`;

const rect = (r: readonly number[] | undefined) =>
  r ? box(r[0] ?? 0, r[1] ?? 0, r[2] ?? 0, r[3] ?? 0) : "";

const logo = `<svg class="logo" viewBox="${PDS_LOGO_VIEWBOX}" aria-hidden="true"><use href="#pds-logo"/></svg>`;

const page = (body: string, light = false) =>
  `<section class="page${light ? " light" : ""}">${logo}${body}</section>`;

/** An intercalary page: one condensed line in the middle. */
const divider = (text: string, light = false) =>
  page(`<h2 class="divider">${escapeHtml(text)}</h2>`, light);

// --- Pages -------------------------------------------------------------------------------

function cover(c: TitlePlanContent): string {
  const words = t.coverTitle(c.single).split(" ");
  const lines = [words.slice(0, 2).join(" "), words.slice(2).join(" ")]
    .filter(Boolean)
    .map(escapeHtml)
    .join("<br>");
  return page(`
  <h1 class="cover-title">${lines}</h1>
  <p class="cover-by">${escapeHtml(t.by(c.artist, c.title, c.guests))}</p>
  ${img(c.cover, "cover-image", box(889, 423, 330, 330), c.title)}`);
}

function releaseDate(c: TitlePlanContent): string {
  const listening = c.listeningUrl ? safeUrl(c.listeningUrl) : null;
  return page(`
  <div class="date-block">
    <h2 class="display date-title">${escapeHtml(t.releaseDate)}</h2>
    <p class="date-value">${escapeHtml(c.releaseDate ? dottedDate(c.releaseDate) : t.noDate)}</p>
  </div>
  <span class="date-rule"></span>
  <div class="date-links">
    ${c.platforms.length ? `<ul class="platforms">${c.platforms.map((p) => `<li>${escapeHtml(p)}</li>`).join("")}</ul>` : ""}
    ${
      listening
        ? `<div class="listening"><p class="caps">${escapeHtml(t.listening)}</p><a href="${listening}">${listening}</a></div>`
        : ""
    }
  </div>`);
}

// The staggered three slots of the reference's phases page.
const SLOTS = [
  { head: [275, 115], text: [191, 198, 440] },
  { head: [925, 250], text: [894, 336, 440] },
  { head: [487, 490], text: [409, 576, 430] },
] as const;

function slots(items: Array<{ heading: string; text: string }>): string {
  return page(
    items
      .map((item, i) => {
        const slot = SLOTS[i];
        return `<h3 class="display slot-head" style="left:${u(slot.head[0])};top:${u(slot.head[1])}">${escapeHtml(item.heading)}</h3>
  <div class="slot-text" style="left:${u(slot.text[0])};top:${u(slot.text[1])};width:${u(slot.text[2])}">${paragraphs(item.text)}</div>`;
      })
      .join("\n"),
  );
}

function intent(c: TitlePlanContent): string {
  const items = [
    { heading: t.intent.objective, text: c.objective },
    { heading: t.intent.audience, text: c.audience },
    { heading: t.intent.message, text: c.message },
  ].flatMap((e) => (e.text ? [{ heading: e.heading, text: e.text }] : []));
  return items.length ? slots(items) : "";
}

function phases(c: TitlePlanContent): string {
  if (c.phases.length === 0) return "";
  const numbered = c.phases.map((p, i) => ({
    heading: `${i + 1}.${p.name}`,
    text: p.text,
  }));
  return [
    divider(t.phases(c.phases.length)),
    ...chunks(numbered, 3).map(slots),
  ].join("\n");
}

// The three layouts of the reference's content pages.
const GRID = [
  [39, 101, 285, 392],
  [433, 101, 371, 392],
  [219, 530, 385, 254],
] as const;
const COLLAGE = [
  [50, 46, 462, 220],
  [50, 301, 462, 278],
  [627, 142, 389, 298],
  [1075, 235, 347, 233],
  [669, 517, 406, 267],
] as const;

function content(item: TitlePlanContent["contents"][number], index: number) {
  const images = item.images.slice(0, 5);
  const title = `<h3 class="display content-head">${escapeHtml(item.title)}</h3>`;
  const text = item.text ? paragraphs(item.text) : "";
  if (images.length >= 4)
    return page(
      `<div class="content collage">
  ${title.replace('class="display content-head"', 'class="display content-head collage-head"')}
  ${images.map((im, i) => img(im, "shot", rect(COLLAGE[i]))).join("")}
  <div class="content-text collage-text">${text}</div>
</div>`,
      true,
    );
  if (images.length > 0 && index % 2 === 1) {
    const one = images.length === 1;
    return page(
      `<div class="content grid">
  ${images.map((im, i) => img(im, "shot", one ? box(39, 101, 560, 683) : rect(GRID[i]))).join("")}
  <div class="grid-side">${title}<div class="content-text">${text}</div></div>
</div>`,
      true,
    );
  }
  const n = images.length;
  const width = n ? (672 - 32 * (n - 1)) / n : 0;
  return page(
    `<div class="content row">
  <div class="row-side${n ? "" : " wide"}">${title}<div class="content-text">${text}</div></div>
  ${images.map((im, i) => img(im, "shot", box(760 + i * (width + 32), 205, width, 400))).join("")}
</div>`,
    true,
  );
}

function moodboard(c: TitlePlanContent): string {
  if (c.contents.length === 0) return "";
  return [divider(t.moodboard, true), ...c.contents.map(content)].join("\n");
}

// Five entries a page, on the axis of the reference.
const AXIS_Y = 403;
const markerX = (i: number) => 218 + i * 230;

function timelinePage(entries: TitlePlanContent["timeline"]): string {
  const items = entries
    .map((e, i) => {
      const x = markerX(i);
      const below = i % 2 === 0;
      const text = `<p class="tl-date">${escapeHtml(dayMonth(e.date))}</p><p>${escapeHtml(e.label)}</p>${
        e.account ? `<p>${escapeHtml(e.account)}</p>` : ""
      }`;
      const textBox = below
        ? `<div class="tl-text" style="left:${u(x - 57)};top:${u(AXIS_Y + 27)}">${text}</div>`
        : `<div class="tl-text above" style="left:${u(x - 57)};bottom:${u(810 - AXIS_Y + 45)}">${text}</div>`;
      const image = e.image
        ? img(
            e.image,
            "tl-image",
            below
              ? box(x - 47, AXIS_Y - 33 - 190, 120, 190)
              : box(x - 47, AXIS_Y + 29, 120, 190),
          )
        : "";
      const marker = e.releaseDay
        ? `<span class="tl-dot" style="left:${u(x - 15)};top:${u(AXIS_Y - 15)}"></span>`
        : `<span class="tl-mark" style="left:${u(x - 7)};top:${u(AXIS_Y - 7)}"></span>`;
      return `${image}${textBox}${marker}`;
    })
    .join("\n");
  const legend = entries.some((e) => e.releaseDay)
    ? `<p class="tl-legend"><span class="tl-dot legend-dot"></span>${escapeHtml(t.releaseDay)}</p>`
    : "";
  return page(`
  <h2 class="tl-header">${escapeHtml(t.timeline)}</h2>
  <span class="tl-axis"></span><span class="tl-arrow"></span>
  ${items}
  ${legend}`);
}

function timeline(c: TitlePlanContent): string {
  if (c.timeline.length === 0) return "";
  return [divider(t.timeline), ...chunks(c.timeline, 5).map(timelinePage)].join(
    "\n",
  );
}

const end = () =>
  `<section class="page end"><svg class="logo end-logo" viewBox="${PDS_LOGO_VIEWBOX}" aria-hidden="true"><use href="#pds-logo"/></svg></section>`;

// --- Document ----------------------------------------------------------------------------

const face = (f: DeckFont) =>
  `font-family: "${f.family}", system-ui, sans-serif; font-weight: ${f.weight}; font-stretch: ${f.stretch};`;

/** A whole version of a title's plan, `title` naming it in the browser. */
export function titlePlanHtml(content: TitlePlanContent): string {
  const pages = [
    cover(content),
    releaseDate(content),
    intent(content),
    phases(content),
    moodboard(content),
    timeline(content),
    end(),
  ].filter(Boolean);
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${escapeHtml(t.documentTitle(content.title))}</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=${DISPLAY_FONT.google}&family=${TEXT_FONT.google}&display=block">
<style>
  @page { size: 1440px 810px; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { background: #1b1b1b; ${face(TEXT_FONT)} }
  .deck { container-type: inline-size; width: 100%; max-width: 1440px; margin: 0 auto;
    padding: 16px; display: flex; flex-direction: column; gap: 16px; }
  .page { --u: calc(100cqw / 1440); position: relative; width: 100%; aspect-ratio: 16 / 9;
    overflow: hidden; background: ${BLACK}; color: #fff; }
  .page.light { background: ${GREY}; color: ${BLACK}; }
  .page > * { position: absolute; }
  .logo { left: ${u(1268)}; top: ${u(48)}; width: ${u(126)}; height: ${u(65)}; }
  .end-logo { left: ${u(654)}; top: ${u(371)}; width: ${u(133)}; height: ${u(69)}; }
  .display { ${face(DISPLAY_FONT)} text-transform: uppercase; line-height: 0.92;
    letter-spacing: 0; }
  .divider { ${face(DISPLAY_FONT)} text-transform: uppercase; inset: 0; display: flex;
    align-items: center; justify-content: center; text-align: center; padding: 0 ${u(80)};
    font-size: ${u(145)}; line-height: 0.92; }
  .caps { text-transform: uppercase; letter-spacing: 0.04em; }

  .cover-title { left: ${u(84)}; top: ${u(194)}; font-size: ${u(101)}; line-height: 0.83;
    text-transform: uppercase; letter-spacing: -0.03em; font-weight: 400; }
  .cover-by { right: ${u(234)}; top: ${u(374)}; max-width: ${u(760)}; text-align: right;
    font-size: ${u(24)}; line-height: 1.25; letter-spacing: -0.02em; }
  .cover-image, .shot, .tl-image { object-fit: cover; display: block; }

  .date-block { left: ${u(146)}; top: ${u(334)}; }
  .date-title { font-size: ${u(69)}; }
  .date-value { font-size: ${u(32)}; line-height: 1; margin-top: ${u(6)}; letter-spacing: 0.02em; }
  .date-rule { left: ${u(440)}; top: ${u(402)}; width: ${u(109)}; height: ${u(1.5)}; background: currentColor; }
  .date-links { left: ${u(668)}; top: ${u(150)}; bottom: ${u(120)}; width: ${u(560)};
    display: flex; flex-direction: column; justify-content: center; gap: ${u(56)}; }
  .platforms { list-style: none; display: flex; flex-direction: column; gap: ${u(22)};
    font-size: ${u(21)}; line-height: 1.25; text-transform: uppercase; letter-spacing: 0.04em; }
  .listening { display: flex; flex-direction: column; gap: ${u(10)}; font-size: ${u(21)}; line-height: 1.3; }
  .listening a { color: inherit; font-size: ${u(18)}; opacity: 0.8; word-break: break-all; }

  .slot-head { font-size: ${u(70)}; white-space: nowrap; }
  .slot-text { font-size: ${u(20)}; line-height: 1.5; display: -webkit-box;
    -webkit-box-orient: vertical; -webkit-line-clamp: 7; overflow: hidden; }
  .slot-text p + p, .content-text p + p { margin-top: ${u(10)}; }

  .content { inset: 0; }
  .content > * { position: absolute; }
  .content-head { font-size: ${u(68)}; }
  .content-text { font-size: ${u(20)}; line-height: 1.45; display: -webkit-box;
    -webkit-box-orient: vertical; -webkit-line-clamp: 10; overflow: hidden; }
  .row-side { left: ${u(104)}; top: ${u(208)}; width: ${u(616)}; display: flex;
    flex-direction: column; gap: ${u(22)}; }
  .row-side .content-head { padding-left: ${u(12)}; }
  .row-side.wide { width: ${u(1000)}; }
  .grid-side { right: ${u(105)}; top: ${u(420)}; width: ${u(620)}; display: flex;
    flex-direction: column; align-items: flex-end; gap: ${u(22)}; text-align: right; }
  .grid-side .content-head { padding-right: ${u(10)}; }
  .collage-head { right: ${u(204)}; top: ${u(84)}; max-width: ${u(470)}; text-align: right; }
  .collage-text { left: ${u(50)}; top: ${u(604)}; width: ${u(572)}; }

  .tl-header { left: ${u(97)}; top: ${u(80)}; font-size: ${u(30)}; font-weight: 700;
    text-transform: uppercase; letter-spacing: 0; line-height: 1.2; }
  .tl-axis { left: ${u(161)}; top: ${u(402)}; width: ${u(1176)}; height: ${u(1.5)}; background: currentColor; }
  .tl-arrow { left: ${u(1331)}; top: ${u(394)}; width: 0; height: 0;
    border-top: ${u(9)} solid transparent; border-bottom: ${u(9)} solid transparent;
    border-left: ${u(16)} solid currentColor; }
  .tl-text { width: ${u(215)}; font-size: ${u(22)}; line-height: 1.32; }
  .tl-text.above { display: flex; flex-direction: column; justify-content: flex-end; }
  .tl-date { font-size: ${u(28)}; font-weight: 700; margin-bottom: ${u(6)}; letter-spacing: 0.01em; }
  .tl-mark { width: ${u(14)}; height: ${u(14)}; background:
    linear-gradient(to top right, transparent 46%, #555 46%, #555 54%, transparent 54%), #e9e2d6;
    border: ${u(1)} solid #8a8478; }
  .tl-dot { width: ${u(30)}; height: ${u(30)}; border-radius: 50%; background: ${RED}; }
  .tl-legend { left: ${u(104)}; top: ${u(686)}; display: flex; align-items: center; gap: ${u(16)};
    font-size: ${u(22)}; font-weight: 700; font-style: italic; }
  .legend-dot { position: static; display: inline-block; }

  @media print {
    body { background: none; }
    .deck { container-type: normal; max-width: none; width: 1440px; padding: 0; gap: 0; }
    .page { --u: 1px; width: 1440px; height: 810px; aspect-ratio: auto; break-after: page; }
    .page:last-child { break-after: auto; }
  }
</style>
</head>
<body>
<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs><g id="pds-logo"><path fill="#000" fill-rule="evenodd" d="${PDS_LOGO_BLACK}"/><path fill="#fff" fill-rule="evenodd" d="${PDS_LOGO_WHITE}"/></g></defs></svg>
<main class="deck">
${pages.join("\n")}
</main>
</body>
</html>`;
}
