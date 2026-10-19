import "server-only";

import type { Access } from "@/lib/auth/access";
import {
  distributionReadiness,
  type ReadinessItem,
} from "@/lib/distribution/readiness";
import { loadDistributionSources } from "@/lib/distribution/sources";
import type { ReadinessWaiver } from "@/lib/legal/readiness/controls";
import type { ProjectDetail } from "@/lib/projects/types";
import { personName } from "@/lib/projects/types";
import { createClient } from "@/lib/supabase/server";
import { formatDay, formatShortInstant } from "@/lib/utils/day";

export type ReadinessInputs = {
  // Null when the sources could not be read (said, never shown as ready).
  distribution: ReadinessItem[] | null;
  waivers: ReadinessWaiver[];
  sacemBlocks: boolean;
  validated: { by: string; at: string } | null;
};

/**
 * What « Prêt pour la sortie » reads besides the démarches, with the
 * viewer's session: the Distribution's reading of its sources (Master,
 * Catalogue, Conception, release), the direction's waivers, the label's
 * policy and the final validation.
 */
export async function loadReadinessInputs(
  project: ProjectDetail,
  access: Access,
): Promise<ReadinessInputs> {
  const supabase = await createClient();
  const [waivers, policy, validation, distribution] = await Promise.all([
    supabase
      .from("release_readiness_waivers")
      .select("control_key, reason, granted_by, granted_at")
      .eq("project_id", project.id),
    access.organizationId
      ? supabase
          .from("release_readiness_policies")
          .select("sacem_blocks")
          .eq("organization_id", access.organizationId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    supabase
      .from("release_validations")
      .select("validated_by, validated_at")
      .eq("project_id", project.id)
      .maybeSingle(),
    loadDistributionSources(project, access)
      .then((s) => distributionReadiness(s.input, formatDay).items)
      .catch((error: unknown) => {
        console.error("loadReadinessInputs distribution:", error);
        return null;
      }),
  ]);
  if (waivers.error)
    console.error("loadReadinessInputs waivers:", waivers.error.message);
  const ids = [
    ...(waivers.data ?? []).map((w) => w.granted_by),
    ...(validation.data ? [validation.data.validated_by] : []),
  ];
  const { data: people } = ids.length
    ? await supabase
        .from("people")
        .select("id, first_name, last_name")
        .in("id", [...new Set(ids)])
    : { data: [] };
  const nameOf = new Map(
    (people ?? []).map((p) => [p.id, personName(p.first_name, p.last_name)]),
  );
  return {
    distribution,
    waivers: (waivers.data ?? []).map((w) => ({
      key: w.control_key,
      reason: w.reason,
      by: nameOf.get(w.granted_by) ?? "—",
      at: formatShortInstant(w.granted_at),
    })),
    sacemBlocks: policy.data?.sacem_blocks ?? false,
    validated: validation.data
      ? {
          by: nameOf.get(validation.data.validated_by) ?? "—",
          at: formatShortInstant(validation.data.validated_at),
        }
      : null,
  };
}
