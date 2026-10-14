import "server-only";

import type { createClient } from "@/lib/supabase/server";
import type { Holder } from "@/lib/production/sheet";

import type { CorrectionRequest, CorrectionStatus } from "./types";

type Client = Awaited<ReturnType<typeof createClient>>;

const STATUSES: readonly CorrectionStatus[] = [
  "draft",
  "sent",
  "viewed",
  "treated",
];
const statusOf = (value: string): CorrectionStatus =>
  STATUSES.find((s) => s === value) ?? "draft";

/**
 * The correction requests of a sheet, by the version they are about, and
 * who decides on a version (the owner and the creative directors). Read
 * with the user's session.
 */
export async function loadCorrectionRequests(
  supabase: Client,
  projectId: string,
  sheetId: string,
  people: {
    holderOf: (
      personId: string | null,
      contactId: string | null,
    ) => Holder | null;
    nameOf: (personId: string | null) => string | null;
    numberOf: (versionId: string | null) => number | null;
  },
): Promise<{ byVersion: Map<string, CorrectionRequest>; reviewers: string[] }> {
  const [requests, project, creatives] = await Promise.all([
    supabase
      .from("production_correction_requests")
      .select("*")
      .eq("sheet_id", sheetId),
    supabase
      .from("projects")
      .select("owner_person_id")
      .eq("id", projectId)
      .maybeSingle(),
    supabase
      .from("project_creatives")
      .select("person_id")
      .eq("project_id", projectId),
  ]);
  if (requests.error)
    console.error("loadCorrectionRequests:", requests.error.message);

  const byVersion = new Map<string, CorrectionRequest>();
  for (const r of requests.data ?? []) {
    const recipient = people.holderOf(r.person_id, r.contact_id);
    if (!recipient) continue;
    byVersion.set(r.version_id, {
      id: r.id,
      recipient,
      dueOn: r.due_on,
      message: r.message,
      status: statusOf(r.status),
      sentBy: people.nameOf(r.sent_by),
      sentAt: r.sent_at,
      reminders: r.reminders,
      viewedAt: r.viewed_at,
      treatedAt: r.treated_at,
      treatedVersionNumber: people.numberOf(r.treated_version_id),
    });
  }
  const reviewerIds = [
    project.data?.owner_person_id ?? null,
    ...(creatives.data ?? []).map((c) => c.person_id),
  ];
  const reviewers = [...new Set(reviewerIds)].flatMap((id) => {
    const name = people.nameOf(id);
    return name && name !== "—" ? [name] : [];
  });
  return { byVersion, reviewers };
}
