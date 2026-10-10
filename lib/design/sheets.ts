import "server-only";

import { sheetChecks, type SheetChecks } from "@/lib/design/sheet-checks";
import { toProvenance, type SheetProvenance } from "@/lib/design/sheet-fields";
import {
  sheetStatus,
  submissionStatusOf,
  type SheetStatus,
  type SubmissionStatus,
} from "@/lib/design/states";
import type { Database } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

type Tables = Database["public"]["Tables"];
export type SheetRow = Tables["design_sheets"]["Row"];
export type SheetItemRow = Tables["design_sheet_items"]["Row"];

export type SheetDecision = {
  section: string;
  decision: Exclude<SubmissionStatus, "pending">;
  comment: string | null;
  decidedBy: string | null;
  decidedAt: string;
};

export type SheetVersion = {
  id: string;
  number: number;
  status: SubmissionStatus;
  mode: "global" | "per_section";
  sections: string[];
  snapshot: unknown;
  submittedBy: string | null;
  submittedAt: string;
  decisions: SheetDecision[];
};

/** What the sheets of a project are made of, read with the user's session. */
export type SheetFacts = {
  sheet: SheetRow;
  items: SheetItemRow[];
  // Newest first.
  versions: SheetVersion[];
  // Version numbers handed to Production, newest first.
  handoffs: Array<{ number: number; confirmedAt: string }>;
};

export async function loadFacts(
  projectId: string,
  sheetId?: string,
): Promise<SheetFacts[]> {
  const supabase = await createClient();
  const sheetsQuery = supabase
    .from("design_sheets")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at");
  const [sheetsRes, itemsRes, versionsRes, handoffsRes] = await Promise.all([
    sheetId ? sheetsQuery.eq("id", sheetId) : sheetsQuery,
    supabase
      .from("design_sheet_items")
      .select("*")
      .eq("project_id", projectId)
      .order("number"),
    supabase
      .from("design_submissions")
      .select(
        "id, sheet_id, number, status, mode, sections, snapshot, submitted_by, submitted_at, design_decisions(section, decision, comment, decided_by, decided_at)",
      )
      .eq("project_id", projectId)
      .eq("kind", "sheet")
      .order("number", { ascending: false }),
    supabase
      .from("design_handoffs")
      .select("sheet_id, submission_id, confirmed_at")
      .eq("project_id", projectId)
      .order("confirmed_at", { ascending: false }),
  ]);
  const versions = (versionsRes.data ?? []).map((v) => ({
    sheetId: v.sheet_id,
    version: {
      id: v.id,
      number: v.number,
      status: submissionStatusOf(v.status),
      mode:
        v.mode === "global" ? ("global" as const) : ("per_section" as const),
      sections: v.sections,
      snapshot: v.snapshot,
      submittedBy: v.submitted_by,
      submittedAt: v.submitted_at,
      decisions: v.design_decisions.map((d) => ({
        section: d.section,
        decision: submissionStatusOf(d.decision) as SheetDecision["decision"],
        comment: d.comment,
        decidedBy: d.decided_by,
        decidedAt: d.decided_at,
      })),
    },
  }));
  return (sheetsRes.data ?? []).map((sheet) => {
    const own = versions
      .filter((v) => v.sheetId === sheet.id)
      .map((v) => v.version);
    return {
      sheet,
      items: (itemsRes.data ?? []).filter((i) => i.sheet_id === sheet.id),
      versions: own,
      handoffs: (handoffsRes.data ?? [])
        .filter((h) => h.sheet_id === sheet.id)
        .flatMap((h) => {
          const v = own.find((x) => x.id === h.submission_id);
          return v ? [{ number: v.number, confirmedAt: h.confirmed_at }] : [];
        }),
    };
  });
}

/** The people and dates the checks read, beyond the sheet itself. */
export type CheckContext = {
  responsibleId: string | null;
  validatorIds: string[];
  strategyDue: string | null;
  milestoneDate: string | null;
};

export function checksOf(facts: SheetFacts, ctx: CheckContext): SheetChecks {
  const s = facts.sheet;
  return sheetChecks({
    hasResponsible: ctx.responsibleId !== null,
    responsibleId: ctx.responsibleId,
    validatorIds: ctx.validatorIds,
    ratios: s.ratios,
    durationMin: s.duration_min_seconds,
    durationMax: s.duration_max_seconds,
    subtitles: s.subtitles,
    subtitleRatios: s.subtitle_ratios,
    subtitleMode: s.subtitle_mode,
    shootDate: s.shoot_date,
    postStart: s.post_start,
    postDeadline: s.post_deadline,
    deliveryDate: s.delivery_date,
    budgetCents: s.budget_cents,
    strategyDue: ctx.strategyDue,
    milestoneDate: ctx.milestoneDate,
    items: facts.items.map((i) => ({
      number: i.number,
      deliveryDate: i.delivery_date,
    })),
  });
}

// Edits within this delay of the creation are part of it.
const TOUCH_MS = 5000;

/** The status of a sheet, computed by code (lib/design/states.ts). */
export function statusOf(facts: SheetFacts, blockers: number): SheetStatus {
  const latest = facts.versions[0] ?? null;
  const approved = facts.versions.find((v) => v.status === "approved");
  const lastEdit = [
    facts.sheet.updated_at,
    ...facts.items.map((i) => i.updated_at),
  ]
    .sort()
    .at(-1)!;
  return sheetStatus({
    // Written after its creation (the items of a series come with it).
    touched:
      Date.parse(lastEdit) - Date.parse(facts.sheet.created_at) > TOUCH_MS,
    blockers,
    latest: latest ? { number: latest.number, status: latest.status } : null,
    transferredVersion: facts.handoffs[0]?.number ?? null,
    editedSinceApproval: approved
      ? lastEdit > approved.submittedAt && latest?.status !== "pending"
      : false,
  });
}

export type SheetFull = SheetFacts & {
  provenance: SheetProvenance;
  checks: SheetChecks;
  status: SheetStatus;
};

/** Every sheet of the project with its checks and status. */
export async function loadSheets(
  projectId: string,
  context: (sheet: SheetRow) => CheckContext,
  sheetId?: string,
): Promise<SheetFull[]> {
  return (await loadFacts(projectId, sheetId)).map((facts) => {
    const checks = checksOf(facts, context(facts.sheet));
    return {
      ...facts,
      provenance: toProvenance(facts.sheet.provenance),
      checks,
      status: statusOf(facts, checks.blockers.length),
    };
  });
}
