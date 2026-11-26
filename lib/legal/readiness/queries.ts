import "server-only";

import type { Access } from "@/lib/auth/access";
import { routes } from "@/lib/auth/redirects";
import {
  distributionReadiness,
  type ReadinessItem,
} from "@/lib/distribution/readiness";
import { scopeDistribution } from "@/lib/distribution/release-scope";
import { loadDistributionSources } from "@/lib/distribution/sources";
import { fr } from "@/lib/i18n/fr";
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
  deliveredOn: string | null;
};

/**
 * A collective's Distribution is held release by release (lot 15): « Prêt
 * pour la sortie » reads each of its live releases (archived ones and
 * abandoned titles' left out), never « the » project's release, which a
 * collective only has in a mode with a compilation (docs/pds-mic-plan.md
 * § 3 bis point 6). Each element keeps its release in its key, and names it
 * when there are several. Without any release yet, the release is missing.
 */
async function collectiveDistribution(
  project: ProjectDetail,
  access: Access,
): Promise<ReadinessItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("releases")
    .select("id, project_titles(status, position)")
    .eq("project_id", project.id)
    .is("archived_at", null);
  if (error) throw new Error(error.message);
  const live = (data ?? [])
    .filter((r) => r.project_titles?.status !== "abandoned")
    // The compilation first, then the titles in the project's order.
    .sort(
      (a, b) =>
        (a.project_titles?.position ?? 0) - (b.project_titles?.position ?? 0),
    );
  if (live.length === 0) {
    const t = fr.distribution.readiness;
    return [
      {
        key: "release",
        module: "project",
        label: t.items.release,
        subject: null,
        state: "missing",
        blocking: true,
        detail: t.details.releaseMissing,
        source: null,
        href: routes.projectReleases(project.id),
      },
    ];
  }
  const many = live.length > 1;
  const lists = await Promise.all(
    live.map(async (row) => {
      const scoped = await scopeDistribution(project, row.id);
      const release = scoped?.distributionRelease;
      if (!scoped || !release) return [];
      const sources = await loadDistributionSources(scoped, access);
      return distributionReadiness(sources.input, formatDay).items.map(
        (item) => ({
          ...item,
          key: `${release.id}:${item.key}`,
          subject: !many
            ? item.subject
            : item.subject
              ? `${release.label} · ${item.subject}`
              : release.label,
        }),
      );
    }),
  );
  return lists.flat();
}

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
  const [waivers, policy, validation, distribution, release] =
    await Promise.all([
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
      (project.collective
        ? collectiveDistribution(project, access)
        : loadDistributionSources(project, access).then(
            (s) => distributionReadiness(s.input, formatDay).items,
          )
      ).catch((error: unknown) => {
        console.error("loadReadinessInputs distribution:", error);
        return null;
      }),
      // JUR-07: « Livrée au distributeur », as the Distribution recorded it.
      supabase
        .from("releases")
        .select("delivered_on")
        .eq("project_id", project.id)
        .is("archived_at", null)
        .not("delivered_on", "is", null)
        .order("delivered_on")
        .limit(1)
        .maybeSingle(),
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
    deliveredOn: release.data?.delivered_on ?? null,
    validated: validation.data
      ? {
          by: nameOf.get(validation.data.validated_by) ?? "—",
          at: formatShortInstant(validation.data.validated_at),
        }
      : null,
  };
}
