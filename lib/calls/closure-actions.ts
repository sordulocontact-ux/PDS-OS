"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { emailMessage } from "@/lib/email/link-email";
import {
  buildReportContent,
  reportContentOf,
  reportText,
  REPORT_SCOPES,
  scopedReport,
} from "@/lib/calls/closure";
import { loadCallOutcomes } from "@/lib/calls/outcomes";
import { loadLatestReport } from "@/lib/calls/queries";
import { fr } from "@/lib/i18n/fr";
import { schedulePendingPushes } from "@/lib/notifications/push";
import { personName } from "@/lib/projects/types";
import { createClient } from "@/lib/supabase/server";

// PROJ-AMEL-01: closing a call freezes its report as a version, written by
// the code; sharing it keeps who, when, which scope and to whom. RLS
// decides who closes and shares (the call's owner).

type Result =
  | {
      ok: true;
      notice?: string;
      done?: string;
      // The outside addresses PDS OS could not e-mail (no SMTP, an error):
      // the screen offers to write to them by hand.
      unreached?: string[];
    }
  | { ok: false; error: string };

const id = z.uuid();
const e = fr.calls.closure.errors;

// The report items that propose something for the Cadrage.
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

function refresh() {
  // The call's page lives under the project or the meetings: both layouts.
  revalidatePath("/app", "layout");
}

/**
 * « Clôturer le call » (and « Corriger le compte rendu »): the latest
 * report with its decisions, its actions and who does them by when, its
 * open points, frozen as the next version, with what was still to review.
 */
export async function closeCall(callId: string, note: string): Promise<Result> {
  const n = z.string().trim().max(1000).safeParse(note);
  if (!id.safeParse(callId).success || !n.success)
    return { ok: false, error: e.failed };
  await requireApproved();
  const supabase = await createClient();
  const [{ data: call }, report] = await Promise.all([
    supabase
      .from("calls")
      .select("id, organization_id, title, occurred_at")
      .eq("id", callId)
      .maybeSingle(),
    loadLatestReport(supabase, callId),
  ]);
  if (!call) return { ok: false, error: e.failed };
  if (!report) return { ok: false, error: e.no_report };

  const outcomes = await loadCallOutcomes(supabase, report);
  const proposalIds = report.items
    .filter((item) => PROPOSAL_KINDS.includes(item.kind))
    .map((item) => item.id);
  const [pending, latest] = await Promise.all([
    proposalIds.length
      ? supabase
          .from("current_field_values")
          .select("id", { count: "exact", head: true })
          .in("source_report_item_id", proposalIds)
          .eq("status", "proposed")
      : Promise.resolve({ count: 0 }),
    supabase
      .from("call_closures")
      .select("version")
      .eq("call_id", callId)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  const content = buildReportContent({
    call: { title: call.title, occurredAt: call.occurred_at },
    summary: report.report.summary,
    decisions: outcomes.decisions,
    actions: outcomes.actions,
    open: report.items
      .filter((item) => item.kind === "open")
      .sort((a, b) => a.position - b.position),
  });
  const { error } = await supabase.from("call_closures").insert({
    organization_id: call.organization_id,
    call_id: callId,
    version: (latest.data?.version ?? 0) + 1,
    content,
    unreviewed: {
      actions: outcomes.actions.filter((a) => !a.task).length,
      proposals: pending.count ?? 0,
    },
    note: n.data || null,
  });
  if (error) {
    console.error("closeCall:", error.message);
    return {
      ok: false,
      error: error.code === "42501" ? fr.auth.errors.forbidden : e.failed,
    };
  }
  refresh();
  return { ok: true };
}

const shareInput = z.object({
  callId: id,
  closureId: id,
  scope: z.enum(REPORT_SCOPES),
  personIds: z.array(id).max(50),
  emails: z.array(z.email()).max(20),
});

/**
 * « Partager le compte rendu »: members are told and read that version
 * only; outside people get the e-mail the user writes from their own
 * mailbox (PDS OS sends nothing). The share is kept either way.
 */
export async function shareCallReport(
  input: z.input<typeof shareInput>,
): Promise<Result> {
  const parsed = shareInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: e.failed };
  const v = parsed.data;
  if (v.personIds.length + v.emails.length === 0)
    return { ok: false, error: fr.calls.closure.recipientsMissing };
  await requireApproved();
  const supabase = await createClient();
  const [{ data: call }, { data: people }] = await Promise.all([
    supabase
      .from("calls")
      .select("organization_id, title, occurred_at")
      .eq("id", v.callId)
      .maybeSingle(),
    v.personIds.length
      ? supabase
          .from("people")
          .select("id, first_name, last_name")
          .in("id", v.personIds)
      : Promise.resolve({ data: [] }),
  ]);
  if (!call) return { ok: false, error: e.failed };
  const recipients = [
    ...(people ?? []).map((p) => ({
      name: personName(p.first_name, p.last_name),
      person_id: p.id,
    })),
    ...v.emails.map((email) => ({ name: email, email })),
  ];
  const { error } = await supabase.from("call_report_shares").insert({
    organization_id: call.organization_id,
    call_id: v.callId,
    closure_id: v.closureId,
    scope: v.scope,
    recipients,
    recipient_person_ids: (people ?? []).map((p) => p.id),
  });
  if (error) {
    console.error("shareCallReport:", error.message);
    return {
      ok: false,
      error: error.code === "42501" ? fr.auth.errors.forbidden : e.failed,
    };
  }
  await schedulePendingPushes();
  refresh();
  if (v.emails.length === 0) return { ok: true };
  const { data: closure } = await supabase
    .from("call_closures")
    .select("content")
    .eq("id", v.closureId)
    .maybeSingle();
  const content = reportContentOf(closure?.content);
  if (!content) return { ok: true, unreached: v.emails };
  const text = reportText(scopedReport(content, v.scope), {
    title: call.title,
    occurredAt: call.occurred_at,
  });
  const reached: string[] = [];
  for (const address of v.emails) {
    const sent = await emailMessage({
      to: { name: address, email: address },
      subject: fr.calls.closure.report.subject(call.title),
      text,
    });
    if (sent === "sent") reached.push(address);
  }
  const t = fr.calls.closure.emailed;
  const unreached = v.emails.filter((address) => !reached.includes(address));
  if (unreached.length === 0) return { ok: true, done: t.sent(reached) };
  return {
    ok: true,
    unreached,
    ...(reached.length > 0 ? { notice: t.partial(reached) } : {}),
  };
}
