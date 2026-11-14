import "server-only";

import { trackedCache } from "@/lib/projects/live-deps";

import { can, type Access } from "@/lib/auth/access";
import {
  availabilityOf,
  COMPLIANCES,
  platformsOf,
  VERIFICATIONS,
  type Compliance,
  type PlatformView,
  type Verification,
} from "@/lib/distribution/platforms";
import { PROOF_BUCKET } from "@/lib/distribution/proof-rules";
import { cycleState, type CycleState } from "@/lib/distribution/tracking";
import { loadTrackingView } from "@/lib/distribution/tracking-queries";
import { loadMembers } from "@/lib/framing/related";
import type { ProjectDetail } from "@/lib/projects/types";
import { createClient } from "@/lib/supabase/server";

// A capture opens for an hour after the page is read.
const SIGNED_SECONDS = 3600;

const isVerification = (value: string): value is Verification =>
  (VERIFICATIONS as readonly string[]).includes(value);
const isCompliance = (value: string): value is Compliance =>
  (COMPLIANCES as readonly string[]).includes(value);

export type PlatformsView = {
  platforms: PlatformView[];
  availability: ReturnType<typeof availabilityOf>;
  // The current deposit cycle, when the dossier is validated.
  cycle: CycleState | null;
  organizationId: string | null;
  canEdit: boolean;
  canCheck: boolean;
};

/** The platforms of a release and its public availability, read with the
 * viewer's session; the detection's links come as suggestions only. */
export const loadPlatformsView = trackedCache(async function loadPlatformsView(
  project: ProjectDetail,
  access: Access,
): Promise<PlatformsView> {
  const supabase = await createClient();
  const [rows, release, members, tracking, dossier] = await Promise.all([
    supabase
      .from("distribution_platforms")
      .select(
        "platform, label, url, available_declared_at, available_declared_by, verification, verification_note, verified_by, verified_at, compliance, compliance_note, compliance_by, compliance_at, territory, observed_on, proof_path, proof_name, proof_url, created_at",
      )
      .eq("project_id", project.id)
      .order("created_at"),
    supabase
      .from("releases")
      .select("id, release_links(platform, url, first_seen_at)")
      .eq("project_id", project.id)
      // The project's release (lot 13): never a title's, never archived.
      .is("project_title_id", null)
      .is("archived_at", null)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
    loadMembers(access),
    loadTrackingView(project, access),
    supabase
      .from("distribution_dossiers")
      .select("validator_person_id")
      .eq("project_id", project.id)
      .maybeSingle(),
  ]);
  // The owner, or the designated validator (can_check_distribution).
  const canCheck =
    tracking.canEdit ||
    (dossier.data?.validator_person_id === access.personId &&
      can(access, "validate"));
  const nameOf = (personId: string | null) =>
    personId
      ? (members.find((m) => m.personId === personId)?.name ?? null)
      : null;
  const stamp = (at: string | null, by: string | null) =>
    at ? { at, by: nameOf(by) } : null;

  const paths = (rows.data ?? []).flatMap((row) =>
    row.proof_path ? [row.proof_path] : [],
  );
  const signed = paths.length
    ? await supabase.storage
        .from(PROOF_BUCKET)
        .createSignedUrls(paths, SIGNED_SECONDS)
    : null;
  const hrefOf = (path: string) =>
    signed?.data?.find((item) => item.path === path)?.signedUrl ?? null;

  const views: PlatformView[] = (rows.data ?? []).map((row) => ({
    platform: row.platform,
    label: row.label,
    reference: !row.platform.startsWith("other_"),
    url: row.url,
    declared: stamp(row.available_declared_at, row.available_declared_by),
    verification: isVerification(row.verification)
      ? row.verification
      : "unchecked",
    verificationNote: row.verification_note,
    verified: stamp(row.verified_at, row.verified_by),
    compliance: isCompliance(row.compliance) ? row.compliance : "unchecked",
    complianceNote: row.compliance_note,
    complianced: stamp(row.compliance_at, row.compliance_by),
    territory: row.territory,
    observedOn: row.observed_on,
    proof:
      row.proof_path && row.proof_name
        ? { name: row.proof_name, href: hrefOf(row.proof_path) }
        : null,
    proofUrl: row.proof_url,
    suggestion: null,
    suggestedAt: null,
    fromDetection: null,
  }));
  const platforms = platformsOf(views, release.data?.release_links ?? []);
  const cycle =
    tracking.current !== null
      ? cycleState(tracking.declarations, tracking.current)
      : null;
  return {
    platforms,
    availability: availabilityOf({
      declared: cycle?.available !== null && cycle?.available !== undefined,
      platforms,
    }),
    cycle,
    organizationId: access.organizationId,
    canEdit: tracking.canEdit,
    canCheck,
  };
});
