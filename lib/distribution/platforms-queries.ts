import "server-only";

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
import { cycleState, type CycleState } from "@/lib/distribution/tracking";
import { loadTrackingView } from "@/lib/distribution/tracking-queries";
import { loadMembers } from "@/lib/framing/related";
import type { ProjectDetail } from "@/lib/projects/types";
import { createClient } from "@/lib/supabase/server";

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
export async function loadPlatformsView(
  project: ProjectDetail,
  access: Access,
): Promise<PlatformsView> {
  const supabase = await createClient();
  const [rows, release, members, tracking, dossier] = await Promise.all([
    supabase
      .from("distribution_platforms")
      .select(
        "platform, label, url, available_declared_at, available_declared_by, verification, verification_note, verified_by, verified_at, compliance, compliance_note, compliance_by, compliance_at, created_at",
      )
      .eq("project_id", project.id)
      .order("created_at"),
    supabase
      .from("releases")
      .select("id, release_links(platform, url)")
      .eq("project_id", project.id)
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
    suggestion: null,
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
}
