import "server-only";

import { listProjectCreatives } from "@/lib/projects/creatives";
import type { createClient } from "@/lib/supabase/server";
import type { Holder } from "@/lib/production/sheet";

import type {
  CorrectionRequest,
  CorrectionStatus,
  ProviderLinkState,
} from "./types";

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
    listProjectCreatives(projectId),
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
    ...creatives.map((c) => c.personId),
  ];
  const reviewers = [...new Set(reviewerIds)].flatMap((id) => {
    const name = people.nameOf(id);
    return name && name !== "—" ? [name] : [];
  });
  return { byVersion, reviewers };
}

/** The current link of each provider of the sheet (the newest not
 * replaced), by contact (PROD-026). */
export async function loadProviderLinks(
  supabase: Client,
  sheetId: string,
): Promise<Record<string, ProviderLinkState>> {
  const { data, error } = await supabase
    .from("production_provider_links")
    .select(
      "contact_id, created_at, expires_at, revoked_at, first_opened_at, last_opened_at, creator:people!production_provider_links_created_by_fkey(first_name, last_name)",
    )
    .eq("sheet_id", sheetId)
    .order("created_at", { ascending: false });
  if (error) console.error("loadProviderLinks:", error.message);
  const rows = data ?? [];
  const links: Record<string, ProviderLinkState> = {};
  for (const l of rows) {
    if (l.revoked_at || links[l.contact_id]) continue;
    const creator = l.creator as {
      first_name: string;
      last_name: string | null;
    } | null;
    links[l.contact_id] = {
      number: rows.filter((r) => r.contact_id === l.contact_id).length,
      createdAt: l.created_at,
      createdBy: creator
        ? [creator.first_name, creator.last_name].filter(Boolean).join(" ")
        : null,
      expiresAt: l.expires_at,
      firstOpenedAt: l.first_opened_at,
      lastOpenedAt: l.last_opened_at,
    };
  }
  return links;
}
