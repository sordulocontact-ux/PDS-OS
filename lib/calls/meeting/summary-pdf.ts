import "server-only";

import { callWhen } from "@/lib/calls/prep/dates";
import { meeting } from "@/lib/i18n/fr/meeting";
import { GOOGLE_SANS_FLEX_FACES } from "@/lib/pdf/fonts/google-sans-flex";
import { htmlToPdf } from "@/lib/pdf/render";
import { formatDay } from "@/lib/utils/day";

const t = meeting.summary.pdf;

const escape = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

export type SummaryPdfInput = {
  project: string | null;
  // « Échange de cadrage »
  call: string;
  occurredAt: string;
  participants: string[];
  // The message as the owner sent it.
  text: string;
  sentBy: string | null;
  sentAt: string;
  version: number | null;
};

/** « Compte rendu - Échange de cadrage - Piégé.pdf », safe for any disk. */
export function summaryFileName(
  input: Pick<SummaryPdfInput, "project" | "call">,
) {
  const clean = (s: string) => s.replace(/[\\/:*?"<>|]+/g, " ").trim();
  return `${[
    t.name,
    clean(input.call),
    input.project ? clean(input.project) : null,
  ]
    .filter(Boolean)
    .join(" - ")}.pdf`;
}

/**
 * The message, laid out: a line ending with « : » is a heading (« Décisions
 * : », « Prochaines étapes : »), « — … » a list item, the rest paragraphs.
 * Everything is escaped: it is the team's text.
 */
function bodyOf(text: string): string {
  const out: string[] = [];
  let list: string[] = [];
  const flush = () => {
    if (list.length) out.push(`<ul>${list.join("")}</ul>`);
    list = [];
  };
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) {
      flush();
      continue;
    }
    const item = line.match(/^[—–-]\s+(.*)$/);
    if (item) {
      list.push(`<li>${escape(item[1])}</li>`);
      continue;
    }
    flush();
    out.push(
      /:\s*$/.test(line)
        ? `<h2>${escape(line.replace(/\s*:\s*$/, ""))}</h2>`
        : `<p>${escape(line)}</p>`,
    );
  }
  flush();
  return out.join("\n");
}

/**
 * The summary of a meeting as a document (Sacha 05/11/2026: « le compte
 * rendu, c'est un PDF »): the meeting, when and who, then the message as
 * sent, then who sent it. The styles mirror the Brief de cadrage's PDF
 * (lib/framing/brief-pdf.ts).
 */
export function summaryHtml(input: SummaryPdfInput): string {
  const title = [t.name, input.call].join(" · ");
  const sent = t.sentBy(
    input.sentBy ?? "—",
    formatDay(input.sentAt),
    input.version,
  );
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>${escape(title)}</title>
<style>
${GOOGLE_SANS_FLEX_FACES}
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: "Google Sans Flex", system-ui, sans-serif; font-weight: 500;
    color: #000000; letter-spacing: -0.02em; font-size: 14px; line-height: 21px; }
  .eyebrow, dt, .foot { font-size: 12px; line-height: 17px; color: #767676; }
  h1 { font-size: 28px; line-height: 34px; font-weight: 600;
    letter-spacing: -0.04em; margin: 6px 0 4px; }
  .kind { color: #767676; margin-bottom: 24px; }
  dl { display: grid; grid-template-columns: 1fr 2fr; gap: 12px 40px;
    padding: 14px 0; border-top: 1px solid #ececec; border-bottom: 1px solid #ececec;
    margin-bottom: 28px; }
  dd { margin-top: 2px; font-weight: 600; }
  h2 { font-size: 17px; line-height: 22px; font-weight: 600; margin: 22px 0 10px;
    break-after: avoid; }
  p + p { margin-top: 10px; }
  ul + p, p + ul { margin-top: 18px; }
  ul { list-style: none; display: flex; flex-direction: column; gap: 8px; }
  li { position: relative; padding-left: 16px; break-inside: avoid; }
  li::before { content: ""; position: absolute; left: 2px; top: 8px; width: 5px;
    height: 5px; border-radius: 50%; background: #000000; }
  .foot { margin-top: 32px; padding-top: 12px; border-top: 1px solid #ececec; }
</style>
</head>
<body>
  <p class="eyebrow">${escape(t.name)}</p>
  <h1>${escape(input.call)}</h1>
  ${input.project ? `<p class="kind">« ${escape(input.project)} »</p>` : ""}
  <dl>
    <div><dt>${escape(t.when)}</dt><dd>${escape(callWhen(input.occurredAt))}</dd></div>
    <div><dt>${escape(t.participants)}</dt><dd>${escape(input.participants.join(", ") || "—")}</dd></div>
  </dl>
  ${bodyOf(input.text)}
  <p class="foot">${escape(sent)}</p>
</body>
</html>`;
}

/** The PDF itself (lib/pdf/render.ts), with its file name. */
export async function summaryPdf(
  input: SummaryPdfInput,
): Promise<{ name: string; pdf: Uint8Array }> {
  return {
    name: summaryFileName(input),
    pdf: await htmlToPdf(summaryHtml(input)),
  };
}
