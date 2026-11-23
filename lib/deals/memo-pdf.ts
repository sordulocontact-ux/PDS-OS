import "server-only";

import type { DealMemo } from "@/lib/deals/memos";
import { dealName } from "@/lib/deals/names";
import type { Deal } from "@/lib/deals/types";
import { displayTermValue } from "@/lib/deals/term-format";
import { EMAIL_LOGO_URL, escapeHtml } from "@/lib/email/layout";
import { dealMemos } from "@/lib/i18n/fr/deal-memos";
import { deals } from "@/lib/i18n/fr/deals";
import { GOOGLE_SANS_FLEX_FACES } from "@/lib/pdf/fonts/google-sans-flex";
import { createClient } from "@/lib/supabase/server";

const fr = { dealMemos, deals };

const escape = escapeHtml;

/** Who the letter goes to and comes from, read from the deal. */
export type MemoLetter = {
  // The label or the brand, else the artist.
  to: string | null;
  // Whoever negotiates it.
  from: string | null;
  fromEmail: string | null;
  // « Wagram · Dioo ».
  about: string;
};

/** The letter's people, from the deal: the label or the brand (else the
 * artist), whoever negotiates and their address (read with the session). */
export async function loadMemoLetter(deal: Deal): Promise<MemoLetter> {
  const supabase = await createClient();
  const { data: from } = deal.assignee
    ? await supabase
        .from("people")
        .select("email")
        .eq("id", deal.assignee.id)
        .maybeSingle()
    : { data: null };
  return {
    to: deal.counterpartName ?? deal.artistName,
    from: deal.assignee?.name ?? null,
    fromEmail: from?.email ?? null,
    about: dealName(deal),
  };
}

const dayOf = (iso: string) =>
  new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    timeZone: "Europe/Paris",
  }).format(new Date(iso));

/**
 * A deal memo of PDS as a letter to print in PDF (lib/pdf/render.ts), the
 * form of the memos labels send (Sacha 22/11/2026, Wagram's memo « Projet
 * Dioo » given by Ibé): the letterhead, « A / FROM / MAIL / DATE / RE »,
 * « DRAFT DOCUMENT - SUBJECT TO CONTRACT – NON CONTRACTUEL », a greeting and
 * one sentence, then each term in bold with its value as a bullet (one per
 * line of the value). No state, no table: the main points of a contract PDS
 * could offer. Everything is escaped: the terms are data.
 */
export function memoHtml(memo: DealMemo, letter: MemoLetter): string {
  const t = fr.dealMemos.letter;
  const head = [
    [t.to, letter.to],
    [t.from, letter.from ? t.fromLine(letter.from) : t.pds],
    [t.mail, letter.fromEmail],
    [t.date, dayOf(memo.createdAt)],
    [t.re, `« ${letter.about} »`],
  ].filter((row): row is [string, string] => Boolean(row[1]));
  const points = memo.terms
    .map((term) => {
      const value = displayTermValue(term.format, term.value) ?? "";
      const lines = value
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
      return `<section><h2>${escape(fr.deals.terms.labels[term.key] ?? term.key)} :</h2><ul>${lines
        .map((line) => `<li>${escape(line)}</li>`)
        .join("")}</ul></section>`;
    })
    .join("");
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${escape(fr.dealMemos.name(memo.number))}</title>
<style>
${GOOGLE_SANS_FLEX_FACES}
  * { box-sizing: border-box; margin: 0; padding: 0; }
  @page { margin: 2.2cm 2.4cm; }
  body { font-family: "Google Sans Flex", system-ui, sans-serif; font-weight: 500;
    color: #000; font-size: 11pt; line-height: 1.35; }
  header.brand { display: flex; align-items: center; gap: 10px; margin-bottom: 1.4cm; }
  header.brand img { width: 40px; height: 40px; border-radius: 10px; }
  header.brand span { font-size: 20pt; font-weight: 600; letter-spacing: -0.03em; }
  table.head { border-collapse: collapse; margin-bottom: 18pt; }
  table.head td { padding: 0 0 1pt; vertical-align: top; }
  table.head td.k { font-weight: 600; width: 1.5cm; }
  table.head td.c { width: 2.9cm; }
  p.draft { font-weight: 600; }
  p.intro { margin: 0 0 18pt; }
  section { break-inside: avoid; margin-bottom: 14pt; }
  h2 { font-size: 11pt; font-weight: 600; margin-bottom: 4pt; }
  ul { list-style: none; margin-left: 4.4cm; display: flex; flex-direction: column; gap: 2pt; }
  ul li { position: relative; padding-left: 16pt; }
  ul li::before { content: "o"; position: absolute; left: 0; font-weight: 400; }
</style></head><body>
<header class="brand"><img src="${EMAIL_LOGO_URL}" alt=""><span>${escape(t.pds)}</span></header>
<table class="head">${head
    .map(
      ([k, v]) =>
        `<tr><td class="k">${escape(k)}</td><td class="c">:</td><td>${escape(v)}</td></tr>`,
    )
    .join("")}</table>
<p class="draft">${escape(t.draft)}</p>
<p>${escape(t.hello)}</p>
<p class="intro">${escape(t.intro)}</p>
${points || `<p>${escape(fr.dealMemos.noTerms)}</p>`}
</body></html>`;
}
