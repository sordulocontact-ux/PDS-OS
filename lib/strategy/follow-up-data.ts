import "server-only";

import { getArtist } from "@/lib/catalog/artist-queries";
import { getArtistProfile } from "@/lib/catalog/artist-profile";
import { todayInParis } from "@/lib/insights/dates";
import {
  followUpBefore,
  kpiViews,
  recommendationsOf,
} from "@/lib/strategy/follow-up";
import type { StrategyPageData } from "@/lib/strategy/page-data";
import { upstreamChains } from "@/lib/strategy/upstream";
import { createClient } from "@/lib/supabase/server";

/**
 * Everything the follow-up shows, read with the user's session: the
 * Conception's versions, the project's tasks, the validations waiting, the
 * KPIs (Deezer's fan count read live when a KPI follows it) and the
 * recommendations already applied or ignored.
 */
export async function loadFollowUp(page: StrategyPageData) {
  const { project, data, ctx } = page;
  const supabase = await createClient();
  const today = todayInParis();
  const [versions, tasks, validations, handled] = await Promise.all([
    supabase
      .from("design_versions")
      .select("deliverable_id, status, created_at")
      .eq("project_id", project.id),
    supabase
      .from("tasks")
      .select("status, due_date")
      .eq("project_id", project.id),
    supabase
      .from("validations")
      .select(
        "id, project_stages!inner(project_id, stage_definitions!inner(key))",
      )
      .eq("project_stages.project_id", project.id)
      .eq("state", "pending"),
    supabase
      .from("strategy_recommendations")
      .select("rule_key")
      .eq("project_id", project.id),
  ]);

  const pendingReviews =
    ctx.documents.flatMap((d) =>
      d.state === "sent" ? d.reviews.filter((r) => r.state === "pending") : [],
    ).length +
    // Validations of the other stages (the Strategy's are its reviews).
    (validations.data ?? []).filter(
      (v) => v.project_stages.stage_definitions.key !== "launch_strategy",
    ).length;

  const ready = new Set(
    (versions.data ?? [])
      .filter((v) => v.status === "approved" && v.deliverable_id)
      .map((v) => v.deliverable_id as string),
  );
  const groups = followUpBefore({
    deliverables: data.deliverables,
    levers: data.levers.filter(
      (l) => l.state === "selected" && l.review_status === "confirmed",
    ),
    versions: versions.data ?? [],
    chains: upstreamChains(data.deliverables, data.milestones, today, ready),
    tasks: tasks.data ?? [],
    pendingReviews,
    today,
  });

  let liveFans: number | null = null;
  if (
    data.kpis.some((k) => k.metric === "deezer_fans") &&
    project.mainArtistId
  ) {
    const artist = await getArtist(project.mainArtistId);
    if (artist?.deezerId)
      liveFans = (await getArtistProfile(artist.deezerId))?.fans ?? null;
  }
  const views = kpiViews(data.kpis, liveFans);
  const releaseDate = data.referenceDate;
  const released = releaseDate !== null && releaseDate <= today;
  const recommendations = recommendationsOf(
    views,
    releaseDate,
    today,
    new Set((handled.data ?? []).map((h) => h.rule_key)),
  );
  return { groups, views, recommendations, released, releaseDate, today };
}
