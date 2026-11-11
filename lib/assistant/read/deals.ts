import "server-only";

import { tool } from "ai";
import { z } from "zod";

import { formatDay } from "@/lib/assistant/facts";
import {
  capped,
  readFailed,
  type ReadResult,
} from "@/lib/assistant/read/target";
import type { Access } from "@/lib/auth/access";
import { routes } from "@/lib/auth/redirects";
import { foldName } from "@/lib/assistant/fuzzy-name";
import { dealName } from "@/lib/deals/names";
import { loadDeals } from "@/lib/deals/queries";
import { formatTermValue, parseTermValue } from "@/lib/deals/term-format";
import { termOf } from "@/lib/deals/terms";
import { deals } from "@/lib/i18n/fr/deals";
import { createClient } from "@/lib/supabase/server";

const fr = { deals };
const MAX_SHOWN = 15;

/** The deals the user may see (BIZ 4), with their stage, negotiator, next
 * action, follow-up and the terms written so far; `name` keeps the deals of
 * an artist, a title or a project. Read with the user's session (RLS). */
export async function readDeals(
  access: Access,
  name: string | null,
): Promise<ReadResult> {
  const t = fr.deals.po;
  const { deals: all } = await loadDeals(access);
  const wanted = name ? foldName(name) : null;
  const kept = wanted
    ? all.filter((d) =>
        foldName([dealName(d), d.projectTitle ?? ""].join(" ")).includes(
          wanted,
        ),
      )
    : all.filter((d) => d.stage !== "signed" && d.stage !== "abandoned");
  const shown = kept.slice(0, MAX_SHOWN);
  const supabase = await createClient();
  const ids = shown.map((d) => d.id);
  const [{ data: terms }, { data: calls }, { data: proposals }] = ids.length
    ? await Promise.all([
        supabase
          .from("deal_terms")
          .select("deal_id, term_key, value, state")
          .in("deal_id", ids),
        // BIZ 6: its calls and PO's proposals still waiting.
        supabase.from("calls").select("deal_id").in("deal_id", ids),
        supabase
          .from("deal_call_proposals")
          .select("deal_id")
          .in("deal_id", ids)
          .eq("status", "proposed"),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }];
  const countOf = (rows: { deal_id: string | null }[] | null, id: string) =>
    (rows ?? []).filter((row) => row.deal_id === id).length;
  return {
    facts: [
      t.count(kept.length),
      ...shown.flatMap((d) => [
        t.line(
          dealName(d),
          fr.deals.stages[d.stage],
          d.assignee?.name ?? t.unassigned,
        ),
        ...(d.nextAction
          ? [
              t.next(
                d.nextAction,
                d.nextActionOn ? formatDay(d.nextActionOn) : null,
              ),
            ]
          : []),
        ...(d.followUpOn ? [t.followUp(formatDay(d.followUpOn))] : []),
        ...(d.abandonReason ? [t.abandoned(d.abandonReason)] : []),
        ...(countOf(calls, d.id) > 0
          ? [t.calls(countOf(calls, d.id), countOf(proposals, d.id))]
          : []),
        ...(terms ?? [])
          .filter((row) => row.deal_id === d.id)
          .flatMap((row) => {
            const term = termOf(d.kind, row.term_key);
            const value = term
              ? formatTermValue(
                  term.format,
                  parseTermValue(term.format, row.value),
                )
              : null;
            const state =
              fr.deals.terms.states[
                row.state as keyof typeof fr.deals.terms.states
              ];
            return value && state
              ? [
                  t.term(
                    fr.deals.terms.labels[row.term_key] ?? row.term_key,
                    value,
                    state,
                  ),
                ]
              : [];
          }),
      ]),
      ...capped(kept.length, MAX_SHOWN),
    ],
    sources: shown.map((d) => ({
      label: dealName(d),
      href: routes.deal(d.id),
    })),
    ...(kept.length === 0 ? { gap: "missing" as const } : {}),
  };
}

export function dealsTool(access: Access) {
  return tool({
    description:
      "Lit les deals (négociations du module Business) que l'utilisateur peut voir : étape, qui négocie, prochaine action, relance, termes négociés. Sans nom : les deals en cours. À appeler pour « où en est le deal de Nadia ? », « quels deals dois-je relancer ? ».",
    inputSchema: z.object({
      name: z
        .string()
        .max(120)
        .optional()
        .describe("Un artiste, un titre ou un projet, pour un deal précis"),
    }),
    execute: async ({ name }) => {
      try {
        return await readDeals(access, name?.trim() || null);
      } catch (error) {
        console.error("readDeals:", error);
        return readFailed();
      }
    },
  });
}
