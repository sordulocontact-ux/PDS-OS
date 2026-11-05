import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  loadCallClosures,
  type CallClosure,
  type CallShare,
} from "@/lib/calls/closure-queries";
import { summaryDraft } from "@/lib/calls/meeting/draft";
import { loadCallSummaries, loadMeeting } from "@/lib/calls/meeting/queries";
import type { MeetingData, MeetingLine } from "@/lib/calls/meeting/types";
import { loadCallOutcomes, type CallOutcomes } from "@/lib/calls/outcomes";
import { shortDay } from "@/lib/calls/prep/dates";
import type { PrepPerson } from "@/lib/calls/prep/types";
import type { CallDetail, StoredReport } from "@/lib/calls/queries";
import { emailEnabled } from "@/lib/email/send";
import type { Database } from "@/lib/supabase/database.types";

// The report items that propose something to a module (Cadrage, Stratégie).
const PROPOSAL_KINDS = [
  "objective",
  "timing",
  "frame",
  "need",
  "team",
  "positioning",
  "audiences",
  "narrative",
  "lever",
  "brief_fact",
];

/** What a held call's page reads besides the call: empty before its report. */
export type CallPageData = {
  outcomes: CallOutcomes | null;
  closures: CallClosure[];
  shares: CallShare[];
  summarySent: boolean;
  // Proposals of the report still « proposed » in their module.
  pendingProposals: number;
  // Its lines, each in the state the closing gave it (« Compte rendu »).
  meeting: MeetingData | null;
  // The summary to the participants, drafted by code (never the model).
  summary: { draft: string; recipients: PrepPerson[] } | null;
  // PDS OS sends e-mails itself (SMTP set): the summary and the shared
  // report reach the outside guests without a hand-written e-mail.
  emailEnabled: boolean;
};

const EMPTY: Omit<CallPageData, "emailEnabled"> = {
  outcomes: null,
  closures: [],
  shares: [],
  summarySent: false,
  pendingProposals: 0,
  meeting: null,
  summary: null,
};

/**
 * Everything a call's page shows once its report exists, read with the
 * viewer's session (RLS). Counts and states are the code's.
 */
export async function loadCallPage(
  supabase: SupabaseClient<Database>,
  {
    call,
    report,
    mePersonId,
    ownerName,
  }: {
    call: CallDetail;
    report: StoredReport | null;
    mePersonId: string | null;
    ownerName: string | null;
  },
): Promise<CallPageData> {
  if (!report) return { ...EMPTY, emailEnabled: emailEnabled() };
  const proposalIds = report.items
    .filter((item) => PROPOSAL_KINDS.includes(item.kind))
    .map((item) => item.id);
  const [outcomes, { closures, shares }, summaries, base, pending] =
    await Promise.all([
      loadCallOutcomes(supabase, report),
      loadCallClosures(call.id),
      loadCallSummaries(call.id),
      loadMeeting(call.id, { name: call.title, noun: "call" }),
      proposalIds.length
        ? supabase
            .from("current_field_values")
            .select("id", { count: "exact", head: true })
            .in("source_report_item_id", proposalIds)
            .eq("status", "proposed")
        : Promise.resolve({ count: 0 }),
    ]);

  // What the last closing kept reads « Confirmé par » whoever closed it.
  const closed = closures[0] ?? null;
  const kept = new Set(
    closed
      ? [...closed.content.decisions, ...closed.content.actions].map(
          (x) => x.what,
        )
      : [],
  );
  const meeting = base && {
    ...base,
    lines: base.lines.map((line): MeetingLine =>
      closed && line.kind !== "arbitrate" && kept.has(line.text)
        ? { ...line, state: { kind: "confirmed", by: closed.closedByName } }
        : line,
    ),
  };

  return {
    emailEnabled: emailEnabled(),
    outcomes,
    closures,
    shares,
    summarySent: summaries.length > 0,
    pendingProposals: pending.count ?? 0,
    meeting,
    summary: meeting && {
      draft: summaryDraft(
        draftMeeting(meeting, outcomes, ownerName),
        ownerName,
      ),
      recipients: meeting.participants.filter(
        (p) => p.key !== `m:${mePersonId}`,
      ),
    },
  };
}

/**
 * The lines the summary carries: what the closing kept, the decisions as
 * they were said, the actions that became a task with its assignee and due
 * date. Open questions stay out; the owner rereads before it goes.
 */
function draftMeeting(
  meeting: MeetingData,
  outcomes: CallOutcomes,
  ownerName: string | null,
): MeetingData {
  const by = ownerName ?? "";
  const tasks = new Map(
    outcomes.actions.flatMap((a) => (a.task ? [[a.id, a.task] as const] : [])),
  );
  return {
    ...meeting,
    lines: meeting.lines.map((line): MeetingLine => {
      if (line.state.kind !== "pending") return line;
      const task = tasks.get(line.id);
      if (task)
        return {
          ...line,
          who: task.assigneeName || line.who,
          due: shortDay(`${task.dueDate}T12:00:00Z`),
          state: { kind: "confirmed", by },
        };
      return line.kind === "decision"
        ? { ...line, state: { kind: "confirmed", by } }
        : line;
    }),
  };
}
