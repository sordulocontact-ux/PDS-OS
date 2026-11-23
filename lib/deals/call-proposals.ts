import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { DEAL_CALL_PROPOSALS_INSTRUCTIONS } from "@/lib/ai/instructions/deal-call-proposals";
import { extract } from "@/lib/ai/llm";
import { locateQuote } from "@/lib/ai/provenance";
import {
  dealCallProposalsSchema,
  type DealCallProposalsOutput,
} from "@/lib/ai/schemas/deal-call-proposals";
import type { Transcript } from "@/lib/ai/schemas/transcript";
import { resolveSaidDate } from "@/lib/assistant/said-date";
import { parseSaidEuros } from "@/lib/assistant/verbatim";
import { loadLatestTranscript } from "@/lib/calls/queries";
import { applyTermProposals } from "@/lib/deals/call-apply";
import {
  DEAL_TERMS,
  TERM_VALUES,
  type TermDefinition,
  type TermState,
  type TermValue,
} from "@/lib/deals/terms";
import { DEAL_KINDS, type DealKind } from "@/lib/deals/types";
import { deals } from "@/lib/i18n/fr/deals";
import { todayInParis } from "@/lib/insights/dates";
import { SPLIT_ROLES, unitsOf } from "@/lib/legal/splits/shares";
import type { Database, Json } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;
type Row = Database["public"]["Tables"]["deal_call_proposals"]["Insert"];
type Said = DealCallProposalsOutput["terms"][number];

// The person confirms them one by one: more would bury the section.
const MAX_PROPOSALS = 20;
const MAX_QUOTE = 1000;

const STANCES: Record<string, Exclude<TermState, "to_define">> = {
  pds: "pds_proposal",
  counter: "counter_proposal",
  agreed: "confirmed",
};

const numbersOf = (text: string) =>
  (text.match(/\d+(?:[.,]\d+)?/g) ?? []).map((n) => n.replace(",", "."));
const fold = (text: string) =>
  text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Every figure of `text` is in `quote`: the model adds none of its own. */
const figuresFrom = (text: string, quote: string) => {
  const known = new Set(numbersOf(quote));
  return numbersOf(text).every((n) => known.has(n));
};

/** A quote of at least three words, found verbatim in the transcript. */
function verified(quote: string, transcript: Transcript): string | null {
  const q = quote.trim();
  if (q.split(/\s+/).length < 3 || q.length > MAX_QUOTE) return null;
  return locateQuote(q, transcript).status === "missing" ? null : q;
}

/** The value said, in its term's shape, every figure taken from the quote. */
function valueOf(
  term: TermDefinition,
  said: Said,
  quote: string,
): TermValue | null {
  const value = said.value.trim();
  if (!value || !figuresFrom(value, quote)) return null;
  const parsed = (() => {
    switch (term.format) {
      case "text":
        return { text: value };
      case "percent": {
        const n = numbersOf(value)[0];
        const units = n ? unitsOf(n) : null;
        return units === null ? null : { units };
      }
      case "money": {
        const cents = parseSaidEuros(value);
        const mode = said.mode.trim();
        return cents === null
          ? null
          : { mode: mode === "fee" ? "fee" : "advance", cents };
      }
      case "amount": {
        const cents = parseSaidEuros(value);
        return cents === null ? null : { cents };
      }
      case "yesno": {
        const yes = said.yes.trim();
        return yes === "yes" || yes === "no"
          ? { yes: yes === "yes", detail: value === yes ? null : value }
          : null;
      }
      case "split": {
        const entries = said.parts.flatMap((part) => {
          const role = SPLIT_ROLES.find((r) => r === part.role.trim());
          const units = unitsOf(part.percent.trim());
          return role && units !== null && figuresFrom(part.percent, quote)
            ? [{ role, units }]
            : [];
        });
        return entries.length > 0 ? { entries } : null;
      }
    }
  })();
  const checked = TERM_VALUES[term.format].safeParse(parsed);
  return checked.success ? (checked.data as TermValue) : null;
}

/** What the model is given: the terms as keys, then the transcript, all
 * as data. */
