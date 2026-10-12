import { CallClosureCard } from "@/components/calls/closure/call-closure-card";
import { loadCallClosures } from "@/lib/calls/closure-queries";
import type { CallOutcomes } from "@/lib/calls/outcomes";
import type { CallDetail, StoredReport } from "@/lib/calls/queries";
import type { Member } from "@/lib/framing/related";
import { createClient } from "@/lib/supabase/server";

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

/**
 * « Compte rendu et clôture » of a call (PROJ-AMEL-01), under its outcomes:
 * the five outputs and where each stands, then the closing, the sharing
 * and their history. Counts are the code's, read with the user's session.
 */
export async function CallClosureSection({
  call,
  hasTranscript,
  report,
  outcomes,
  canEdit,
  members,
  mePersonId,
}: {
  call: CallDetail;
  hasTranscript: boolean;
  report: StoredReport;
  outcomes: CallOutcomes;
  canEdit: boolean;
  members: Member[];
  mePersonId: string | null;
}) {
  const supabase = await createClient();
  const proposalIds = report.items
    .filter((item) => PROPOSAL_KINDS.includes(item.kind))
    .map((item) => item.id);
  const [{ closures, shares }, pending] = await Promise.all([
    loadCallClosures(call.id),
    proposalIds.length
      ? supabase
          .from("current_field_values")
          .select("id", { count: "exact", head: true })
          .in("source_report_item_id", proposalIds)
          .eq("status", "proposed")
      : Promise.resolve({ count: 0 }),
  ]);
  return (
    <CallClosureCard
      call={{ id: call.id, title: call.title, occurredAt: call.occurredAt }}
      outputs={{
        transcript: hasTranscript,
        summary: report.report.summary.trim() !== "",
        decisions: outcomes.decisions.length,
        actions: outcomes.actions.length,
        tasks: outcomes.actions.filter((a) => a.task).length,
        proposals: proposalIds.length,
        pendingProposals: pending.count ?? 0,
      }}
      closures={closures}
      shares={shares}
      canEdit={canEdit}
      members={members.filter((m) => m.personId !== mePersonId)}
      guestEmails={call.guests.map((g) => g.email)}
    />
  );
}
