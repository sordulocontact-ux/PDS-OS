import "server-only";

import { isDesignTopic, type DesignTopic } from "@/lib/design/intentions";
import { submissionStatusOf, type SubmissionStatus } from "@/lib/design/states";
import type { Member } from "@/lib/framing/related";
import { createClient } from "@/lib/supabase/server";

/** One section of a submitted version, as the database wrote it. */
export type SnapshotSection = {
  section: string;
  title: string | null;
  intentions: Array<{ topic: DesignTopic; value: string }>;
  references: Array<{
    id: string;
    kind: string;
    title: string | null;
    url: string | null;
    fileName: string | null;
    note: string | null;
  }>;
};

export type DirectionDecision = {
  id: string;
  // '' = the whole version (global mode).
  section: string;
  decision: Exclude<SubmissionStatus, "pending" | "withdrawn">;
  comment: string | null;
  decidedByName: string;
  decidedAt: string;
  // MKT-C2-11: an approval's reserves, and the role it was taken as.
  reserves?: string | null;
  decidedRole?: "validator" | "delegate" | null;
};

export type DirectionSubmission = {
  id: string;
  number: number;
  status: SubmissionStatus;
  mode: "global" | "per_section";
  sections: string[];
  snapshot: SnapshotSection[];
  submittedBy: string | null;
  submittedByName: string;
  submittedAt: string;
  closedAt: string | null;
  decisions: DirectionDecision[];
};

export type DirectionData = {
  mode: "global" | "per_section";
  // Newest first; a new version never overwrites an older one.
  submissions: DirectionSubmission[];
  // The latest consolidation confirmed per target ('direction' or a
  // deliverable id), for the intentions' state.
  confirmations: Record<string, Array<{ intention_id: string }>>;
};

const text = (v: unknown) => (typeof v === "string" ? v : null);

function toSnapshot(value: unknown): SnapshotSection[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((raw): SnapshotSection[] => {
    if (!raw || typeof raw !== "object") return [];
    const s = raw as Record<string, unknown>;
    const section = text(s.section);
    if (!section) return [];
    const list = (v: unknown) =>
      Array.isArray(v)
        ? v.filter((x): x is Record<string, unknown> =>
            Boolean(x && typeof x === "object"),
          )
        : [];
    return [
      {
        section,
        title: text(s.title),
        intentions: list(s.intentions).flatMap((i) =>
          isDesignTopic(i.topic) && typeof i.value === "string"
            ? [{ topic: i.topic, value: i.value }]
            : [],
        ),
        references: list(s.references).map((r) => ({
          id: text(r.id) ?? "",
          kind: text(r.kind) ?? "link",
          title: text(r.title),
          url: text(r.url),
          fileName: text(r.file_name),
          note: text(r.note),
        })),
      },
    ];
  });
}

function toDecision(value: string): DirectionDecision["decision"] {
  const status = submissionStatusOf(value);
  return status === "pending" || status === "withdrawn" ? "approved" : status;
}

/** The artistic direction's versions and decisions (RLS: who sees the project). */
export async function loadDirection(
  projectId: string,
  members: Member[],
): Promise<DirectionData> {
  const supabase = await createClient();
  const [workspaceRes, submissionsRes, confirmationsRes] = await Promise.all([
    supabase
      .from("design_workspaces")
      .select("validation_mode")
      .eq("project_id", projectId)
      .maybeSingle(),
    supabase
      .from("design_submissions")
      .select(
        "id, number, status, mode, sections, snapshot, submitted_by, submitted_at, closed_at, message, due_on, design_decisions(id, section, decision, comment, decided_by, decided_at, reserves, decided_role)",
      )
      .eq("project_id", projectId)
      .eq("kind", "direction")
      .order("number", { ascending: false }),
    supabase
      .from("design_intent_confirmations")
      .select("target, design_deliverable_id, snapshot, confirmed_at")
      .eq("project_id", projectId)
      .order("confirmed_at", { ascending: false }),
  ]);

  const nameOf = new Map(members.map((m) => [m.personId, m.name]));
  const name = (id: string | null) => (id ? (nameOf.get(id) ?? "") : "");
  const mode = (v: string | null | undefined) =>
    v === "global" ? "global" : "per_section";

  const confirmations: DirectionData["confirmations"] = {};
  for (const c of confirmationsRes.data ?? []) {
    const key = c.design_deliverable_id ?? "direction";
    if (key in confirmations) continue;
    confirmations[key] = Array.isArray(c.snapshot)
      ? c.snapshot.flatMap((s) =>
          s && typeof s === "object" && "intention_id" in s
            ? [{ intention_id: String(s.intention_id) }]
            : [],
        )
      : [];
  }

  return {
    mode: mode(workspaceRes.data?.validation_mode),
    confirmations,
    submissions: (submissionsRes.data ?? []).map((s) => ({
      id: s.id,
      number: s.number,
      status: submissionStatusOf(s.status),
      mode: mode(s.mode),
      sections: s.sections,
      snapshot: toSnapshot(s.snapshot),
      submittedBy: s.submitted_by,
      submittedByName: name(s.submitted_by),
      submittedAt: s.submitted_at,
      closedAt: s.closed_at,
      decisions: [...s.design_decisions]
        .sort((a, b) => a.decided_at.localeCompare(b.decided_at))
        .map((d) => ({
          id: d.id,
          section: d.section,
          decision: toDecision(d.decision),
          comment: d.comment,
          decidedByName: name(d.decided_by),
          decidedAt: d.decided_at,
          reserves: d.reserves,
          decidedRole:
            d.decided_role === "delegate" || d.decided_role === "validator"
              ? d.decided_role
              : null,
        })),
    })),
  };
}