function inputOf(kind: DealKind, transcript: Transcript) {
  const t = deals;
  return [
    "<terms>",
    ...DEAL_TERMS[kind].map(
      (term) => `${term.key} : ${t.terms.labels[term.key] ?? term.key}`,
    ),
    "</terms>",
    "<transcript>",
    transcript.text,
    "</transcript>",
  ].join("\n");
}

/**
 * Right after a deal's call report is saved (BIZ 6), PO reads the
 * transcript and proposes what changed in the negotiation: a term's value,
 * the next action (no stage: the deal moves by itself, 21/11/2026). The code keeps only what it can verify — a known
 * term, a quote found verbatim, every figure taken from it, a date said and
 * resolved by code — and writes them under the user's session (RLS:
 * whoever works on the call): the terms are written at once (applyTermProposals,
 * Sacha 23/11/2026), each with its passage, the next action stays proposed. A call already read is not read twice. Returns how many were
 * proposed.
 */
export async function proposeFromDealCall(
  supabase: Client,
  callId: string,
  dealId: string,
): Promise<number> {
  const [{ data: deal }, stored, { data: already }, { data: terms }] =
    await Promise.all([
      supabase
        .from("deals")
        .select("id, organization_id, kind, stage")
        .eq("id", dealId)
        .maybeSingle(),
      loadLatestTranscript(supabase, callId),
      supabase
        .from("deal_call_proposals")
        .select("id")
        .eq("call_id", callId)
        .limit(1),
      supabase
        .from("deal_terms")
        .select("term_key, value, state")
        .eq("deal_id", dealId),
    ]);
  const kind = DEAL_KINDS.find((k) => k === deal?.kind);
  if (!deal || !kind || !stored || (already?.length ?? 0) > 0) return 0;
  if (deal.stage === "signed" || deal.stage === "abandoned") return 0;
  const transcript = stored.transcript;

  let output: DealCallProposalsOutput;
  try {
    ({ output } = await extract(
      dealCallProposalsSchema,
      inputOf(kind, transcript),
      DEAL_CALL_PROPOSALS_INSTRUCTIONS,
    ));
  } catch (error) {
    // A provider failure leaves the call without proposals.
    console.error("proposeFromDealCall:", error);
    return 0;
  }

  const current = new Map(
    (terms ?? []).map((t) => [t.term_key, JSON.stringify([t.value, t.state])]),
  );
  const base = {
    organization_id: deal.organization_id,
    deal_id: deal.id,
    call_id: callId,
  };
  const rows: Row[] = [];
  const seen = new Set<string>();
  for (const said of output.terms) {
    const term = DEAL_TERMS[kind].find((d) => d.key === said.term.trim());
    const quote = verified(said.quote, transcript);
    const state = STANCES[said.stance.trim()];
    if (!term || !quote || !state || seen.has(term.key)) continue;
    const value = valueOf(term, said, quote);
    if (!value || current.get(term.key) === JSON.stringify([value, state]))
      continue;
    seen.add(term.key);
    rows.push({
      ...base,
      kind: "term",
      term_key: term.key,
      value: value as Json,
      term_state: state,
      quote,
    });
  }

  const action = output.nextAction.trim();
  const actionQuote = verified(output.nextActionQuote, transcript);
  if (
    action &&
    action.length <= 500 &&
    actionQuote &&
    figuresFrom(action, actionQuote)
  ) {
    const when = output.nextActionWhen.trim();
    const said =
      when && fold(actionQuote).includes(fold(when))
        ? resolveSaidDate(when, todayInParis())
        : null;
    rows.push({
      ...base,
      kind: "next_action",
      next_action: action,
      next_action_on: said?.ok ? said.date : null,
      quote: actionQuote,
    });
  }

  const kept = rows.slice(0, MAX_PROPOSALS);
  if (kept.length === 0) return 0;
  const { error } = await supabase.from("deal_call_proposals").insert(kept);
  if (error) {
    console.error("proposeFromDealCall insert:", error.message);
    return 0;
  }
  // What PO read is the term now (Sacha 23/11/2026: « ce que PO lit est
  // validé »), its passage kept beside it; a person changes it with the
  // card's pencil. Who may not write the deal leaves them proposed.
  if (rows.some((r) => r.kind === "term")) {
    const applied = await applyTermProposals(supabase, deal.id, kind);
    if (!applied.ok) console.error("proposeFromDealCall apply:", applied.error);
  }
  return kept.length;
}
