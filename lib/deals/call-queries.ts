import "server-only";

import { asCallStatus, type CallStatus } from "@/lib/calls/constants";
import { parseTermValue } from "@/lib/deals/term-format";
import {
  termOf,
  TERM_STATES,
  type TermState,
  type TermValue,
} from "@/lib/deals/terms";
import {
  isDealStage,
  type DealKind,
  type MovableDealStage,
} from "@/lib/deals/types";
import { createClient } from "@/lib/supabase/server";

// Read with the user's session: a deal's calls and proposals are seen by
// whoever reads the deal (BIZ 6, can_see_call's deal branch).

/** A call of the deal, for its page's list. */
export type DealCall = {
  id: string;
  title: string;
  occurredAt: string;
  endsAt: string | null;
  durationMinutes: number | null;
  status: CallStatus;
  audioPath: string | null;
  closed: boolean;
};

export async function loadDealCalls(dealId: string): Promise<DealCall[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("calls")
    .select(
      "id, title, occurred_at, ends_at, duration_minutes, status, audio_path, closures:call_closures!call_closures_call_same_org(id)",
    )
    .eq("deal_id", dealId)
    .order("occurred_at", { ascending: false })
    .limit(100);
  if (error) console.error("loadDealCalls:", error.message);
  return (data ?? []).map((c) => ({
    id: c.id,
    title: c.title,
    occurredAt: c.occurred_at,
    endsAt: c.ends_at,
    durationMinutes: c.duration_minutes,
    status: asCallStatus(c.status),
    audioPath: c.audio_path,
    closed: c.closures.length > 0,
  }));
}

/** What PO proposed from a call, still waiting for a person. */
export type DealCallProposal = {
  id: string;
  callId: string;
  callTitle: string;
  callAt: string;
  quote: string;
} & (
  | {
      kind: "term";
      termKey: string;
      value: TermValue;
      state: Exclude<TermState, "to_define">;
    }
  | { kind: "stage"; stage: MovableDealStage }
  | { kind: "next_action"; action: string; on: string | null }
);

const isState = (v: string | null): v is Exclude<TermState, "to_define"> =>
  v !== null &&
  v !== "to_define" &&
  (TERM_STATES as readonly string[]).includes(v);

/** The deal's proposals still « proposé », oldest call first; one whose term
 * left the configuration is not shown. */
export async function loadDealCallProposals(
  dealId: string,
  kind: DealKind,
): Promise<DealCallProposal[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("deal_call_proposals")
    .select(
      "id, call_id, kind, term_key, value, term_state, stage, next_action, next_action_on, quote, call:calls!deal_call_proposals_call_same_org(title, occurred_at)",
    )
    .eq("deal_id", dealId)
    .eq("status", "proposed")
    .order("created_at");
  if (error) console.error("loadDealCallProposals:", error.message);
  return (data ?? []).flatMap((p): DealCallProposal[] => {
    const base = {
      id: p.id,
      callId: p.call_id,
      callTitle: p.call?.title ?? "",
      callAt: p.call?.occurred_at ?? "",
      quote: p.quote,
    };
    if (p.kind === "term" && p.term_key) {
      const term = termOf(kind, p.term_key);
      const value = term ? parseTermValue(term.format, p.value) : null;
      return term && value && isState(p.term_state)
        ? [
            {
              ...base,
              kind: "term",
              termKey: term.key,
              value,
              state: p.term_state,
            },
          ]
        : [];
    }
    if (p.kind === "stage" && isDealStage(p.stage) && p.stage !== "abandoned")
      return [{ ...base, kind: "stage", stage: p.stage }];
    if (p.kind === "next_action" && p.next_action)
      return [
        {
          ...base,
          kind: "next_action",
          action: p.next_action,
          on: p.next_action_on,
        },
      ];
    return [];
  });
}
