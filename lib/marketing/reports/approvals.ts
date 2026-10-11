import "server-only";

import type { Access } from "@/lib/auth/access";
import { loadMembers } from "@/lib/framing/related";
import {
  APPROVAL_DECISIONS,
  type ApprovalDecision,
} from "@/lib/marketing/reports/model";
import { createClient } from "@/lib/supabase/server";

export type Approval = {
  id: string;
  reportId: string;
  reportVersion: number;
  decision: ApprovalDecision;
  validatorName: string;
  comment: string | null;
  reservesCount: number;
  decidedAt: string;
};

const isDecision = (v: unknown): v is ApprovalDecision =>
  (APPROVAL_DECISIONS as readonly unknown[]).includes(v);

/** The decisions on the project's reports, newest first (RLS decides). */
export async function loadApprovals(
  projectId: string,
  access: Access,
): Promise<Approval[]> {
  const supabase = await createClient();
  const [{ data }, members] = await Promise.all([
    supabase
      .from("marketing_report_approvals")
      .select(
        "id, report_id, report_version, decision, validator_person_id, comment, reserves, decided_at",
      )
      .eq("project_id", projectId)
      .order("decided_at", { ascending: false }),
    loadMembers(access),
  ]);
  return (data ?? []).flatMap((a) =>
    isDecision(a.decision)
      ? [
          {
            id: a.id,
            reportId: a.report_id,
            reportVersion: a.report_version,
            decision: a.decision,
            validatorName:
              members.find((m) => m.personId === a.validator_person_id)?.name ??
              "",
            comment: a.comment,
            reservesCount: Array.isArray(a.reserves) ? a.reserves.length : 0,
            decidedAt: a.decided_at,
          },
        ]
      : [],
  );
}
