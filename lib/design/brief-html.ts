import "server-only";

import type { CreativeBriefContent } from "@/lib/design/brief";
import { briefDocumentStyle } from "@/lib/design/brief-html-style";
import {
  coherenceLine,
  decisionLine,
  intentionLine,
  referenceLine,
  sheetItemLines,
  sheetLine,
} from "@/lib/design/brief-text";
import { formatBriefDate } from "@/lib/framing/assess";
import { fr } from "@/lib/i18n/fr";
import { escapeHtml as e } from "@/lib/strategy/documents/brief-html";

const list = (items: string[], cls = "") =>
  items.length
    ? `<ul class="${cls}">${items.map((i) => `<li>${e(i)}</li>`).join("")}</ul>`
    : "";
const para = (text: string | null | undefined, cls = "") =>
  text ? `<p class="${cls}">${e(text)}</p>` : "";

/**
 * A stored version of the Brief créatif as a standalone HTML document for
 * its PDF (MKT-C2-12): version, date, author and status first, a table of
 * contents, then the parts in the page's order. Internal to the project's
 * team; it holds no budget nor contract terms. Every value is escaped.
 */
export function creativeBriefHtml({
  content: c,
  number,
  author,
  createdAt,
  status,
}: {
  content: CreativeBriefContent;
  number: number;
  author: string;
  createdAt: string;
  status: string;
}): string {
  const t = fr.conceptionDirection.brief;
  const d = t.document;
  const parts: Array<[string, string, string]> = [];
  const part = (id: string, title: string, body: string) =>
    parts.push([id, title, body || `<p class="empty">${e(t.none)}</p>`]);

  part(
    "context",
    t.sections.context,
    `<dl>${[
      [t.facts.project, c.context.project],
      [t.facts.artist, c.context.artist || null],
      [
        t.facts.release,
        c.context.releaseDate
          ? formatBriefDate(c.context.releaseDate)
          : t.facts.noRelease,
      ],
    ]
      .filter(([, v]) => v)
      .map(([k, v]) => `<dt>${e(k ?? "")}</dt><dd>${e(v ?? "")}</dd>`)
      .join("")}</dl>`,
  );
  if (c.identity) {
    const i = c.identity;
    part(
      "identity",
      t.identity.title,
      (i.version > 0
        ? para(
            t.identity.version(
              i.version,
              i.approvedOn ? formatBriefDate(i.approvedOn) : null,
            ),
            "muted",
          )
        : "") +
        (i.mismatchArtist !== undefined
          ? para(t.identity.mismatch(i.mismatchArtist))
          : "") +
        (i.manifesto
          ? para(`${fr.artistIdentity.fields.manifesto} : ${i.manifesto}`)
          : "") +
        (i.tone ? para(`${fr.artistIdentity.fields.tone} : ${i.tone}`) : "") +
        para(
          `${t.identity.deviation} : ${i.deviation ?? t.identity.noDeviation}`,
        ),
    );
  }
  part(
    "objectives",
    t.sections.objectives,
    para(c.objectives.strategic ?? t.toDefine),
  );
  part(
    "audiences",
    t.sections.audiences,
    para(c.audiences.audiences) +
      (c.audiences.channels.length
        ? para(
            `${t.facts.channels} : ${c.audiences.channels.join(", ")}`,
            "muted",
          )
        : ""),
  );
  part(
    "narrative",
    t.sections.narrative,
    para(c.narrative.angle) + list(c.narrative.parts.map((p) => p.value)),
  );
  part("principles", t.sections.principles, list(c.principles));
  part("tone", t.sections.tone, list(c.tone));
  part("showAvoid", t.sections.showAvoid, list(c.showAvoid));
  part("coherence", t.sections.coherence, list(c.coherence.map(coherenceLine)));
  part(
    "deliverables",
    t.sections.deliverables,
    c.deliverables
      .map(
        (x) =>
          `<div class="deliverable"><h3>${e(x.title)}</h3>` +
          (x.sheet ? para(sheetLine(x.sheet), "muted") : "") +
          list(x.intentions.map(intentionLine)) +
          (x.sheet ? list(sheetItemLines(x.sheet), "items") : "") +
          (x.retained
            ? para(
                t.retained(
                  x.retained.number,
                  x.retained.approvedOn
                    ? formatBriefDate(x.retained.approvedOn)
                    : null,
                  x.retained.total,
                ),
                "muted",
              )
            : "") +
          (x.inherits?.length
            ? para(
                t.inherits(
                  x.inherits
                    .map((k) => fr.conception.directionTopics[k])
                    .join(", "),
                ),
                "muted",
              )
            : "") +
          `</div>`,
      )
      .join("") +
      (c.excluded?.length
        ? `<p class="label">${e(d.excluded)}</p>${list(c.excluded)}`
        : ""),
  );
  part(
    "references",
    t.sections.references,
    list(c.references.map(referenceLine)),
  );
  part(
    "constraints",
    t.sections.constraints,
    list(c.constraints.map((x) => x.text)),
  );
  part("decisions", t.sections.decisions, list(c.decisions.map(decisionLine)));
  part(
    "sources",
    t.sections.sources,
    list(
      c.sources.map((s) =>
        s.kind === "strategy"
          ? s.label
          : `${t.sourceKinds[s.kind]} : ${s.label}`,
      ),
    ),
  );
  part("openPoints", t.sections.openPoints, list(c.openPoints));

  const toc = parts
    .map(([id, title]) => `<li><a href="#${id}">${e(title)}</a></li>`)
    .join("");
  const body = parts
    .map(
      ([id, title, html]) =>
        `<section id="${id}"><h2>${e(title)}</h2>${html}</section>`,
    )
    .join("");
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>${e(`${d.title(number)} · ${c.context.project}`)}</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Google+Sans+Flex:wght@500;600&display=block">
<style>${briefDocumentStyle}</style>
</head>
<body>
  <p class="label">${e(`${d.title(number)} · ${status}`)}</p>
  <h1>${e(c.context.project)}</h1>
  <p class="muted">${e(d.meta(author, formatBriefDate(createdAt.slice(0, 10))))}</p>
  <p class="internal">${e(d.internal)}</p>
  <nav><h2>${e(d.toc)}</h2><ol>${toc}</ol></nav>
  ${body}
</body>
</html>`;
}
