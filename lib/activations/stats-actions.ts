"use server";

import { z } from "zod";

import {
  activationDone,
  activationFailure,
  invalid,
} from "@/lib/activations/result";
import {
  autoMethod,
  linkHost,
  STATS_PLATFORM_NAMES,
  statsLinkOf,
  type StatsLink,
} from "@/lib/activations/stats-links";
import { requireApproved } from "@/lib/auth/dal";
import { fr } from "@/lib/i18n/fr";
import { todayInParis } from "@/lib/insights/dates";
import { readPostStats } from "@/lib/integrations/post-stats";
import { createClient } from "@/lib/supabase/server";
import { joinList } from "@/lib/utils/sentences";
import type { WriteResult } from "@/lib/utils/write-result";

const t = fr.activations.metrics.auto;

// The page read again, then this read's own toast.
function refreshed(projectId: string): { ok: true } {
  activationDone(projectId);
  return { ok: true };
}

const names = (items: string[]) => joinList([...new Set(items)], "et");

// One click never fans out further (a big influence campaign).
const MAX_LINKS = 20;

const schema = z.object({
  projectId: z.uuid(),
  activationId: z.uuid(),
  // A collaboration or a media: only its own links.
  targetId: z.uuid().nullable(),
});

type Source = StatsLink & {
  targetId: string | null;
  agencyRowId: string | null;
  declaredOn: string | null;
};

/**
 * « Relever les statistiques » (Sacha 10/11/2026): the public figures of
 * every TikTok, YouTube and Deezer link declared as a proof of the
 * activation (or of one collaboration), each recorded as a dated snapshot
 * by the person who asked, with the session's rights (RLS): source
 * « Plateforme », method « Relevé automatique · <link> », period from the
 * publication to today; declared like any snapshot, verified apart. A link
 * already read today is not read again; a figure the platform does not give
 * is not recorded, never a zero. « Noter un relevé » stays for the rest.
 */
export async function readLinkStats(
  input: z.input<typeof schema>,
): Promise<WriteResult> {
  const access = await requireApproved();
  const parsed = schema.safeParse(input);
  if (!parsed.success) return invalid(t.nothing);
  const v = parsed.data;
  const supabase = await createClient();
  let query = supabase
    .from("activation_evidence")
    .select("url, target_id, agency_row_id, declared_on")
    .eq("activation_id", v.activationId)
    .is("withdrawn_at", null)
    .not("url", "is", null);
  if (v.targetId) query = query.eq("target_id", v.targetId);
  const { data: evidence, error } = await query;
  if (error) return activationFailure(error);

  const sources = new Map<string, Source>();
  const byHand = new Set<string>();
  for (const e of evidence ?? []) {
    const link = statsLinkOf(e.url);
    if (!link) {
      const host = e.url ? linkHost(e.url) : null;
      if (host) byHand.add(host);
      continue;
    }
    const key = [
      link.platform,
      link.id ?? link.url,
      e.target_id,
      e.agency_row_id,
    ].join("|");
    if (!sources.has(key))
      sources.set(key, {
        ...link,
        targetId: e.target_id,
        agencyRowId: e.agency_row_id,
        declaredOn: e.declared_on,
      });
  }
  const list = [...sources.values()].slice(0, MAX_LINKS);
  if (list.length === 0)
    // Nothing to read is not a failure: said in the toast, never in red.
    return {
      ok: true,
      notice: byHand.size ? t.byHand(names([...byHand])) : t.nothing,
    };

  const today = todayInParis();
  const [reads, done] = await Promise.all([
    Promise.all(list.map(readPostStats)),
    supabase
      .from("activation_metrics")
      .select("method, target_id, agency_row_id")
      .eq("activation_id", v.activationId)
      .eq("collected_on", today)
      .is("invalidated_at", null)
      .like("method", `${autoMethod("")}%`),
  ]);
  if (done.error) return activationFailure(done.error);
  const readToday = new Set(
    (done.data ?? []).map((m) =>
      [m.method, m.target_id, m.agency_row_id].join("|"),
    ),
  );

  const unreadable: string[] = [];
  const notFound: string[] = [];
  let noKey = false;
  let already = 0;
  let readLinks = 0;
  const rows = list.flatMap((source, i) => {
    const read = reads[i];
    const name = STATS_PLATFORM_NAMES[source.platform];
    if (!read.ok) {
      if (read.reason === "no_key") noKey = true;
      else (read.reason === "not_found" ? notFound : unreadable).push(name);
      return [];
    }
    const method = autoMethod(read.stats.canonical);
    if (
      readToday.has([method, source.targetId, source.agencyRowId].join("|"))
    ) {
      already += 1;
      return [];
    }
    readLinks += 1;
    return Object.entries(read.stats.figures).map(([metric, value]) => ({
      activation_id: v.activationId,
      target_id: source.targetId,
      agency_row_id: source.agencyRowId,
      metric: metric as keyof typeof read.stats.figures,
      label: null,
      value,
      unit: "count" as const,
      platform: name,
      period_start: read.stats.publishedOn ?? source.declaredOn,
      period_end: today,
      source: "platform" as const,
      method,
      collected_on: today,
      // Overwritten from the activation by the database.
      organization_id: access.organizationId ?? "",
      project_id: v.projectId,
    }));
  });

  const notes = [
    unreadable.length ? t.unreadable(names(unreadable)) : null,
    notFound.length ? t.notFound(names(notFound)) : null,
    noKey ? t.noKey : null,
    byHand.size ? t.byHand(names([...byHand])) : null,
  ].filter(Boolean) as string[];

  if (rows.length === 0) {
    if (already > 0)
      return {
        ...refreshed(v.projectId),
        notice: [t.already, ...notes].join(" "),
      };
    return { ok: true, notice: [t.nothing, ...notes].join(" ") };
  }
  const inserted = await supabase.from("activation_metrics").insert(rows);
  if (inserted.error) return activationFailure(inserted.error);
  const summary = t.done(rows.length, readLinks);
  return {
    ...refreshed(v.projectId),
    done: summary,
    ...(notes.length ? { notice: [summary, ...notes].join(" ") } : {}),
  };
}
